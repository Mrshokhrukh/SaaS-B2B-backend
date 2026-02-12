import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    await this.dataSource.query('SELECT 1');
    await this.redisService.ping();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
