import { ApiProperty } from '@nestjs/swagger';

export class UserIdResponseDto {
  @ApiProperty({ example: '4f0465fd-a4e8-40b6-bbf3-47f04f081659' })
  id: string;
}
