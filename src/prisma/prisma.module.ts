import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.services';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
