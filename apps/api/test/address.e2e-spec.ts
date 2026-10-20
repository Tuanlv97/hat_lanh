import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AddressService } from '../src/address/address.service';
import { createTestApp, resetDb } from './helpers';

describe('Address (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    prisma = new PrismaClient();
    await resetDb(prisma);
    app = await createTestApp();
  });
  afterAll(async () => {
    await resetDb(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  it('lists provinces and the wards of one province only', async () => {
    const provinces = await http().get('/address/provinces').expect(200);
    expect(provinces.body.length).toBeGreaterThan(1);
    const [a, b] = provinces.body as { code: string; name: string }[];
    expect(a).toEqual({ code: expect.any(String), name: expect.any(String) });
    const wardsA = await http().get(`/address/provinces/${a.code}/wards`).expect(200);
    const wardsB = await http().get(`/address/provinces/${b.code}/wards`).expect(200);
    expect(wardsA.body.length).toBeGreaterThan(0);
    const codesB = new Set(wardsB.body.map((w: { code: string }) => w.code));
    for (const w of wardsA.body as { code: string }[]) expect(codesB.has(w.code)).toBe(false);
  });

  it('unknown province -> 404', async () => {
    await http().get('/address/provinces/zzz/wards').expect(404);
  });

  it('isValidWard checks ward belongs to province', async () => {
    const svc = app.get(AddressService);
    const provinces = (await http().get('/address/provinces').expect(200)).body as { code: string }[];
    const [a, b] = provinces;
    const wardA = (await http().get(`/address/provinces/${a.code}/wards`)).body[0].code as string;
    expect(svc.isValidWard(a.code, wardA)).toBe(true);
    expect(svc.isValidWard(b.code, wardA)).toBe(false);
    expect(svc.isValidWard('nope', wardA)).toBe(false);
    expect(svc.isValidWard(a.code, 'nope')).toBe(false);
  });
});
