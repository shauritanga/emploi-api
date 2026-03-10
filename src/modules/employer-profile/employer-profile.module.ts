import { Module } from '@nestjs/common';
import { EmployerProfileService } from './employer-profile.services';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmployerProfileService],
  exports: [EmployerProfileService],
})
export class EmployerProfileModule {}
