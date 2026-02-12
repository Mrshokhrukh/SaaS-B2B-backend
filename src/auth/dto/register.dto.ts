import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Acme LLC' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'John Founder' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'owner@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword!123' })
  @IsString()
  @MinLength(10)
  password: string;
}
