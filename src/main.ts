import 'reflect-metadata';
import 'tsconfig-paths/register';
import { existsSync, mkdirSync } from 'fs';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join, resolve } from 'path';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { getBuildInfo } from './common/utils/build-info';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  });

  // Static uploads
  const uploadRootDir = resolve(
    process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'),
  );
  if (!existsSync(uploadRootDir)) {
    mkdirSync(uploadRootDir, { recursive: true });
  }
  app.useStaticAssets(uploadRootDir, { prefix: '/uploads/' });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global guards
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Emploi API')
    .setDescription('Job platform API for Emploi')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  const buildInfo = getBuildInfo();
  logger.log(`🚀 Emploi API running on port ${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`📁 Uploads dir: ${uploadRootDir}`);
  logger.log(
    `🧩 Build: ${buildInfo.appVersion} (${buildInfo.commitSha}) at ${buildInfo.buildTimestamp}`,
  );
}

bootstrap();
