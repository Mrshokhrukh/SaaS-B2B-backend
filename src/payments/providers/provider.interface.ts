import { WebhookDto } from '../dto/webhook.dto';

export interface ProviderIntentResult {
  providerPaymentId: string;
  checkoutUrl: string;
  payload: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  createIntent(input: {
    paymentId: string;
    amountCents: number;
    currency: string;
    invoiceNumber: string;
  }): Promise<ProviderIntentResult>;

  verifySignature(payload: WebhookDto, signature: string): boolean;
}
