import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { WebhookDto } from './dto/webhook.dto';
import { MockClickProvider } from './providers/mock-click.provider';
import { MockPaymeProvider } from './providers/mock-payme.provider';
import { PaymentProviderAdapter } from './providers/provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly clickProvider: MockClickProvider,
    private readonly paymeProvider: MockPaymeProvider,
    private readonly auditService: AuditService,
  ) {}

  async createIntent(
    user: RequestUser,
    invoiceId: string,
    dto: CreatePaymentIntentDto,
    ipAddress: string,
  ): Promise<Payment> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, businessId: user.businessId },
      relations: { contract: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice already paid');
    }

    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        businessId: invoice.businessId,
        invoiceId: invoice.id,
        provider: dto.provider,
        providerPaymentId: '',
        amountCents: invoice.amountCents,
        currency: invoice.currency,
        status: PaymentStatus.INITIATED,
      }),
    );

    const provider = this.resolveProvider(dto.provider);
    const intent = await provider.createIntent({
      paymentId: payment.id,
      amountCents: payment.amountCents,
      currency: payment.currency,
      invoiceNumber: invoice.invoiceNumber,
    });

    payment.providerPaymentId = intent.providerPaymentId;
    payment.checkoutUrl = intent.checkoutUrl;
    payment.providerPayload = intent.payload;

    const saved = await this.paymentRepository.save(payment);

    await this.auditService.log({
      userId: user.userId,
      businessId: user.businessId,
      action: 'PAYMENT_INTENT_CREATE',
      entityType: 'payment',
      entityId: saved.id,
      ipAddress,
    });

    return saved;
  }

  async handleWebhook(
    provider: PaymentProvider,
    dto: WebhookDto,
    signature: string | undefined,
    ipAddress: string,
  ): Promise<{ success: true }> {
    const adapter = this.resolveProvider(provider);

    if (!signature || !adapter.verifySignature(dto, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payment = await this.paymentRepository.findOne({
      where: { provider, providerPaymentId: dto.providerPaymentId },
      relations: { invoice: { contract: true } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = dto.status;
    payment.webhookVerifiedAt = new Date();
    payment.providerPayload = {
      ...(payment.providerPayload ?? {}),
      webhook: dto,
    };

    if (dto.status === PaymentStatus.SUCCEEDED) {
      payment.paidAt = new Date();

      await this.invoiceRepository.update(payment.invoiceId, {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      });

      await this.contractRepository.update(payment.invoice.contractId, {
        status: ContractStatus.PAID,
      });
    }

    await this.paymentRepository.save(payment);

    await this.auditService.log({
      businessId: payment.businessId,
      action: 'PAYMENT_WEBHOOK',
      entityType: 'payment',
      entityId: payment.id,
      ipAddress,
      metadata: { provider, status: dto.status },
    });

    return { success: true };
  }

  async getPayment(user: RequestUser, paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, businessId: user.businessId },
      relations: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  private resolveProvider(provider: PaymentProvider): PaymentProviderAdapter {
    if (provider === PaymentProvider.MOCK_CLICK) {
      return this.clickProvider;
    }

    if (provider === PaymentProvider.MOCK_PAYME) {
      return this.paymeProvider;
    }

    throw new BadRequestException('Unsupported provider');
  }
}
