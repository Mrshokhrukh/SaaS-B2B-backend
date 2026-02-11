import { IsEnum, IsOptional } from 'class-validator';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';

export class CreateCheckoutDto {
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}
