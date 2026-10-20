import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { getStorageToken, type ThrottlerStorage } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { categories } from '../prisma/seed-data/products';

/**
 * Boots the full app with the same configuration as main.ts.
 * `override` may swap providers (e.g. `b => b.overrideProvider(NOTIFIER).useValue(mock)`).
 */
export async function createTestApp(
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (override ? override(builder) : builder).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

/** Forgets every rate-limit hit recorded by the app's in-memory throttler (so one test's 429 cannot leak into the next). */
export function resetThrottle(app: INestApplication): void {
  // ThrottlerStorageService keeps hits in two private maps; its shutdown hook clears both
  // (and the sweep timer, which restarts on the next hit). Clearing only `.storage` is not enough.
  const storage = app.get<ThrottlerStorage & { onApplicationShutdown?: () => void }>(getStorageToken());
  if (typeof storage.onApplicationShutdown !== 'function') throw new Error('resetThrottle: unexpected throttler storage');
  storage.onApplicationShutdown();
}

/** Truncates every table (except _prisma_migrations) and re-seeds categories only. */
export async function resetDb(prisma?: PrismaClient): Promise<void> {
  const client = prisma ?? new PrismaClient();
  try {
    const [{ db }] = await client.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    if (!db.endsWith('_test')) {
      throw new Error(`resetDb refused: connected database "${db}" does not end with "_test"`);
    }
    const rows = await client.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (rows.length > 0) {
      const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
      await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    }
    for (const c of categories) {
      await client.category.create({ data: c });
    }
  } finally {
    if (!prisma) await client.$disconnect();
  }
}
