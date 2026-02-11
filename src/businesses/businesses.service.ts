import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../entities/business.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async create(name: string): Promise<Business> {
    const business = this.businessRepository.create({ name });
    return this.businessRepository.save(business);
  }

  async findById(id: string): Promise<Business | null> {
    return this.businessRepository.findOne({ where: { id } });
  }
}
