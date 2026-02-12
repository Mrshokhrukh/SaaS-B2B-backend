import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Jane Sales' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'staff@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword!123' })
  @IsString()
  @MinLength(10)
  password: string;
}
