import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';

export type DonationDocument = HydratedDocument<Donation>;

@Schema({ timestamps: true })
export class Donation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  stripePaymentId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'usd' })
  currency: string;
}
export const DonationSchema = SchemaFactory.createForClass(Donation);
