import { Module } from '@nestjs/common';
import { EmployerProfileService } from './employer-profile.services';
import { EmployerProfileController } from './employer-profile.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmployerProfileController],
  providers: [EmployerProfileService],
  exports: [EmployerProfileService],
})
export class EmployerProfileModule {}
