import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
