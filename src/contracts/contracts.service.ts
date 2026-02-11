import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ContractStatus } from '../common/enums/contract-status.enum';
import { RequestUser } from '../common/types/request-user.type';
import { ClientsService } from '../clients/clients.service';
import { Contract } from '../entities/contract.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../redis/redis.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RequestSignOtpDto } from './dto/request-sign-otp.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';

interface OtpRecord {
  phone: string;
  otpHash: string;
  expiresAt: string;
}

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractsRepository: Repository<Contract>,
    private readonly clientsService: ClientsService,
    private readonly invoicesService: InvoicesService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {}

  async createContract(user: RequestUser, dto: CreateContractDto, ipAddress?: string): Promise<Contract> {
    const existingClient = await this.clientsService.findByBusinessAndEmail(
      user.businessId,
      dto.clientEmail,
    );

    const client =
      existingClient ??
      (await this.clientsService.create({
        businessId: user.businessId,
        fullName: dto.clientName,
        email: dto.clientEmail,
        phone: dto.clientPhone,
      }));

    const contract = this.contractsRepository.create({
      businessId: user.businessId,
      clientId: client.id,
      title: dto.title,
      templateName: dto.templateName,
      content: dto.content,
      linkToken: randomUUID(),
      status: ContractStatus.DRAFT,
    });

    const savedContract = await this.contractsRepository.save(contract);

    await this.auditService.create({
      action: 'CONTRACT_CREATED',
      resource: `contract:${savedContract.id}`,
      userId: user.sub,
      businessId: user.businessId,
      ipAddress: ipAddress ?? null,
      metadata: {
        templateName: savedContract.templateName,
        clientId: client.id,
      },
    });

    return savedContract;
  }

  async sendContractLink(user: RequestUser, contractId: string, ipAddress?: string): Promise<{ link: string }> {
    const contract = await this.findBusinessContract(user.businessId, contractId);

    if (contract.status === ContractStatus.SIGNED || contract.status === ContractStatus.PAID) {
      throw new BadRequestException('Signed or paid contracts cannot be resent');
    }

    contract.status = ContractStatus.SENT;
    contract.sentAt = new Date();

    await this.contractsRepository.save(contract);

    const link = `${process.env.PUBLIC_CONTRACT_BASE_URL ?? 'https://app.local/contracts'}/${contract.linkToken}`;

    await this.auditService.create({
      action: 'CONTRACT_LINK_SENT',
      resource: `contract:${contract.id}`,
      userId: user.sub,
      businessId: user.businessId,
      ipAddress: ipAddress ?? null,
      metadata: { link },
    });

    return { link };
  }

  async viewPublicContract(token: string, ipAddress?: string): Promise<Contract> {
    const contract = await this.contractsRepository.findOne({
      where: { linkToken: token },
      relations: { client: true, invoice: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status === ContractStatus.SENT) {
      contract.status = ContractStatus.VIEWED;
      contract.viewedAt = new Date();
      await this.contractsRepository.save(contract);

      await this.auditService.create({
        action: 'CONTRACT_VIEWED',
        resource: `contract:${contract.id}`,
        businessId: contract.businessId,
        ipAddress: ipAddress ?? null,
      });
    }

    return contract;
  }

  async requestOtp(token: string, dto: RequestSignOtpDto, ipAddress?: string): Promise<{ expiresInSeconds: number }> {
    const contract = await this.contractsRepository.findOne({ where: { linkToken: token } });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (![ContractStatus.SENT, ContractStatus.VIEWED].includes(contract.status)) {
      throw new BadRequestException('Contract is not available for signature');
    }

    const otpCode = `${randomInt(100000, 999999)}`;
    const otpHash = this.hashOtp(otpCode);
    const expiresInSeconds = 300;

    const payload: OtpRecord = {
      phone: dto.phone,
      otpHash,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };

    await this.redisService.set(this.otpKey(contract.id), JSON.stringify(payload), expiresInSeconds);

    await this.auditService.create({
      action: 'CONTRACT_OTP_REQUESTED',
      resource: `contract:${contract.id}`,
      businessId: contract.businessId,
      ipAddress: ipAddress ?? null,
      metadata: { phone: dto.phone },
    });

    return { expiresInSeconds };
  }

  async signContract(token: string, dto: VerifySignatureDto, ipAddress?: string): Promise<Contract> {
    const contract = await this.contractsRepository.findOne({ where: { linkToken: token } });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const otpRecordRaw = await this.redisService.get(this.otpKey(contract.id));
    if (!otpRecordRaw) {
      throw new UnauthorizedException('OTP expired or missing');
    }

    const otpRecord = JSON.parse(otpRecordRaw) as OtpRecord;
    const incomingHash = this.hashOtp(dto.otpCode);

    const isValid = timingSafeEqual(Buffer.from(otpRecord.otpHash), Buffer.from(incomingHash));
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    contract.status = ContractStatus.SIGNED;
    contract.signedAt = new Date();
    contract.signedIp = ipAddress ?? null;
    contract.signerPhone = otpRecord.phone;

    const signedContract = await this.contractsRepository.save(contract);
    await this.redisService.del(this.otpKey(contract.id));

    await this.auditService.create({
      action: 'CONTRACT_SIGNED',
      resource: `contract:${contract.id}`,
      businessId: contract.businessId,
      ipAddress: ipAddress ?? null,
      metadata: {
        signerName: dto.signerName,
        phone: otpRecord.phone,
      },
    });

    return signedContract;
  }

  async createInvoice(user: RequestUser, contractId: string, dto: CreateInvoiceDto, ipAddress?: string) {
    const invoice = await this.invoicesService.createForContract({
      businessId: user.businessId,
      contractId,
      amountCents: dto.amountCents,
      currency: dto.currency,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    await this.auditService.create({
      action: 'INVOICE_CREATED',
      resource: `invoice:${invoice.id}`,
      userId: user.sub,
      businessId: user.businessId,
      ipAddress: ipAddress ?? null,
      metadata: { contractId, amountCents: invoice.amountCents },
    });

    return invoice;
  }

  async getContractStatus(user: RequestUser, contractId: string): Promise<Contract> {
    return this.findBusinessContract(user.businessId, contractId);
  }

  async markContractPaid(contractId: string): Promise<void> {
    await this.contractsRepository.update(contractId, {
      status: ContractStatus.PAID,
    });
  }

  private async findBusinessContract(businessId: string, contractId: string): Promise<Contract> {
    const contract = await this.contractsRepository.findOne({
      where: { id: contractId, businessId },
      relations: { client: true, invoice: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  private otpKey(contractId: string): string {
    return `contract:otp:${contractId}`;
  }

  private hashOtp(code: string): string {
    return createHash('sha256')
      .update(`${code}:${process.env.JWT_SECRET ?? 'otp-pepper'}`)
      .digest('hex');
  }
}
