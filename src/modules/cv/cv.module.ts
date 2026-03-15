import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QueueName.CV_GENERATION }),
  ],
  controllers: [CvController],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
