import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';

export class CreatePaymentIntentDto {
  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.MOCK_CLICK })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
