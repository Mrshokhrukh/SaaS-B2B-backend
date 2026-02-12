import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { compareHash, hashValue } from '../common/utils/hash.util';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const entity = this.userRepository.create({
      businessId: dto.businessId,
      email: dto.email.toLowerCase(),
      fullName: dto.fullName,
      passwordHash: await hashValue(dto.password),
      role: dto.role,
      isActive: true,
    });

    return this.userRepository.save(entity);
  }

  async findByBusinessAndEmail(
    businessId: string,
    email: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        businessId,
        email: email.toLowerCase(),
      },
    });
  }

  async findByEmailGlobal(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return compareHash(password, user.passwordHash);
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }
}
