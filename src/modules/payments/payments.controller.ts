import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ClickPesaCheckoutDto } from './dto/clickpesa-checkout.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('clickpesa/checkout')
  @ApiOperation({ summary: 'Initiate a ClickPesa mobile money payment' })
  initiateCheckout(@Body() dto: ClickPesaCheckoutDto) {
    return this.paymentsService.initiateCheckout(dto);
  }

  @Get('clickpesa/status/:sessionId')
  @ApiOperation({ summary: 'Query ClickPesa payment session status' })
  getSessionStatus(@Param('sessionId') sessionId: string) {
    return this.paymentsService.getSessionStatus(sessionId);
  }
}
