import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { RequestUser } from '../common/types/request-user.type';
import { compareHash, hashValue } from '../common/utils/hash.util';
import { BusinessService } from '../business/business.service';
import { UsersService } from '../users/users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly businessService: BusinessService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmailGlobal(dto.email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const business = await this.businessService.create(dto.businessName);

    const user = await this.usersService.create({
      businessId: business.id,
      email: dto.email,
      fullName: dto.fullName,
      password: dto.password,
      role: Role.BUSINESS_OWNER,
    });

    const tokens = await this.issueTokens({
      userId: user.id,
      businessId: business.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshTokenHash(
      user.id,
      await hashValue(tokens.refreshToken),
    );

    await this.auditService.log({
      userId: user.id,
      businessId: business.id,
      action: 'AUTH_REGISTER',
      entityType: 'user',
      entityId: user.id,
      ipAddress: ipAddress ?? null,
    });

    return tokens;
  }

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailGlobal(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.usersService.validatePassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens({
      userId: user.id,
      businessId: user.businessId,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshTokenHash(
      user.id,
      await hashValue(tokens.refreshToken),
    );
    await this.usersService.updateLastLogin(user.id);

    await this.auditService.log({
      userId: user.id,
      businessId: user.businessId,
      action: 'AUTH_LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress: ipAddress ?? null,
    });

    return tokens;
  }

  async refresh(
    user: RequestUser,
    refreshToken: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const existingUser = await this.usersService.findById(user.userId);
    if (!existingUser || !existingUser.refreshTokenHash) {
      throw new UnauthorizedException('Invalid session');
    }

    const refreshValid = await compareHash(
      refreshToken,
      existingUser.refreshTokenHash,
    );
    if (!refreshValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens({
      userId: existingUser.id,
      businessId: existingUser.businessId,
      email: existingUser.email,
      role: existingUser.role,
      sessionId: user.sessionId,
    });

    await this.usersService.updateRefreshTokenHash(
      existingUser.id,
      await hashValue(tokens.refreshToken),
    );

    await this.auditService.log({
      userId: existingUser.id,
      businessId: existingUser.businessId,
      action: 'AUTH_REFRESH',
      entityType: 'user',
      entityId: existingUser.id,
      ipAddress: ipAddress ?? null,
    });

    return tokens;
  }

  async logout(user: RequestUser, ipAddress?: string): Promise<void> {
    await this.usersService.updateRefreshTokenHash(user.userId, null);

    await this.auditService.log({
      userId: user.userId,
      businessId: user.businessId,
      action: 'AUTH_LOGOUT',
      entityType: 'user',
      entityId: user.userId,
      ipAddress: ipAddress ?? null,
    });
  }

  async createStaff(
    owner: RequestUser,
    dto: CreateStaffDto,
    ipAddress?: string,
  ): Promise<{ id: string }> {
    if (owner.role !== Role.BUSINESS_OWNER) {
      throw new UnauthorizedException('Only business owner can create staff');
    }

    const existing = await this.usersService.findByBusinessAndEmail(
      owner.businessId,
      dto.email,
    );
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const user = await this.usersService.create({
      businessId: owner.businessId,
      email: dto.email,
      fullName: dto.fullName,
      password: dto.password,
      role: Role.STAFF,
    });

    await this.auditService.log({
      userId: owner.userId,
      businessId: owner.businessId,
      action: 'AUTH_CREATE_STAFF',
      entityType: 'user',
      entityId: user.id,
      ipAddress: ipAddress ?? null,
    });

    return { id: user.id };
  }

  private async issueTokens(params: {
    userId: string;
    businessId: string;
    email: string;
    role: Role;
    sessionId?: string;
  }): Promise<AuthTokens> {
    const sessionId = params.sessionId ?? randomUUID();
    const accessSecret = this.configService.get<string>('auth.accessSecret');
    const refreshSecret = this.configService.get<string>('auth.refreshSecret');
    const accessTtl = (this.configService.get<string>('auth.accessTtl') ??
      '15m') as SignOptions['expiresIn'];
    const refreshTtl = (this.configService.get<string>('auth.refreshTtl') ??
      '30d') as SignOptions['expiresIn'];

    if (!accessSecret || !refreshSecret) {
      throw new UnauthorizedException('JWT configuration missing');
    }

    const accessPayload: JwtPayload = {
      sub: params.userId,
      businessId: params.businessId,
      role: params.role,
      email: params.email,
      sessionId,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      ...accessPayload,
      type: 'refresh',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: accessSecret,
      expiresIn: accessTtl,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshTtl,
    });

    return { accessToken, refreshToken };
  }
}
