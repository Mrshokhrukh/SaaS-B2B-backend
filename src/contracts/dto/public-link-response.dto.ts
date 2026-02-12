import { ApiProperty } from '@nestjs/swagger';

export class PublicLinkResponseDto {
  @ApiProperty({
    example:
      'http://localhost:3000/public/contracts/09f97ea8a2f141e9b128ff0f79ec2b76e393f93fca0b42f5',
  })
  publicLink: string;
}
