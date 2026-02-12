import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('redis.host') ?? '127.0.0.1',
          port: config.get<number>('redis.port') ?? 6379,
          password: config.get<string>('redis.password'),
          tls: (config.get<boolean>('redis.tls') ?? false) ? {} : undefined,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        }),
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
