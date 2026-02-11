import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestSignOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone: string;
}
