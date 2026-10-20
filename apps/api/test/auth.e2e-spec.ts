import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp, resetDb } from './helpers';

const PASSWORD = 'matkhau123';

function registerBody(overrides: Record<string, unknown> = {}) {
  return { name: 'Nguyễn Văn A', email: 'a@x.com', phone: '0912345678', password: PASSWORD, ...overrides };
}

async function createGuestOrder(prisma: PrismaClient, email: string, code: string) {
  return prisma.order.create({
    data: {
      code,
      fullName: 'Khách vãng lai',
      phone: '0987654321',
      email,
      provinceCode: '01',
      wardCode: '00001',
      addressDetail: '1 Phố Huế',
      totalVnd: 100_000,
    },
  });
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prisma);
  });
  afterAll(async () => {
    await resetDb(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/register + /auth/login', () => {
    it('registers, stores normalized email/phone and a bcrypt hash, returns {token,user}', async () => {
      const res = await http()
        .post('/auth/register')
        .send(registerBody({ email: '  Mixed@X.com ', phone: '+84 912 345 678' }))
        .expect(201);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toEqual({
        id: expect.any(String),
        name: 'Nguyễn Văn A',
        email: 'mixed@x.com',
        phone: '0912345678',
        role: 'USER',
      });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      const row = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } });
      expect(row.email).toBe('mixed@x.com');
      expect(row.phone).toBe('0912345678');
      expect(row.emailVerified).toBe(false);
      expect(row.passwordHash).toMatch(/^\$2[aby]\$10\$/);
      expect(row.passwordHash).not.toContain(PASSWORD);
    });

    it('register then login by email (case-insensitive) and by phone (any format)', async () => {
      const reg = await http().post('/auth/register').send(registerBody()).expect(201);

      const byEmail = await http().post('/auth/login').send({ identifier: ' A@X.COM ', password: PASSWORD }).expect(200);
      expect(byEmail.body.user).toEqual(reg.body.user);
      expect(typeof byEmail.body.token).toBe('string');

      const byPhone = await http()
        .post('/auth/login')
        .send({ identifier: '+84912345678', password: PASSWORD })
        .expect(200);
      expect(byPhone.body.user.id).toBe(reg.body.user.id);
      expect(JSON.stringify(byEmail.body) + JSON.stringify(byPhone.body)).not.toContain('passwordHash');
    });

    it('a@x.com then A@X.com -> 409 EMAIL_TAKEN', async () => {
      await http().post('/auth/register').send(registerBody({ email: 'a@x.com' })).expect(201);
      const res = await http()
        .post('/auth/register')
        .send(registerBody({ email: 'A@X.com', phone: '0987654321' }))
        .expect(409);
      expect(res.body).toMatchObject({ statusCode: 409, error: 'EMAIL_TAKEN' });
    });

    it('0912345678 then +84912345678 -> 409 PHONE_TAKEN', async () => {
      await http().post('/auth/register').send(registerBody({ phone: '0912345678' })).expect(201);
      const res = await http()
        .post('/auth/register')
        .send(registerBody({ email: 'b@x.com', phone: '+84912345678' }))
        .expect(409);
      expect(res.body).toMatchObject({ statusCode: 409, error: 'PHONE_TAKEN' });
    });

    it('bad phone -> 400 VALIDATION_ERROR with a phone field error', async () => {
      const res = await http().post('/auth/register').send(registerBody({ phone: '0123' })).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'VALIDATION_ERROR' });
      expect(typeof res.body.fields.phone).toBe('string');
      expect(await prisma.user.count()).toBe(0);
    });

    it('HTTP-level VALIDATION_ERROR: short password, bad email, missing name', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ email: 'not-an-email', phone: '0912345678', password: 'short' })
        .expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'VALIDATION_ERROR' });
      expect(Object.keys(res.body.fields).sort()).toEqual(['email', 'name', 'password']);
    });

    it('wrong password and unknown identifier -> 401 with the same message', async () => {
      await http().post('/auth/register').send(registerBody()).expect(201);
      const wrong = await http().post('/auth/login').send({ identifier: 'a@x.com', password: 'sai-mat-khau' }).expect(401);
      const unknown = await http().post('/auth/login').send({ identifier: 'nobody@x.com', password: PASSWORD }).expect(401);
      const unknownPhone = await http().post('/auth/login').send({ identifier: '0399999999', password: PASSWORD }).expect(401);
      const garbage = await http().post('/auth/login').send({ identifier: 'abc', password: PASSWORD }).expect(401);
      expect(wrong.body.statusCode).toBe(401);
      for (const r of [unknown, unknownPhone, garbage]) {
        expect(r.body).toEqual(wrong.body);
      }
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user for a valid bearer token', async () => {
      const reg = await http().post('/auth/register').send(registerBody()).expect(201);
      const me = await http().get('/auth/me').set('Authorization', `Bearer ${reg.body.token}`).expect(200);
      expect(me.body).toEqual({ user: reg.body.user });
      expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    });

    it('401 without token, with a garbage token, or with a token signed by another secret', async () => {
      await http().get('/auth/me').expect(401);
      await http().get('/auth/me').set('Authorization', 'Bearer not.a.jwt').expect(401);
      // header {"alg":"HS256","typ":"JWT"}, payload {"sub":"x","role":"ADMIN"}, signed with "wrong-secret"
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IkFETUlOIn0.' +
        'kH2fLx0zv6HppbR6uXl1zS0b1w1Vf8kq7h4Y5mJ0Q2c';
      await http().get('/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
    });
  });

  describe('POST /auth/dev-login', () => {
    const prevMode = process.env.OAUTH_MODE;
    afterEach(() => {
      if (prevMode === undefined) delete process.env.OAUTH_MODE;
      else process.env.OAUTH_MODE = prevMode;
    });

    it('returns 404 when OAUTH_MODE is not dev', async () => {
      process.env.OAUTH_MODE = 'live';
      const res = await http()
        .post('/auth/dev-login')
        .send({ provider: 'google', email: 'g@x.com', name: 'G' })
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' });
      expect(await prisma.user.count()).toBe(0);
    });

    it('returns 404 when OAUTH_MODE is unset (dev-login must be opted into explicitly)', async () => {
      delete process.env.OAUTH_MODE;
      const res = await http()
        .post('/auth/dev-login')
        .send({ provider: 'google', email: 'g@x.com', name: 'G' })
        .expect(404);
      expect(res.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' });
      expect(await prisma.user.count()).toBe(0);
    });

    it('concurrent first-time dev-logins for the same email resolve to one user (no 409/500)', async () => {
      process.env.OAUTH_MODE = 'dev';
      const body = { provider: 'google', email: 'race@x.com', name: 'Race' };
      const results = await Promise.all(Array.from({ length: 5 }, () => http().post('/auth/dev-login').send(body)));
      expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
      expect(new Set(results.map((r) => r.body.user.id)).size).toBe(1);
      expect(await prisma.user.count()).toBe(1);
    });

    it('creates a verified social user, is idempotent, and links earlier guest orders with the same email', async () => {
      process.env.OAUTH_MODE = 'dev';
      const guest = await createGuestOrder(prisma, 'Social@X.com', 'HL-GUEST1');
      const other = await createGuestOrder(prisma, 'someone-else@x.com', 'HL-GUEST2');

      const first = await http()
        .post('/auth/dev-login')
        .send({ provider: 'google', email: 'social@x.com', name: 'Chị Google' })
        .expect(200);
      expect(first.body.user).toEqual({
        id: expect.any(String),
        name: 'Chị Google',
        email: 'social@x.com',
        phone: null,
        role: 'USER',
      });
      expect(typeof first.body.token).toBe('string');
      const row = await prisma.user.findUniqueOrThrow({ where: { id: first.body.user.id } });
      expect(row.emailVerified).toBe(true);
      expect(row.provider).toBe('google');

      expect((await prisma.order.findUniqueOrThrow({ where: { id: guest.id } })).userId).toBe(first.body.user.id);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: other.id } })).userId).toBeNull();

      const again = await http()
        .post('/auth/dev-login')
        .send({ provider: 'google', email: 'SOCIAL@x.com', name: 'Chị Google' })
        .expect(200);
      expect(again.body.user.id).toBe(first.body.user.id);
      expect(await prisma.user.count()).toBe(1);

      const me = await http().get('/auth/me').set('Authorization', `Bearer ${again.body.token}`).expect(200);
      expect(me.body.user.id).toBe(first.body.user.id);
    });

    it('an email-registered user does NOT get guest orders linked, and dev-login with that email -> 409 EMAIL_TAKEN', async () => {
      process.env.OAUTH_MODE = 'dev';
      const guest = await createGuestOrder(prisma, 'a@x.com', 'HL-GUEST3');
      await http().post('/auth/register').send(registerBody({ email: 'a@x.com' })).expect(201);
      await http().post('/auth/login').send({ identifier: 'a@x.com', password: PASSWORD }).expect(200);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: guest.id } })).userId).toBeNull();

      const res = await http()
        .post('/auth/dev-login')
        .send({ provider: 'facebook', email: 'A@X.com', name: 'Mạo danh' })
        .expect(409);
      expect(res.body).toMatchObject({ statusCode: 409, error: 'EMAIL_TAKEN' });
      expect((await prisma.order.findUniqueOrThrow({ where: { id: guest.id } })).userId).toBeNull();
    });

    it('rejects an unknown provider with 400', async () => {
      process.env.OAUTH_MODE = 'dev';
      await http().post('/auth/dev-login').send({ provider: 'github', email: 'g@x.com', name: 'G' }).expect(400);
    });
  });
});
