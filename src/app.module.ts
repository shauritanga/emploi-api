import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { GlobalExceptionFilter } from './common/filters/https-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { QueueName } from './common/enums';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CvModule } from './modules/cv/cv.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { CommunityModule } from './modules/community/community.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { EmployerProfileModule } from './modules/employer-profile/employer-profile.module';
import { SeekerProfileModule } from './modules/seeker-profile/seeker-profile.module';
import { ApplicationsModule } from './modules/applications/applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),

    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD,
          db: 3,
        },
      }),
    }),

    BullModule.registerQueue(
      { name: QueueName.NOTIFICATIONS },
      { name: QueueName.CV_GENERATION },
      { name: QueueName.ANTI_GHOSTING },
      { name: QueueName.JOB_ALERTS },
      { name: QueueName.EMAIL },
    ),

    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    SeekerProfileModule,
    EmployerProfileModule,
    JobsModule,
    ApplicationsModule,
    CvModule,
    MessagingModule,
    RatingsModule,
    NotificationsModule,
    CommunityModule,
    InterviewsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
