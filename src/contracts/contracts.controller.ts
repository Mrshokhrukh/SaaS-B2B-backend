import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
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
import { RequestUser } from '../common/types/request-user.type';
import { getRequestIp } from '../common/utils/ip.util';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { OtpResponseDto } from './dto/otp-response.dto';
import { PublicLinkResponseDto } from './dto/public-link-response.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Contracts')
@Controller()
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create contract template' })
  @Post('templates')
  createTemplate(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTemplateDto,
    @Req() req: Request,
  ) {
    return this.contractsService.createTemplate(user, dto, getRequestIp(req));
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List active contract templates' })
  @Get('templates')
  listTemplates(@CurrentUser() user: RequestUser) {
    return this.contractsService.listTemplates(user);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create contract from template' })
  @Post('contracts')
  createContract(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateContractDto,
    @Req() req: Request,
  ) {
    return this.contractsService.createContract(user, dto, getRequestIp(req));
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send contract link' })
  @ApiOkResponse({ type: PublicLinkResponseDto })
  @Post('contracts/:id/send-link')
  sendLink(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.contractsService.sendLink(user, id, getRequestIp(req));
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List business contracts' })
  @Get('contracts')
  listContracts(@CurrentUser() user: RequestUser) {
    return this.contractsService.listContracts(user);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get contract details' })
  @Get('contracts/:id')
  getContract(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.contractsService.getBusinessContract(user, id);
  }

  @Public()
  @ApiOperation({ summary: 'Public contract view by token' })
  @Get('public/contracts/:token')
  publicView(@Param('token') token: string, @Req() req: Request) {
    return this.contractsService.publicView(token, getRequestIp(req));
  }

  @Public()
  @ApiOperation({ summary: 'Request OTP for contract signing' })
  @ApiCreatedResponse({ type: OtpResponseDto })
  @Post('public/contracts/:token/otp/request')
  requestOtp(
    @Param('token') token: string,
    @Body() dto: RequestOtpDto,
    @Req() req: Request,
  ) {
    return this.contractsService.requestOtp(token, dto, getRequestIp(req));
  }

  @Public()
  @ApiOperation({ summary: 'Verify OTP and sign contract' })
  @Post('public/contracts/:token/otp/verify')
  verifyOtp(
    @Param('token') token: string,
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ) {
    return this.contractsService.verifyOtpAndSign(
      token,
      dto,
      getRequestIp(req),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List contract audit logs' })
  @Get('contracts/:id/audit')
  async getContractAudit(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.auditService.log({
      userId: user.userId,
      businessId: user.businessId,
      action: 'CONTRACT_AUDIT_VIEW',
      entityType: 'contract',
      entityId: id,
      ipAddress: getRequestIp(req),
    });

    return this.auditService.listForEntity(user.businessId, 'contract', id);
  }
}
