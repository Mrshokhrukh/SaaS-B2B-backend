import { Type } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class MockWebhookDto {
  @IsString()
  providerPaymentId: string;

  @Type(() => String)
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
