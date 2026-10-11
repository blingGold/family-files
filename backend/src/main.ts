import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './app.module';
import { SettingsService } from './settings/settings.service';

/**
 * 密钥引导（启动第一步）：
 * - env 是真实值 → 持久化到数据库并写回 process.env；
 * - env 是占位/缺失 → 从数据库找回（整体覆盖 zip 后密钥不丢）；
 * - JWT_SECRET 全无 → 自动生成随机值。
 */
async function resolveSecrets() {
  const prisma = new PrismaClient();
  const settings = new SettingsService(prisma);
  try {
    process.env.JWT_SECRET = await settings.resolve('JWT_SECRET', process.env.JWT_SECRET, {
      autoGenerate: true,
    });
    process.env.OCR_API_KEY = await settings.resolve('OCR_API_KEY', process.env.OCR_API_KEY);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  await resolveSecrets();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
    credentials: true,
  });
  const config = app.get(ConfigService);
  const port = Number(config.get<number>('PORT')) || 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`backend listening on http://0.0.0.0:${port}/api`);
}
bootstrap();
