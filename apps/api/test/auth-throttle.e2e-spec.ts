import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDb } from './helpers';

describe('Auth throttling (e2e)', () => {
  let app: INestApplication;
  const prevLimit = process.env.AUTH_RATE_LIMIT;

  beforeAll(async () => {
    await resetDb();
    app = await createTestApp();
  });
  afterAll(async () => {
    process.env.AUTH_RATE_LIMIT = prevLimit;
    await app.close();
    await resetDb();
  });

  it('POST /auth/login is limited to AUTH_RATE_LIMIT per minute per IP (429 after that)', async () => {
    process.env.AUTH_RATE_LIMIT = '3';
    const body = { identifier: 'nobody@x.com', password: 'whatever1' };
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post('/auth/login').send(body).expect(401);
    }
    const res = await request(app.getHttpServer()).post('/auth/login').send(body).expect(429);
    expect(res.body).toMatchObject({ statusCode: 429, error: 'TOO_MANY_REQUESTS' });
    // Other routes keep the global default.
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
