import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationProcessor } from './processor/notification.processor';
import { AntiGhostingProcessor } from './processor/ant-ghosting.processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApplicationsModule } from '../applications/applications.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    ApplicationsModule,
    BullModule.registerQueue(
      { name: QueueName.NOTIFICATIONS },
      { name: QueueName.ANTI_GHOSTING },
    ),
  ],
  providers: [NotificationProcessor, AntiGhostingProcessor],
  exports: [NotificationProcessor, AntiGhostingProcessor],
})
export class NotificationsModule {}
