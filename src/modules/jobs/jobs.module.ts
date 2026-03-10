import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobAlertsProcessor } from './processors/job-alerts.processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({ name: QueueName.JOB_ALERTS }),
    BullModule.registerQueue({ name: QueueName.NOTIFICATIONS }),
  ],
  controllers: [JobsController],
  providers: [JobsService, JobAlertsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
