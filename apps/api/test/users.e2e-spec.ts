import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { ADMIN_EMAIL, seedAdmin } from '../prisma/seed';
import { createTestApp, resetDb } from './helpers';

const ADMIN_PASSWORD = 'AdminPass123!';

describe('Admin users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  const http = () => request(app.getHttpServer());
  const prevAdminPassword = process.env.ADMIN_PASSWORD;

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prisma);
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    await seedAdmin(prisma);
    const admin = await http()
      .post('/auth/login')
      .send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    expect(admin.body.user).toMatchObject({ email: ADMIN_EMAIL, role: 'ADMIN' });
    adminToken = admin.body.token;
    const user = await http()
      .post('/auth/register')
      .send({ name: 'Khách', email: 'u@x.com', phone: '0912345678', password: 'matkhau123' })
      .expect(201);
    userToken = user.body.token;
    userId = user.body.user.id;
  });
  afterAll(async () => {
    if (prevAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevAdminPassword;
    await resetDb(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /admin/users: no token -> 401, non-admin -> 403', async () => {
    await http().get('/admin/users').expect(401);
    const res = await http().get('/admin/users').set('Authorization', `Bearer ${userToken}`).expect(403);
    expect(res.body).toMatchObject({ statusCode: 403, error: 'FORBIDDEN' });
  });

  it('GET /admin/users lists users without password hashes', async () => {
    const res = await http().get('/admin/users').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.map((u: { email: string }) => u.email).sort()).toEqual([ADMIN_EMAIL, 'u@x.com']);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('PATCH /admin/users/:id/password: guards, validation, 404', async () => {
    await http().patch(`/admin/users/${userId}/password`).send({ password: 'newpass123' }).expect(401);
    await http()
      .patch(`/admin/users/${userId}/password`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password: 'newpass123' })
      .expect(403);
    const bad = await http()
      .patch(`/admin/users/${userId}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'short' })
      .expect(400);
    expect(bad.body).toMatchObject({ error: 'VALIDATION_ERROR' });
    expect(typeof bad.body.fields.password).toBe('string');
    await http()
      .patch('/admin/users/does-not-exist/password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'newpass123' })
      .expect(404);
  });

  it('admin password reset then login works with the new password only', async () => {
    const res = await http()
      .patch(`/admin/users/${userId}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'newpass123' })
      .expect(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    await http().post('/auth/login').send({ identifier: 'u@x.com', password: 'matkhau123' }).expect(401);
    const login = await http().post('/auth/login').send({ identifier: '0912345678', password: 'newpass123' }).expect(200);
    expect(login.body.user.id).toBe(userId);
  });
});
