import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { Contract } from '../entities/contract.entity';
import { ContractTemplate } from '../entities/contract-template.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { RedisModule } from '../redis/redis.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractTemplate, Contract]),
    ClientsModule,
    RedisModule,
    AuditModule,
    InvoicesModule,
  ],
  providers: [ContractsService],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
