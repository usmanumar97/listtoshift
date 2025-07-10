import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Donation, DonationDocument } from './entities/donation.entity';

@Injectable()
export class DonationService {
  private stripe: Stripe;

  constructor(
    private cfg: ConfigService,
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
  ) {
    this.stripe = new Stripe(this.cfg.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-06-30.basil',
    });
  }

  /* Create a one-off Checkout Session and return its redirect URL */
  async createCheckout(userId: string) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Support listtoshift' },
            unit_amount: 500, // $5.00
          },
          quantity: 1,
        },
      ],
      success_url: this.cfg.get('DONATION_SUCCESS_URL'),
      cancel_url: this.cfg.get('DONATION_CANCEL_URL'),
      metadata: { userId },
    });

    return { url: session.url };
  }

  /* Verify Stripe webhook & persist Donation */
  async handleWebhook(raw: Buffer, sig: string) {
    const event = this.stripe.webhooks.constructEvent(
      raw,
      sig,
      this.cfg.get('STRIPE_WEBHOOK_SECRET'),
    );

    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      await this.donationModel.create({
        userId: s.metadata.userId,
        stripePaymentId: s.payment_intent as string,
        amount: s.amount_total,
        currency: s.currency,
      });
    }

    return { received: true };
  }
}
