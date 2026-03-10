import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_PRESENCE = 'REDIS_PRESENCE';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: 0,
          keyPrefix: 'emploi:',
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        });
        redis.on('error', (err) => console.error('Redis Client Error:', err.message));
        return redis;
      },
    },
    {
      provide: REDIS_PRESENCE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: 4,
          keyPrefix: 'presence:',
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        });
        redis.on('error', (err) => console.error('Redis Presence Error:', err.message));
        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT, REDIS_PRESENCE],
})
export class RedisModule {}
