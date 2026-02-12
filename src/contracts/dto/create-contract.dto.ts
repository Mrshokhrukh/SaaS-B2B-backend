import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ example: '3fbdba3a-f0eb-47d9-a45f-a96875d3e4ee' })
  @IsString()
  templateId: string;

  @ApiProperty({ example: 'Q1 Service Contract' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Alice Buyer' })
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @ApiProperty({ example: 'alice@buyer.com' })
  @IsEmail()
  clientEmail: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  clientPhone?: string;

  @ApiProperty({ example: 150000 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountCents: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @Length(3, 3)
  currency: string;
}
