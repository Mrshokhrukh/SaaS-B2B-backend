import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../common/types/request-user.type';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RequestSignOtpDto } from './dto/request-sign-otp.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createContract(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateContractDto,
    @Req() req: Request,
  ) {
    return this.contractsService.createContract(user, dto, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-link')
  sendContractLink(
    @CurrentUser() user: RequestUser,
    @Param('id') contractId: string,
    @Req() req: Request,
  ) {
    return this.contractsService.sendContractLink(user, contractId, req.ip);
  }

  @Get('public/:token')
  getPublicContract(@Param('token') token: string, @Req() req: Request) {
    return this.contractsService.viewPublicContract(token, req.ip);
  }

  @Post('public/:token/request-otp')
  requestOtp(
    @Param('token') token: string,
    @Body() dto: RequestSignOtpDto,
    @Req() req: Request,
  ) {
    return this.contractsService.requestOtp(token, dto, req.ip);
  }

  @Post('public/:token/sign')
  signContract(
    @Param('token') token: string,
    @Body() dto: VerifySignatureDto,
    @Req() req: Request,
  ) {
    return this.contractsService.signContract(token, dto, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invoice')
  createInvoice(
    @CurrentUser() user: RequestUser,
    @Param('id') contractId: string,
    @Body() dto: CreateInvoiceDto,
    @Req() req: Request,
  ) {
    return this.contractsService.createInvoice(user, contractId, dto, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  getContractStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') contractId: string,
  ) {
    return this.contractsService.getContractStatus(user, contractId);
  }
}
