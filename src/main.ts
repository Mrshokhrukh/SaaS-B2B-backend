import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AuditService } from './audit/audit.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const auditService = app.get(AuditService);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin', { infer: true }),
    credentials: true,
  });

  app.use((req: Request, res: Response, next) => {
    res.on('finish', () => {
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return;
      }

      const user = (req as Request & { user?: { sub?: string; businessId?: string } }).user;

      void auditService.create({
        action: `HTTP_${req.method}`,
        resource: req.originalUrl,
        userId: user?.sub ?? null,
        businessId: user?.businessId ?? null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
        metadata: {
          statusCode: res.statusCode,
        },
      });
    });

    next();
  });

  const port = configService.get<number>('app.port', { infer: true }) ?? 3000;
  await app.listen(port);
  Logger.log(`API listening on port ${port}`);
}

void bootstrap();
