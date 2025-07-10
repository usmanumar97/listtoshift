import { Controller, Post, UseGuards, Req, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DonationService } from './donation.service';
import { Request } from 'express';
import { RawBodyRequest } from '@nestjs/common';

@Controller('donate')
export class DonationController {
  constructor(private readonly svc: DonationService) {}

  /* Authenticated clients call this, receive Checkout URL */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req) {
    return this.svc.createCheckout(req.user._id.toString());
  }

  /* Stripe sends webhooks here */
  @Post('webhook')
  async stripeWebhook(
    @Headers('stripe-signature') sig: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    await this.svc.handleWebhook(req.rawBody, sig);
    return { ok: true };
  }
}
