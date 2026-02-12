import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { WebhookDto } from '../dto/webhook.dto';
import {
  PaymentProviderAdapter,
  ProviderIntentResult,
} from './provider.interface';

@Injectable()
export class MockPaymeProvider implements PaymentProviderAdapter {
  constructor(private readonly configService: ConfigService) {}

  createIntent(input: {
    paymentId: string;
    amountCents: number;
    currency: string;
    invoiceNumber: string;
  }): Promise<ProviderIntentResult> {
    const providerPaymentId = `payme_${randomUUID()}`;

    return Promise.resolve({
      providerPaymentId,
      checkoutUrl: `https://checkout.mock-payme.local/pay/${providerPaymentId}`,
      payload: {
        invoice: input.invoiceNumber,
      },
    });
  }

  verifySignature(payload: WebhookDto, signature: string): boolean {
    const secret = this.configService.get<string>('payments.paymeSecret') ?? '';
    const body = `${payload.providerPaymentId}|${payload.status}|${payload.amountCents}`;
    const expected = createHmac('sha256', secret).update(body).digest('hex');

    return this.safeEqual(expected, signature);
  }

  private safeEqual(left: string, right: string): boolean {
    const l = Buffer.from(left);
    const r = Buffer.from(right);
    return l.length === r.length && timingSafeEqual(l, r);
  }
}
