import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { PrismaService } from 'src/prisma/prisma.services';
import {
  NotificationQueryDto,
  NotificationPreferencesDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async getNotifications(userId: string, query?: NotificationQueryDto) {
    const where: any = { userId };

    if (query?.read !== undefined) {
      where.isRead = query.read;
    }

    if (query?.type) {
      where.type = query.type;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this notification',
      );
    }

    return notification;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.getNotification(notificationId, userId);

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.getNotification(notificationId, userId);

    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async deleteAllNotifications(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }

  async getNotificationCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    const totalCount = await this.prisma.notification.count({
      where: { userId },
    });

    return {
      unreadCount,
      totalCount,
    };
  }

  async getPreferences(userId: string) {
    const key = `notification:preferences:${userId}`;
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as NotificationPreferencesDto;
    }

    return {
      applicationStatus: true,
      newMessage: true,
      interviewRequest: true,
      offerReceived: true,
      jobAlert: true,
      newRating: true,
      profileView: true,
      employerMessageRequest: true,
    };
  }

  async updatePreferences(userId: string, dto: NotificationPreferencesDto) {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...dto };
    const key = `notification:preferences:${userId}`;
    await this.redis.set(key, JSON.stringify(updated));
    return updated;
  }
}
