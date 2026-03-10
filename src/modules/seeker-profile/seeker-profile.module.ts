import { Module } from '@nestjs/common';
import { SeekerProfileService } from './seeker-profile.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SeekerProfileService],
  exports: [SeekerProfileService],
})
export class SeekerProfileModule {}
