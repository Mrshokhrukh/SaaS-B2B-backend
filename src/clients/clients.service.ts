import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  async create(params: {
    businessId: string;
    fullName: string;
    email: string;
    phone?: string | null;
  }): Promise<Client> {
    const client = this.clientsRepository.create({
      businessId: params.businessId,
      fullName: params.fullName,
      email: params.email.toLowerCase(),
      phone: params.phone ?? null,
    });

    return this.clientsRepository.save(client);
  }

  async findById(id: string): Promise<Client | null> {
    return this.clientsRepository.findOne({ where: { id } });
  }

  async findByBusinessAndEmail(businessId: string, email: string): Promise<Client | null> {
    return this.clientsRepository.findOne({
      where: {
        businessId,
        email: email.toLowerCase(),
      },
    });
  }
}
