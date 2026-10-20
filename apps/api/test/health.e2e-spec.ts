import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('GET /health', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns 200 {status:ok}', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('unknown route yields consistent error JSON', async () => {
    const res = await request(app.getHttpServer()).get('/nope').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' });
    expect(typeof res.body.message).toBe('string');
  });

  it('allows CORS for the portal and admin origins only', async () => {
    const ok = await request(app.getHttpServer()).get('/health').set('Origin', 'http://localhost:3001');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    const bad = await request(app.getHttpServer()).get('/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
