import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ContractStatus } from '../common/enums/contract-status.enum';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { PaymentProvider } from '../common/enums/payment-provider.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { RequestUser } from '../common/types/request-user.type';
import { Contract } from '../entities/contract.entity';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { ContractsService } from '../contracts/contracts.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { MockWebhookDto } from './dto/mock-webhook.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Contract)
    private readonly contractsRepository: Repository<Contract>,
    private readonly configService: ConfigService,
    private readonly invoicesService: InvoicesService,
    private readonly contractsService: ContractsService,
    private readonly auditService: AuditService,
  ) {}

  async createCheckout(
    user: RequestUser,
    invoiceId: string,
    dto: CreateCheckoutDto,
    ipAddress?: string,
  ): Promise<{ checkoutUrl: string; providerPaymentId: string; paymentId: string }> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id: invoiceId },
      relations: { contract: true },
    });

    if (!invoice || invoice.contract.businessId !== user.businessId) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice already paid');
    }

    const provider = dto.provider ?? PaymentProvider.MOCK;
    const providerPaymentId = `mock_${randomUUID()}`;

    const payment = this.paymentsRepository.create({
      invoiceId: invoice.id,
      provider,
      providerPaymentId,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      status: PaymentStatus.INITIATED,
      providerResponse: {
        checkoutUrl: `https://mock-payments.local/checkout/${providerPaymentId}`,
      },
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    await this.auditService.create({
      action: 'PAYMENT_CHECKOUT_CREATED',
      resource: `payment:${savedPayment.id}`,
      userId: user.sub,
      businessId: user.businessId,
      ipAddress: ipAddress ?? null,
      metadata: {
        invoiceId,
        providerPaymentId,
        amountCents: savedPayment.amountCents,
      },
    });

    return {
      paymentId: savedPayment.id,
      providerPaymentId,
      checkoutUrl: `https://mock-payments.local/checkout/${providerPaymentId}`,
    };
  }

  async handleMockWebhook(
    dto: MockWebhookDto,
    webhookSecret: string | undefined,
    ipAddress?: string,
  ): Promise<{ ok: true }> {
    this.verifyWebhookSecret(webhookSecret);

    const payment = await this.paymentsRepository.findOne({
      where: { providerPaymentId: dto.providerPaymentId },
      relations: { invoice: { contract: true } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = dto.status;
    payment.providerResponse = {
      ...(payment.providerResponse ?? {}),
      webhookStatus: dto.status,
      receivedAt: new Date().toISOString(),
    };

    if (dto.status === PaymentStatus.SUCCEEDED) {
      payment.paidAt = new Date();
      await this.invoicesService.markPaid(payment.invoiceId);
      await this.contractsService.markContractPaid(payment.invoice.contractId);
    }

    await this.paymentsRepository.save(payment);

    await this.auditService.create({
      action: 'PAYMENT_WEBHOOK_PROCESSED',
      resource: `payment:${payment.id}`,
      businessId: payment.invoice.contract.businessId,
      ipAddress: ipAddress ?? null,
      metadata: {
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
      },
    });

    return { ok: true };
  }

  async getPaymentById(user: RequestUser, paymentId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: { invoice: { contract: true } },
    });

    if (!payment || payment.invoice.contract.businessId !== user.businessId) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  private verifyWebhookSecret(incomingSecret?: string): void {
    const configuredSecret = this.configService.get<string>('webhook.mockProviderSecret', {
      infer: true,
    });

    if (!incomingSecret || !configuredSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const incomingBuffer = Buffer.from(incomingSecret);
    const configuredBuffer = Buffer.from(configuredSecret);

    if (
      incomingBuffer.length !== configuredBuffer.length ||
      !timingSafeEqual(incomingBuffer, configuredBuffer)
    ) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }
}
