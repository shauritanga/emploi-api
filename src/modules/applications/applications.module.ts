import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue(
      { name: QueueName.NOTIFICATIONS },
      { name: QueueName.ANTI_GHOSTING },
    ),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
