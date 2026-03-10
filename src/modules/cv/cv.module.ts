import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CvService } from './cv.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QueueName.CV_GENERATION }),
  ],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
