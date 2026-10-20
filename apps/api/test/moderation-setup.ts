import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { normalizeVi } from '@hatlanh/shared';
import request from 'supertest';
import { ADMIN_EMAIL, seedAdmin } from '../prisma/seed';
import { createTestApp, resetDb, resetThrottle } from './helpers';

const ADMIN_PASSWORD = 'AdminPass123!';

/** Shared fixture for the moderation / reviews / comments e2e suites: registers hooks, returns a live context. */
export function useModerationSuite() {
  const ctx = {
    app: undefined as unknown as INestApplication,
    prisma: undefined as unknown as PrismaClient,
    adminToken: '',
    userToken: '',
    userId: '',
    otherToken: '',
    otherId: '',
    seq: 0,
    http: () => request(ctx.app.getHttpServer()),
    bearer: (t: string) => ({ Authorization: `Bearer ${t}` }),
    /** Inserts an already-normalized sensitive word (ruling R5). */
    addWord: (term: string) => ctx.prisma.sensitiveWord.create({ data: { term: normalizeVi(term) } }),
    register: async (name: string, email: string, phone: string) => {
      const res = await ctx.http().post('/auth/register').send({ name, email, phone, password: 'matkhau123' }).expect(201);
      return { token: res.body.token as string, id: res.body.user.id as string };
    },
  };
  const prevAdminPassword = process.env.ADMIN_PASSWORD;

  beforeAll(async () => {
    ctx.prisma = new PrismaClient();
    ctx.app = await createTestApp();
    await ctx.app.listen(0, '127.0.0.1');
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    resetThrottle(ctx.app);
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    await seedAdmin(ctx.prisma);
    ctx.adminToken = (
      await ctx.http().post('/auth/login').send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(200)
    ).body.token;
    const u = await ctx.register('Khách', 'u@x.com', '0912345678');
    ctx.userToken = u.token;
    ctx.userId = u.id;
    const o = await ctx.register('Khách 2', 'v@x.com', '0912345679');
    ctx.otherToken = o.token;
    ctx.otherId = o.id;
  });
  afterAll(async () => {
    if (prevAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevAdminPassword;
    await resetDb(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.app.close();
  });
  return ctx;
}
