import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifySignatureDto {
  @IsString()
  @Length(6, 6)
  otpCode: string;

  @IsString()
  @IsNotEmpty()
  signerName: string;
}
