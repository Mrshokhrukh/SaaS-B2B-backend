import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequestUser } from '../common/types/request-user.type';
import { PaymentProvider } from '../common/enums/payment-provider.enum';
import { getRequestIp } from '../common/utils/ip.util';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { WebhookDto } from './dto/webhook.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create payment intent for invoice' })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: '4b3cc6ef-605b-4154-9a6e-7789b67f3d13',
        provider: 'MOCK_CLICK',
        providerPaymentId: 'click_0c4742c5-72c0-4286-89a7-c5f8f95f5f13',
        amountCents: 150000,
        currency: 'USD',
        status: 'INITIATED',
        checkoutUrl:
          'https://checkout.mock-click.local/pay/click_0c4742c5-72c0-4286-89a7-c5f8f95f5f13',
      },
    },
  })
  @Post('invoices/:invoiceId/intents')
  createIntent(
    @CurrentUser() user: RequestUser,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreatePaymentIntentDto,
    @Req() req: Request,
  ) {
    return this.paymentsService.createIntent(
      user,
      invoiceId,
      dto,
      getRequestIp(req),
    );
  }

  @Public()
  @ApiOperation({ summary: 'Payment provider webhook callback' })
  @ApiOkResponse({
    schema: {
      example: { success: true },
    },
  })
  @Post('webhooks/:provider')
  webhook(
    @Param('provider') provider: PaymentProvider,
    @Body() dto: WebhookDto,
    @Headers('x-signature') signature: string | undefined,
    @Req() req: Request,
  ) {
    return this.paymentsService.handleWebhook(
      provider,
      dto,
      signature,
      getRequestIp(req),
    );
  }

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment by id' })
  @Get(':id')
  getPayment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.paymentsService.getPayment(user, id);
  }
}
