import { Module } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Donation, DonationSchema } from './entities/donation.entity';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
    ]),
  ],
  controllers: [DonationController],
  providers: [DonationService],
})
export class DonationModule {}
