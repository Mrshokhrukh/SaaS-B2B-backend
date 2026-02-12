import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import { Request } from 'express';
import { getRequestIp } from '../utils/ip.util';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { userId?: string; businessId?: string } }
      >();

    return next.handle().pipe(
      tap(() => {
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
          return;
        }
        const route = Reflect.get(request, 'route') as
          | { path?: string }
          | undefined;
        const routePath = route?.path ?? request.path;

        void this.auditService.log({
          userId: request.user?.userId ?? null,
          businessId: request.user?.businessId ?? null,
          action: `${request.method}_${routePath}`,
          entityType: 'http',
          ipAddress: getRequestIp(request),
          userAgent: request.headers['user-agent'] ?? null,
          metadata: {
            method: request.method,
            path: request.originalUrl,
          },
        });
      }),
    );
  }
}
