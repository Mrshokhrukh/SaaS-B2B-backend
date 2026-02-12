import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Contract } from '../entities/contract.entity';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';
import { MockClickProvider } from './providers/mock-click.provider';
import { MockPaymeProvider } from './providers/mock-payme.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Invoice, Contract]),
    AuditModule,
  ],
  providers: [PaymentsService, MockClickProvider, MockPaymeProvider],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
