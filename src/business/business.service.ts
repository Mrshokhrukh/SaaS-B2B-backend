import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { slugify } from '../common/utils/slug.util';
import { Business } from '../entities/business.entity';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async create(name: string): Promise<Business> {
    const normalizedName = name.trim();
    const existingByName = await this.findByName(normalizedName);
    if (existingByName) {
      throw new BadRequestException('Business name already exists');
    }

    const baseSlug = slugify(normalizedName);
    let slug = baseSlug;
    let suffix = 1;

    while (await this.businessRepository.findOne({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const business = this.businessRepository.create({
      name: normalizedName,
      slug,
    });

    try {
      return await this.businessRepository.save(business);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new BadRequestException('Business name already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Business | null> {
    return this.businessRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Business | null> {
    return this.businessRepository
      .createQueryBuilder('business')
      .where('LOWER(business.name) = LOWER(:name)', { name: name.trim() })
      .getOne();
  }
}
