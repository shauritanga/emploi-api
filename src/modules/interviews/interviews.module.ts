import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { InterviewsService } from './interviews.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QueueName.NOTIFICATIONS }),
  ],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
