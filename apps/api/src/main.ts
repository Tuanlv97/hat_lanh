import 'reflect-metadata';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  loadDotenv({ path: path.resolve(__dirname, '../../../.env') });
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(env.port);
}

void bootstrap();
