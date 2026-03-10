import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.services';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        seekerProfile: {
          select: {
            id: true,
            fullName: true,
            profilePhotoUrl: true,
            profileCompletionScore: true,
            availabilityStatus: true,
          },
        },
        employerProfile: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            verificationStatus: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deactivate(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return { message: 'Account deactivated successfully' };
  }

  async registerDevice(userId: string, fcmToken: string, platform: string) {
    return this.prisma.userDevice.upsert({
      where: { fcmToken },
      create: { userId, fcmToken, platform },
      update: { userId, platform },
    });
  }

  async removeDevice(userId: string, fcmToken: string) {
    const device = await this.prisma.userDevice.findUnique({
      where: { fcmToken },
    });

    if (!device) throw new NotFoundException('Device not found');
    if (device.userId !== userId)
      throw new BadRequestException('Not your device');

    await this.prisma.userDevice.delete({ where: { fcmToken } });
    return { message: 'Device removed' };
  }

  async getUserDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: { userId },
      select: { fcmToken: true, platform: true, createdAt: true },
    });
  }
}
