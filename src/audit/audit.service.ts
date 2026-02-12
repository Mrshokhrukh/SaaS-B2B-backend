import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogInput {
  userId?: string | null;
  businessId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    const entity = this.auditRepository.create({
      userId: input.userId ?? null,
      businessId: input.businessId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    });

    await this.auditRepository.save(entity);
  }

  async listForBusiness(businessId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async listForEntity(
    businessId: string,
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { businessId, entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
