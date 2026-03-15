import { Module } from '@nestjs/common';
import { SeekerProfileService } from './seeker-profile.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SeekerProfileController } from './seeker-profile.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SeekerProfileController],
  providers: [SeekerProfileService],
  exports: [SeekerProfileService],
})
export class SeekerProfileModule {}
