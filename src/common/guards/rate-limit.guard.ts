import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { getRequestIp } from '../utils/ip.util';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { userId?: string } }>();

    const windowSeconds =
      this.configService.get<number>('rateLimit.windowSeconds') ?? 60;
    const maxRequests =
      this.configService.get<number>('rateLimit.maxRequests') ?? 120;
    const route = Reflect.get(request, 'route') as
      | { path?: string }
      | undefined;
    const routePath = route?.path ?? request.path;

    const identity = request.user?.userId ?? getRequestIp(request);
    const key = `ratelimit:${identity}:${request.method}:${routePath}`;

    const current = await this.redisService.incrWithExpiry(key, windowSeconds);
    if (current > maxRequests) {
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
