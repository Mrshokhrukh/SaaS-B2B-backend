import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RequestUser } from '../common/types/request-user.type';
import { getRequestIp } from '../common/utils/ip.util';
import { AuthService, AuthTokens } from './auth.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { UserIdResponseDto } from './dto/user-id-response.dto';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Register business owner' })
  @ApiCreatedResponse({ type: AuthTokensDto })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthTokens> {
    return this.authService.register(dto, getRequestIp(req));
  }

  @Public()
  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({ type: AuthTokensDto })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokens> {
    return this.authService.login(dto, getRequestIp(req));
  }

  @Public()
  @UseGuards(RefreshJwtAuthGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({ type: AuthTokensDto })
  @Post('refresh')
  refresh(
    @CurrentUser() user: RequestUser,
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthTokens> {
    return this.authService.refresh(user, dto.refreshToken, getRequestIp(req));
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiOkResponse({
    schema: {
      example: { success: true },
    },
  })
  @Post('logout')
  async logout(@CurrentUser() user: RequestUser, @Req() req: Request) {
    await this.authService.logout(user, getRequestIp(req));
    return { success: true };
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create staff user' })
  @ApiCreatedResponse({ type: UserIdResponseDto })
  @Roles(Role.BUSINESS_OWNER)
  @Post('staff')
  createStaff(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateStaffDto,
    @Req() req: Request,
  ) {
    return this.authService.createStaff(user, dto, getRequestIp(req));
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List recent business audit logs' })
  @Get('audit')
  async audit(@CurrentUser() user: RequestUser) {
    return this.auditService.listForBusiness(user.businessId);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Current user profile' })
  @ApiOkResponse({
    schema: {
      example: {
        userId: '4f0465fd-a4e8-40b6-bbf3-47f04f081659',
        businessId: '7d18534e-0f31-44be-91ea-8a87d12f85bc',
        role: 'BUSINESS_OWNER',
        email: 'owner@acme.com',
        sessionId: '7af098f6-d005-4f20-a076-49d1c4fa789a',
      },
    },
  })
  @Post('me/audit')
  async meAudit(@CurrentUser() user: RequestUser, @Req() req: Request) {
    await this.auditService.log({
      userId: user.userId,
      businessId: user.businessId,
      action: 'AUTH_ME',
      entityType: 'user',
      entityId: user.userId,
      ipAddress: getRequestIp(req),
    });

    return user;
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user session payload' })
  @ApiOkResponse({
    schema: {
      example: {
        userId: '4f0465fd-a4e8-40b6-bbf3-47f04f081659',
        businessId: '7d18534e-0f31-44be-91ea-8a87d12f85bc',
        role: 'BUSINESS_OWNER',
        email: 'owner@acme.com',
        sessionId: '7af098f6-d005-4f20-a076-49d1c4fa789a',
      },
    },
  })
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}
