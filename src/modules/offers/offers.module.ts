import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QueueName.NOTIFICATIONS }),
  ],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
