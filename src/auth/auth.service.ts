import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { BusinessesService } from '../businesses/businesses.service';
import { Role } from '../common/enums/role.enum';
import { RequestUser } from '../common/types/request-user.type';
import { UsersService } from '../users/users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly businessesService: BusinessesService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async registerOwner(input: RegisterOwnerDto, ipAddress?: string): Promise<{ accessToken: string }> {
    const existingUser = await this.usersService.findByEmail(input.email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const business = await this.businessesService.create(input.businessName);
    const owner = await this.usersService.createOwner({
      businessId: business.id,
      email: input.email,
      fullName: input.fullName,
      password: input.password,
    });

    await this.auditService.create({
      action: 'AUTH_REGISTER_OWNER',
      resource: `business:${business.id}`,
      userId: owner.id,
      businessId: business.id,
      ipAddress: ipAddress ?? null,
      metadata: { email: owner.email },
    });

    return {
      accessToken: await this.signAccessToken({
        sub: owner.id,
        role: owner.role,
        businessId: owner.businessId,
        email: owner.email,
      }),
    };
  }

  async login(input: LoginDto, ipAddress?: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditService.create({
      action: 'AUTH_LOGIN',
      resource: `user:${user.id}`,
      userId: user.id,
      businessId: user.businessId,
      ipAddress: ipAddress ?? null,
      metadata: { email: user.email },
    });

    return {
      accessToken: await this.signAccessToken({
        sub: user.id,
        role: user.role,
        businessId: user.businessId,
        email: user.email,
      }),
    };
  }

  async createStaff(
    actor: RequestUser,
    input: CreateStaffDto,
    ipAddress?: string,
  ): Promise<{ id: string; email: string }> {
    if (actor.role !== Role.OWNER) {
      throw new UnauthorizedException('Only owners can create staff users');
    }

    const existingUser = await this.usersService.findByEmail(input.email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const staff = await this.usersService.create({
      businessId: actor.businessId,
      email: input.email,
      fullName: input.fullName,
      password: input.password,
      role: Role.STAFF,
    });

    await this.auditService.create({
      action: 'AUTH_CREATE_STAFF',
      resource: `user:${staff.id}`,
      businessId: actor.businessId,
      userId: actor.sub,
      ipAddress: ipAddress ?? null,
      metadata: {
        staffId: staff.id,
        staffEmail: staff.email,
      },
    });

    return { id: staff.id, email: staff.email };
  }

  private async signAccessToken(payload: RequestUser): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
