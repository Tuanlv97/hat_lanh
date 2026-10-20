import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { UPLOAD_DIR } from './uploads/uploads';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { loadEnv } from './config/env';

/** Shared by main.ts and the test harness so they cannot drift. */
export function configureApp(app: INestApplication): void {
  const env = loadEnv();
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  // Uploaded images are served statically; nosniff so a file is never interpreted as anything but an image.
  (app as NestExpressApplication).useStaticAssets(UPLOAD_DIR, {
    prefix: '/uploads',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });
}
