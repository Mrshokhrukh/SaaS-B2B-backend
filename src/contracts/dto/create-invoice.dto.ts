import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsPositive, IsString, Length } from 'class-validator';

export class CreateInvoiceDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}
