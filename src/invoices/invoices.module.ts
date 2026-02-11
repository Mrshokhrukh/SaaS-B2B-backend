import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../entities/contract.entity';
import { Invoice } from '../entities/invoice.entity';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Contract])],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
