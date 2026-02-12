import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class WebhookDto {
  @ApiProperty({ example: 'click_0c4742c5-72c0-4286-89a7-c5f8f95f5f13' })
  @IsString()
  providerPaymentId: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.SUCCEEDED })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({ example: 150000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents: number;

  @ApiPropertyOptional({ example: 'gateway-ref-001' })
  @IsOptional()
  @IsString()
  reference?: string;
}
