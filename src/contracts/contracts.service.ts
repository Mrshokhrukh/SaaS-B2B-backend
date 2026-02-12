import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ContractStatus } from '../common/enums/contract-status.enum';
import { RequestUser } from '../common/types/request-user.type';
import { createBasicPdf } from '../common/utils/pdf.util';
import { generateOtpCode } from '../common/utils/otp.util';
import { ClientsService } from '../clients/clients.service';
import { Contract } from '../entities/contract.entity';
import { ContractTemplate } from '../entities/contract-template.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../redis/redis.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

interface OtpPayload {
  phone: string;
  codeHash: string;
}

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(ContractTemplate)
    private readonly templateRepository: Repository<ContractTemplate>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly clientsService: ClientsService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
    private readonly invoicesService: InvoicesService,
    private readonly configService: ConfigService,
  ) {}

  async createTemplate(
    user: RequestUser,
    dto: CreateTemplateDto,
    ip: string,
  ): Promise<ContractTemplate> {
    const template = this.templateRepository.create({
      businessId: user.businessId,
      name: dto.name,
      body: dto.body,
      version: 1,
      isActive: true,
    });

    const saved = await this.templateRepository.save(template);
    await this.auditService.log({
      userId: user.userId,
      businessId: user.businessId,
      action: 'TEMPLATE_CREATE',
      entityType: 'contract_template',
      entityId: saved.id,
      ipAddress: ip,
    });

    return saved;
  }

  async listTemplates(user: RequestUser): Promise<ContractTemplate[]> {
    return this.templateRepository.find({
      where: { businessId: user.businessId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async listContracts(user: RequestUser): Promise<Contract[]> {
    return this.contractRepository.find({
      where: { businessId: user.businessId },
      relations: { client: true, invoice: true, template: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createContract(
    user: RequestUser,
    dto: CreateContractDto,
    ip: string,
  ): Promise<Contract> {
    const template = await this.templateRepository.findOne({
      where: {
        id: dto.templateId,
        businessId: user.businessId,
        isActive: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const client = await this.clientsService.findOrCreate({
      businessId: user.businessId,
      fullName: dto.clientName,
      email: dto.clientEmail,
      phone: dto.clientPhone,
    });

    const renderedBody = template.body
      .replace(/{{client_name}}/g, client.fullName)
      .replace(/{{business_name}}/g, user.businessId)
      .replace(/{{amount}}/g, String(dto.amountCents / 100))
      .replace(/{{currency}}/g, dto.currency.toUpperCase());

    const contract = this.contractRepository.create({
      businessId: user.businessId,
      clientId: client.id,
      templateId: template.id,
      createdByUserId: user.userId,
      title: dto.title,
      renderedBody,
      publicToken:
        randomUUID().replace(/-/g, '') +
        randomUUID().replace(/-/g, '').slice(0, 16),
      status: ContractStatus.CREATED,
      contractNumber: `CTR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amountCents: dto.amountCents,
      currency: dto.currency.toUpperCase(),
    });

    const saved = await this.contractRepository.save(contract);

    await this.auditService.log({
      userId: user.userId,
      businessId: user.businessId,
      action: 'CONTRACT_CREATE',
      entityType: 'contract',
      entityId: saved.id,
      ipAddress: ip,
    });

    return saved;
  }

  async sendLink(
    user: RequestUser,
    contractId: string,
    ip: string,
  ): Promise<{ publicLink: string }> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, businessId: user.businessId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    contract.status = ContractStatus.SENT;
    contract.sentAt = new Date();
    await this.contractRepository.save(contract);

    const baseUrl = this.configService.get<string>('publicLinks.baseUrl') ?? '';
    const publicLinkTtl =
      this.configService.get<number>('publicLinks.ttlSeconds') ?? 86400;
    const link = `${baseUrl}/${contract.publicToken}`;

    await this.redisService.set(
      `public:contract:${contract.publicToken}`,
      JSON.stringify({ id: contract.id }),
      publicLinkTtl,
    );

    await this.auditService.log({
      userId: user.userId,
      businessId: user.businessId,
      action: 'CONTRACT_SEND_LINK',
      entityType: 'contract',
      entityId: contract.id,
      ipAddress: ip,
      metadata: { link },
    });

    return { publicLink: link };
  }

  async publicView(publicToken: string, ip: string): Promise<Contract> {
    let contract = await this.findByPublicToken(publicToken);

    if (
      contract.status === ContractStatus.SENT ||
      contract.status === ContractStatus.CREATED
    ) {
      contract.status = ContractStatus.VIEWED;
      contract.viewedAt = new Date();
      contract.viewerIp = ip;
      contract = await this.contractRepository.save(contract);
    }

    await this.auditService.log({
      businessId: contract.businessId,
      action: 'CONTRACT_VIEW',
      entityType: 'contract',
      entityId: contract.id,
      ipAddress: ip,
    });

    return contract;
  }

  async requestOtp(
    publicToken: string,
    dto: RequestOtpDto,
    ip: string,
  ): Promise<{ expiresIn: number }> {
    const contract = await this.findByPublicToken(publicToken);

    if (
      ![ContractStatus.SENT, ContractStatus.VIEWED].includes(contract.status)
    ) {
      throw new BadRequestException(
        'Contract cannot be signed in current state',
      );
    }

    const code = generateOtpCode();
    const ttl = this.configService.get<number>('otp.ttlSeconds') ?? 300;

    const payload: OtpPayload = {
      phone: dto.phone,
      codeHash: this.hashOtp(code),
    };

    await this.redisService.set(
      this.otpKey(contract.id),
      JSON.stringify(payload),
      ttl,
    );

    await this.auditService.log({
      businessId: contract.businessId,
      action: 'CONTRACT_OTP_REQUEST',
      entityType: 'contract',
      entityId: contract.id,
      ipAddress: ip,
      metadata: {
        phone: dto.phone,
        mockOtpCode: code,
      },
    });

    return { expiresIn: ttl };
  }

  async verifyOtpAndSign(
    publicToken: string,
    dto: VerifyOtpDto,
    ip: string,
  ): Promise<Contract> {
    const contract = await this.findByPublicToken(publicToken);

    const rawOtp = await this.redisService.get(this.otpKey(contract.id));
    if (!rawOtp) {
      throw new UnauthorizedException('OTP expired or missing');
    }

    const otp = JSON.parse(rawOtp) as OtpPayload;
    const codeHash = this.hashOtp(dto.code);

    const valid = timingSafeEqual(
      Buffer.from(otp.codeHash),
      Buffer.from(codeHash),
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    contract.status = ContractStatus.SIGNED;
    contract.signedAt = new Date();
    contract.signedIp = ip;

    const path = await this.persistSignedPdf(contract);
    contract.signedPdfPath = path;

    const signed = await this.contractRepository.save(contract);
    await this.redisService.del(this.otpKey(contract.id));

    await this.invoicesService.createForSignedContract(signed.id);

    await this.auditService.log({
      businessId: signed.businessId,
      action: 'CONTRACT_SIGN',
      entityType: 'contract',
      entityId: signed.id,
      ipAddress: ip,
      metadata: {
        signerName: dto.signerName,
      },
    });

    return signed;
  }

  async getBusinessContract(
    user: RequestUser,
    contractId: string,
  ): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, businessId: user.businessId },
      relations: { client: true, invoice: true, template: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  private async findByPublicToken(publicToken: string): Promise<Contract> {
    const cached = await this.redisService.get(
      `public:contract:${publicToken}`,
    );
    if (cached) {
      const parsed = JSON.parse(cached) as { id: string };
      const contract = await this.contractRepository.findOne({
        where: { id: parsed.id },
      });
      if (contract) {
        return contract;
      }
    }

    const contract = await this.contractRepository.findOne({
      where: { publicToken },
      relations: { client: true, template: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    await this.redisService.set(
      `public:contract:${publicToken}`,
      JSON.stringify({ id: contract.id }),
      this.configService.get<number>('publicLinks.ttlSeconds') ?? 86400,
    );

    return contract;
  }

  private otpKey(contractId: string): string {
    return `otp:contract:${contractId}`;
  }

  private hashOtp(code: string): string {
    const secret = this.configService.get<string>('auth.accessSecret') ?? 'otp';
    return createHash('sha256').update(`${code}:${secret}`).digest('hex');
  }

  private async persistSignedPdf(contract: Contract): Promise<string> {
    const directory =
      this.configService.get<string>('storage.signedContractsPath') ??
      'storage/signed-contracts';
    await mkdir(directory, { recursive: true });

    const fileName = `${contract.id}.pdf`;
    const fullPath = join(directory, fileName);

    const pdf = createBasicPdf(
      `Contract ${contract.contractNumber} signed at ${new Date().toISOString()}`,
    );
    await writeFile(fullPath, pdf);

    return fullPath;
  }
}
