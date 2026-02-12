import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async findOrCreate(params: {
    businessId: string;
    fullName: string;
    email: string;
    phone?: string | null;
  }): Promise<Client> {
    const email = params.email.toLowerCase();

    const existing = await this.clientRepository.findOne({
      where: {
        businessId: params.businessId,
        email,
      },
    });

    if (existing) {
      if (params.phone && !existing.phone) {
        existing.phone = params.phone;
        return this.clientRepository.save(existing);
      }
      return existing;
    }

    const created = this.clientRepository.create({
      businessId: params.businessId,
      fullName: params.fullName,
      email,
      phone: params.phone ?? null,
    });

    return this.clientRepository.save(created);
  }
}
