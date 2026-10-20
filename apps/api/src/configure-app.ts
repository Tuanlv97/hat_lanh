import type { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { loadEnv } from './config/env';

/** Shared by main.ts and the test harness so they cannot drift. */
export function configureApp(app: INestApplication): void {
  const env = loadEnv();
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());
}
