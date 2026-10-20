import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { categories } from '../prisma/seed-data/products';

/** Boots the full app with the same configuration as main.ts. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

/** Truncates every table (except _prisma_migrations) and re-seeds categories only. */
export async function resetDb(prisma?: PrismaClient): Promise<void> {
  const client = prisma ?? new PrismaClient();
  try {
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
