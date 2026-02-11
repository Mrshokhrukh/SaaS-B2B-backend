import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { Contract } from '../entities/contract.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { RedisModule } from '../redis/redis.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract]),
    ClientsModule,
    InvoicesModule,
    RedisModule,
    AuditModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
