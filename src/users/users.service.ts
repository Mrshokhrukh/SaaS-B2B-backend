import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase(),
      fullName: createUserDto.fullName,
      passwordHash,
      role: createUserDto.role,
      businessId: createUserDto.businessId,
    });

    return this.userRepository.save(user);
  }

  async createOwner(params: {
    email: string;
    fullName: string;
    password: string;
    businessId: string;
  }): Promise<User> {
    return this.create({ ...params, role: Role.OWNER });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
