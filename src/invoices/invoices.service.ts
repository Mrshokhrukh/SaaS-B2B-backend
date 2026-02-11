import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { Contract } from '../entities/contract.entity';
import { Invoice } from '../entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Contract)
    private readonly contractsRepository: Repository<Contract>,
  ) {}

  async createForContract(params: {
    businessId: string;
    contractId: string;
    amountCents: number;
    currency: string;
    dueDate?: Date;
  }): Promise<Invoice> {
    const contract = await this.contractsRepository.findOne({
      where: { id: params.contractId, businessId: params.businessId },
      relations: { invoice: true },
    });

    if (!contract) {
      throw new BadRequestException('Contract not found');
    }

    if (contract.invoice) {
      throw new BadRequestException('Invoice already exists for contract');
    }

    const invoice = this.invoicesRepository.create({
      contractId: contract.id,
      amountCents: params.amountCents,
      currency: params.currency.toUpperCase(),
      invoiceNumber: this.generateInvoiceNumber(),
      status: InvoiceStatus.ISSUED,
      dueDate: params.dueDate ?? null,
      issuedAt: new Date(),
    });

    return this.invoicesRepository.save(invoice);
  }

  async findById(invoiceId: string): Promise<Invoice | null> {
    return this.invoicesRepository.findOne({
      where: { id: invoiceId },
      relations: { contract: true, payments: true },
    });
  }

  async markPaid(invoiceId: string): Promise<void> {
    await this.invoicesRepository.update(invoiceId, {
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
    });
  }

  private generateInvoiceNumber(): string {
    return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}
