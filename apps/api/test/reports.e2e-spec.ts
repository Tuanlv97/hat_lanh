import type { INestApplication } from '@nestjs/common';
import { PrismaClient, type OrderStatus, type ReturnReason, type ReturnStatus } from '@prisma/client';
import request from 'supertest';
import { ADMIN_EMAIL, seedAdmin } from '../prisma/seed';
import { createTestApp, resetDb, resetThrottle } from './helpers';

const ADMIN_PASSWORD = 'AdminPass123!';
const WIDE = 'from=2026-01-01&to=2026-12-31';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let categoryId: string;
  let seq = 0;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const get = (path: string, token = adminToken) => http().get(path).set(bearer(token));
  const prevAdminPassword = process.env.ADMIN_PASSWORD;

  const mkProduct = async (name: string, priceVnd = 50_000) => {
    seq++;
    const p = await prisma.product.create({
      data: {
        name,
        slug: `sp-${seq}`,
        categoryId,
        description: 'mô tả',
        origin: 'Việt Nam',
        benefits: 'tốt',
        images: [],
        variants: { create: [{ label: '500g', priceVnd, stock: 10 }] },
      },
      include: { variants: true },
    });
    return { product: p, variant: p.variants[0] };
  };

  type P = Awaited<ReturnType<typeof mkProduct>>;
  const mkOrder = async (opts: {
    status?: OrderStatus;
    createdAt?: string;
    completedAt?: string | null;
    lines: { p: P; quantity: number }[];
  }) => {
    seq++;
    const status = opts.status ?? 'COMPLETED';
    const createdAt = opts.createdAt ?? '2026-04-10T05:00:00Z';
    return prisma.order.create({
      data: {
        code: `HLRP${String(seq).padStart(4, '0')}`,
        status,
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'a@example.com',
        provinceCode: '01',
        wardCode: '00004',
        addressDetail: '12 Hàng Bông',
        totalVnd: opts.lines.reduce((s, l) => s + l.p.variant.priceVnd * l.quantity, 0),
        createdAt: new Date(createdAt),
        completedAt:
          opts.completedAt === undefined
            ? status === 'COMPLETED'
              ? new Date(createdAt)
              : null
            : opts.completedAt === null
              ? null
              : new Date(opts.completedAt),
        items: {
          create: opts.lines.map((l) => ({
            productId: l.p.product.id,
            variantId: l.p.variant.id,
            productName: l.p.product.name,
            variantLabel: l.p.variant.label,
            unitPriceVnd: l.p.variant.priceVnd,
            quantity: l.quantity,
          })),
        },
      },
      include: { items: true },
    });
  };

  /** Return fixture on the given order item (defaults to the order's first item). */
  const mkReturn = (
    order: { id: string; items: { id: string }[] },
    status: ReturnStatus,
    quantity: number,
    reason: ReturnReason,
    createdAt = '2026-04-12T05:00:00Z',
    orderItemId = order.items[0].id,
  ) =>
    prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status,
        source: 'ADMIN',
        createdAt: new Date(createdAt),
        items: { create: [{ orderItemId, quantity, reason }] },
      },
    });

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await createTestApp();
    await app.listen(0, '127.0.0.1');
  });
  beforeEach(async () => {
    await resetDb(prisma);
    resetThrottle(app);
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    await seedAdmin(prisma);
    adminToken = (
      await http().post('/auth/login').send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(200)
    ).body.token;
    userToken = (
      await http()
        .post('/auth/register')
        .send({ name: 'Khách', email: 'u@x.com', phone: '0912345678', password: 'matkhau123' })
        .expect(201)
    ).body.token;
    categoryId = (await prisma.category.findFirstOrThrow()).id;
  });
  afterAll(async () => {
    if (prevAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevAdminPassword;
    await resetDb(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe.each(['best-sellers', 'returns', 'revenue'])('GET /admin/reports/%s access and validation', (name) => {
    const url = `/admin/reports/${name}`;
    it('401 without token, 403 for a customer', async () => {
      await http().get(url).expect(401);
      await get(url, userToken).expect(403);
    });
    it('empty database -> []', async () => {
      const res = await get(`${url}?${WIDE}`).expect(200);
      expect(res.body).toEqual([]);
    });
    it('from > to -> 400', async () => {
      await get(`${url}?from=2026-05-02&to=2026-05-01`).expect(400);
    });
    it('range over 366 days -> 400, a full year is ok', async () => {
      await get(`${url}?from=2025-01-01&to=2026-06-01`).expect(400);
      await get(`${url}?from=2026-01-01&to=2026-12-31`).expect(200);
    });
    it('invalid date -> 400', async () => {
      await get(`${url}?from=banana`).expect(400);
      await get(`${url}?from=2026-02-31`).expect(400);
    });
  });

  describe('defaults', () => {
    it('best-sellers and revenue default to the last 30 days', async () => {
      const a = await mkProduct('Gần đây');
      const recent = new Date(Date.now() - 86_400_000).toISOString();
      const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
      await mkOrder({ createdAt: recent, lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ createdAt: old, lines: [{ p: a, quantity: 5 }] });
      const best = await get('/admin/reports/best-sellers').expect(200);
      expect(best.body).toEqual([{ productId: a.product.id, name: 'Gần đây', quantity: 1 }]);
      const rev = await get('/admin/reports/revenue').expect(200);
      expect(rev.body.map((r: { revenueVnd: number }) => r.revenueVnd)).toEqual([50_000]);
    });
  });

  describe('best-sellers', () => {
    it('sums quantities of non-cancelled orders, desc, ties by name, within range', async () => {
      const a = await mkProduct('Bột A');
      const b = await mkProduct('Bột B');
      const c = await mkProduct('Bột C');
      await mkOrder({ lines: [{ p: a, quantity: 2 }, { p: b, quantity: 2 }, { p: c, quantity: 7 }] });
      await mkOrder({ lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ status: 'PENDING', lines: [{ p: b, quantity: 1 }] });
      await mkOrder({ status: 'CANCELLED', lines: [{ p: a, quantity: 100 }] });
      await mkOrder({ createdAt: '2025-12-01T00:00:00Z', lines: [{ p: a, quantity: 50 }] });
      const res = await get(`/admin/reports/best-sellers?${WIDE}`).expect(200);
      expect(res.body).toEqual([
        { productId: c.product.id, name: 'Bột C', quantity: 7 },
        { productId: a.product.id, name: 'Bột A', quantity: 3 },
        { productId: b.product.id, name: 'Bột B', quantity: 3 },
      ]);
    });
    it('date-only to includes the whole VN day; from starts at VN midnight', async () => {
      const a = await mkProduct('Bột A');
      // 2026-04-30 23:30 VN = 16:30Z (in), 2026-05-01 00:30 VN = 17:30Z (out),
      // 2026-04-01 00:00 VN = 03-31T17:00Z (in), 2026-04-01 -00:01 VN = 16:59Z (out)
      await mkOrder({ createdAt: '2026-04-30T16:30:00Z', lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ createdAt: '2026-04-30T17:30:00Z', lines: [{ p: a, quantity: 10 }] });
      await mkOrder({ createdAt: '2026-03-31T17:00:00Z', lines: [{ p: a, quantity: 100 }] });
      await mkOrder({ createdAt: '2026-03-31T16:59:00Z', lines: [{ p: a, quantity: 1000 }] });
      const res = await get('/admin/reports/best-sellers?from=2026-04-01&to=2026-04-30').expect(200);
      expect(res.body).toEqual([{ productId: a.product.id, name: 'Bột A', quantity: 101 }]);
    });
    it('accepts ISO datetimes', async () => {
      const a = await mkProduct('Bột A');
      await mkOrder({ createdAt: '2026-04-10T05:00:00Z', lines: [{ p: a, quantity: 2 }] });
      await mkOrder({ createdAt: '2026-04-10T07:00:00Z', lines: [{ p: a, quantity: 20 }] });
      const res = await get(
        '/admin/reports/best-sellers?from=2026-04-10T04:00:00Z&to=2026-04-10T06:00:00Z',
      ).expect(200);
      expect(res.body).toEqual([{ productId: a.product.id, name: 'Bột A', quantity: 2 }]);
    });
  });

  describe('revenue', () => {
    it('buckets by Asia/Ho_Chi_Minh: 17:30Z -> April 1st, 16:30Z -> March 31st', async () => {
      const a = await mkProduct('Bột A');
      await mkOrder({ completedAt: '2026-03-31T17:30:00Z', lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ completedAt: '2026-03-31T16:30:00Z', lines: [{ p: a, quantity: 2 }] });
      const month = await get(`/admin/reports/revenue?${WIDE}&group=month`).expect(200);
      expect(month.body).toEqual([
        { period: '2026-03-01', revenueVnd: 100_000 },
        { period: '2026-04-01', revenueVnd: 50_000 },
      ]);
      const day = await get(`/admin/reports/revenue?${WIDE}`).expect(200);
      expect(day.body).toEqual([
        { period: '2026-03-31', revenueVnd: 100_000 },
        { period: '2026-04-01', revenueVnd: 50_000 },
      ]);
    });
    it('week groups by Monday', async () => {
      const a = await mkProduct('Bột A');
      // 2026-04-05 is a Sunday, 2026-04-06 a Monday, 2026-04-12 a Sunday
      await mkOrder({ completedAt: '2026-04-05T05:00:00Z', lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ completedAt: '2026-04-06T05:00:00Z', lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ completedAt: '2026-04-12T05:00:00Z', lines: [{ p: a, quantity: 1 }] });
      const res = await get(`/admin/reports/revenue?${WIDE}&group=week`).expect(200);
      expect(res.body).toEqual([
        { period: '2026-03-30', revenueVnd: 50_000 },
        { period: '2026-04-06', revenueVnd: 100_000 },
      ]);
    });
    it('invalid group -> 400', async () => {
      await get('/admin/reports/revenue?group=year').expect(400);
    });
    it('excludes cancelled/pending/shipping orders (only COMPLETED, items only)', async () => {
      const a = await mkProduct('Bột A');
      await mkOrder({ lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ status: 'CANCELLED', lines: [{ p: a, quantity: 5 }] });
      await mkOrder({ status: 'SHIPPING', lines: [{ p: a, quantity: 5 }] });
      const res = await get(`/admin/reports/revenue?${WIDE}&group=month`).expect(200);
      expect(res.body).toEqual([{ period: '2026-04-01', revenueVnd: 50_000 }]);
    });
    it('approved return reduces revenue in the order completion period; rejected/requested ignored', async () => {
      const a = await mkProduct('Bột A');
      const o = await mkOrder({ completedAt: '2026-03-15T05:00:00Z', lines: [{ p: a, quantity: 3 }] });
      expect(o.totalVnd).toBe(150_000);
      // approved return made in April still reduces March
      await mkReturn(o, 'APPROVED', 1, 'DAMAGED', '2026-04-20T05:00:00Z');
      await mkReturn(o, 'REJECTED', 2, 'OTHER');
      await mkReturn(o, 'REQUESTED', 2, 'OTHER');
      const res = await get('/admin/reports/revenue?from=2026-03-01&to=2026-04-30&group=month').expect(200);
      expect(res.body).toEqual([{ period: '2026-03-01', revenueVnd: 100_000 }]);
    });
    it('sums multiple items and multiple approved returns on one line', async () => {
      const a = await mkProduct('Bột A', 50_000);
      const b = await mkProduct('Bột B', 20_000);
      const o = await mkOrder({ lines: [{ p: a, quantity: 3 }, { p: b, quantity: 2 }] });
      await mkReturn(o, 'APPROVED', 1, 'DAMAGED');
      await mkReturn(o, 'APPROVED', 1, 'OTHER');
      const res = await get(`/admin/reports/revenue?${WIDE}&group=month`).expect(200);
      // a: 50k * (3-2) = 50k ; b: 20k * 2 = 40k
      expect(res.body).toEqual([{ period: '2026-04-01', revenueVnd: 90_000 }]);
    });
  });

  describe('returns report', () => {
    it('counts APPROVED returns only, with rate, reasons (all keys) and sold quantity', async () => {
      const a = await mkProduct('Bột A');
      const b = await mkProduct('Bột B');
      const o = await mkOrder({ lines: [{ p: a, quantity: 3 }, { p: b, quantity: 4 }] });
      await mkOrder({ lines: [{ p: a, quantity: 1 }] });
      await mkOrder({ status: 'CANCELLED', lines: [{ p: a, quantity: 50 }] });
      // sold(a) = 4 (cancelled excluded), sold(b) = 4
      const ia = o.items.find((i) => i.productId === a.product.id)!.id;
      const ib = o.items.find((i) => i.productId === b.product.id)!.id;
      await mkReturn(o, 'APPROVED', 1, 'DAMAGED', undefined, ia);
      await mkReturn(o, 'APPROVED', 1, 'CHANGED_MIND', undefined, ia);
      await mkReturn(o, 'APPROVED', 1, 'OTHER', undefined, ib);
      await mkReturn(o, 'REJECTED', 3, 'WRONG_ITEM', undefined, ia);
      await mkReturn(o, 'REQUESTED', 3, 'WRONG_ITEM', undefined, ia);
      // approved but outside the period (by the return's createdAt)
      await mkReturn(o, 'APPROVED', 1, 'WRONG_ITEM', '2025-01-01T00:00:00Z', ia);
      const res = await get(`/admin/reports/returns?${WIDE}`).expect(200);
      expect(res.body).toEqual([
        {
          productId: a.product.id,
          name: 'Bột A',
          returnedQuantity: 2,
          soldQuantity: 4,
          rate: 0.5,
          reasons: { DAMAGED: 1, WRONG_ITEM: 0, CHANGED_MIND: 1, OTHER: 0 },
        },
        {
          productId: b.product.id,
          name: 'Bột B',
          returnedQuantity: 1,
          soldQuantity: 4,
          rate: 0.25,
          reasons: { DAMAGED: 0, WRONG_ITEM: 0, CHANGED_MIND: 0, OTHER: 1 },
        },
      ]);
    });
    it('rate rounds to 4 decimals', async () => {
      const a = await mkProduct('Bột A');
      const o = await mkOrder({ lines: [{ p: a, quantity: 3 }] });
      await mkReturn(o, 'APPROVED', 1, 'OTHER');
      const res = await get(`/admin/reports/returns?${WIDE}`).expect(200);
      expect(res.body[0].rate).toBe(0.3333);
    });
    it('soldQuantity and rate are 0 when nothing of the product was sold in the period', async () => {
      const a = await mkProduct('Bột A');
      const o = await mkOrder({ createdAt: '2025-12-01T00:00:00Z', lines: [{ p: a, quantity: 3 }] });
      await mkReturn(o, 'APPROVED', 1, 'OTHER', '2026-04-12T05:00:00Z');
      const res = await get(`/admin/reports/returns?${WIDE}`).expect(200);
      expect(res.body).toEqual([
        {
          productId: a.product.id,
          name: 'Bột A',
          returnedQuantity: 1,
          soldQuantity: 0,
          rate: 0,
          reasons: { DAMAGED: 0, WRONG_ITEM: 0, CHANGED_MIND: 0, OTHER: 1 },
        },
      ]);
    });
  });
});
