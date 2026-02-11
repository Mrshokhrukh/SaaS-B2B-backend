import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { MockWebhookDto } from './dto/mock-webhook.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('invoices/:invoiceId/checkout')
  createCheckout(
    @CurrentUser() user: { sub: string; businessId: string; role: string; email: string },
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateCheckoutDto,
    @Req() req: Request,
  ) {
    return this.paymentsService.createCheckout(user, invoiceId, dto, req.ip);
  }

  @Post('webhooks/mock')
  handleMockWebhook(
    @Body() dto: MockWebhookDto,
    @Headers('x-webhook-secret') webhookSecret: string | undefined,
    @Req() req: Request,
  ) {
    return this.paymentsService.handleMockWebhook(dto, webhookSecret, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getPayment(
    @CurrentUser() user: { sub: string; businessId: string; role: string; email: string },
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.getPaymentById(user, paymentId);
  }
}
