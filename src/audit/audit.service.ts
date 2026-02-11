import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

interface AuditInput {
  action: string;
  resource: string;
  userId?: string | null;
  businessId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(input: AuditInput): Promise<void> {
    const log = this.auditLogRepository.create({
      action: input.action,
      resource: input.resource,
      userId: input.userId ?? null,
      businessId: input.businessId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    });

    await this.auditLogRepository.save(log);
  }
}
