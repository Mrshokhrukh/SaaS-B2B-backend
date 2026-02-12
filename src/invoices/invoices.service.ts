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
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
  ) {}

  async createForSignedContract(contractId: string): Promise<Invoice> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: { invoice: true },
    });

    if (!contract) {
      throw new BadRequestException('Contract not found');
    }

    if (contract.invoice) {
      return contract.invoice;
    }

    const invoice = this.invoiceRepository.create({
      businessId: contract.businessId,
      contractId: contract.id,
      invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amountCents: contract.amountCents,
      currency: contract.currency,
      status: InvoiceStatus.PENDING,
      dueAt: null,
    });

    return this.invoiceRepository.save(invoice);
  }

  async findByIdForBusiness(
    invoiceId: string,
    businessId: string,
  ): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id: invoiceId, businessId },
      relations: { contract: true },
    });
  }

  async markPaid(invoiceId: string): Promise<void> {
    await this.invoiceRepository.update(invoiceId, {
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
    });
  }
}
