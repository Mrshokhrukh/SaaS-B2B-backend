import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Master Service Agreement' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example:
      'This agreement is between {{client_name}} and {{business_name}} for {{amount}} {{currency}}.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;
}
