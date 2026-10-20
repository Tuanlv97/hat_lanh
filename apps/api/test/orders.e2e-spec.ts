import { HttpException, type INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { ADMIN_EMAIL, seedAdmin } from '../prisma/seed';
import { NOTIFIER, type NotificationEvent } from '../src/notifications/notifier';
import { OrdersService, type CreateOrderInput } from '../src/orders/orders.service';
import { createTestApp, resetDb, resetThrottle } from './helpers';

const ADMIN_PASSWORD = 'AdminPass123!';
const CODE_RE = /^HL[A-HJ-NP-Z2-9]{8}$/;

const form = {
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  email: 'a@example.com',
  provinceCode: '01',
  wardCode: '00004',
  addressDetail: '12 Hàng Bông',
};

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let orders: OrdersService;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let otherToken: string;
  let categoryId: string;
  let seq = 0;
  const notify = jest.fn<Promise<void>, [NotificationEvent]>();
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const prevAdminPassword = process.env.ADMIN_PASSWORD;

  /** One product with one variant; returns the variant (with productId). */
  const mkVariant = async (
    opts: { price?: number; stock?: number; isActive?: boolean; productActive?: boolean; name?: string; label?: string } = {},
  ) => {
    seq++;
    const p = await prisma.product.create({
      data: {
        name: opts.name ?? `Sản phẩm ${seq}`,
        slug: `san-pham-${seq}`,
        categoryId,
        description: 'mô tả',
        origin: 'Việt Nam',
        benefits: 'tốt',
        images: [],
        isActive: opts.productActive ?? true,
        variants: {
          create: [
            { label: opts.label ?? '500g', priceVnd: opts.price ?? 50_000, stock: opts.stock ?? 10, isActive: opts.isActive ?? true },
          ],
        },
      },
      include: { variants: true },
    });
    return p.variants[0];
  };
  const stockOf = async (id: string) => (await prisma.variant.findUniqueOrThrow({ where: { id } })).stock;
  const input = (items: CreateOrderInput['items'], over: Partial<typeof form> = {}): CreateOrderInput => ({
    ...form,
    ...over,
    items,
  });
  const errorOf = (e: unknown) => {
    expect(e).toBeInstanceOf(HttpException);
    const ex = e as HttpException;
    return { status: ex.getStatus(), body: ex.getResponse() as Record<string, unknown> };
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await createTestApp((b) => b.overrideProvider(NOTIFIER).useValue({ notify }));
    // Listen once so 20 parallel supertest requests share one server instead of each opening its own.
    await app.listen(0, '127.0.0.1');
    orders = app.get(OrdersService);
  });
  beforeEach(async () => {
    await resetDb(prisma);
    resetThrottle(app);
    notify.mockReset();
    notify.mockResolvedValue(undefined);
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    await seedAdmin(prisma);
    adminToken = (
      await http().post('/auth/login').send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(200)
    ).body.token;
    const reg = await http()
      .post('/auth/register')
      .send({ name: 'Khách', email: 'u@x.com', phone: '0912345678', password: 'matkhau123' })
      .expect(201);
    userToken = reg.body.token;
    userId = reg.body.user.id;
    otherToken = (
      await http()
        .post('/auth/register')
        .send({ name: 'Khách 2', email: 'v@x.com', phone: '0912345679', password: 'matkhau123' })
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

  describe('POST /orders', () => {
    it('guest happy path: code format, total = sum, stock decreased, snapshot, notifier called once', async () => {
      const a = await mkVariant({ price: 45_000, stock: 10, name: 'Gạo lứt đỏ', label: '1kg' });
      const b = await mkVariant({ price: 30_000, stock: 5, name: 'Mè rang', label: '200g' });
      const res = await http()
        .post('/orders')
        .send({ ...form, phone: '+84 901 234 567', items: [{ variantId: a.id, quantity: 2 }, { variantId: b.id, quantity: 3 }] })
        .expect(201);
      expect(res.body.code).toMatch(CODE_RE);
      expect(res.body.totalVnd).toBe(2 * 45_000 + 3 * 30_000);
      expect(Object.keys(res.body).sort()).toEqual(['code', 'totalVnd']);
      expect(await stockOf(a.id)).toBe(8);
      expect(await stockOf(b.id)).toBe(2);

      const order = await prisma.order.findUniqueOrThrow({ where: { code: res.body.code }, include: { items: true } });
      expect(order).toMatchObject({ userId: null, status: 'PENDING', phone: '0901234567', totalVnd: 180_000, completedAt: null });
      expect(order.items).toHaveLength(2);
      expect(order.items.find((i) => i.variantId === a.id)).toMatchObject({
        productName: 'Gạo lứt đỏ',
        variantLabel: '1kg',
        unitPriceVnd: 45_000,
        quantity: 2,
        productId: a.productId,
      });

      // Snapshot survives later price/name changes.
      await prisma.variant.update({ where: { id: a.id }, data: { priceVnd: 99_000, label: '2kg' } });
      const again = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id, variantId: a.id } });
      expect(again).toMatchObject({ unitPriceVnd: 45_000, variantLabel: '1kg' });

      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith({
        type: 'ORDER_CREATED',
        code: res.body.code,
        fullName: form.fullName,
        phone: '0901234567',
        totalVnd: 180_000,
        lines: expect.arrayContaining([
          { name: 'Gạo lứt đỏ', variant: '1kg', quantity: 2 },
          { name: 'Mè rang', variant: '200g', quantity: 3 },
        ]),
      });
    });

    it('logged-in order: userId set, but name/phone/email come from the form', async () => {
      const v = await mkVariant();
      const res = await http()
        .post('/orders')
        .set(bearer(userToken))
        .send({ ...form, items: [{ variantId: v.id, quantity: 1 }] })
        .expect(201);
      const order = await prisma.order.findUniqueOrThrow({ where: { code: res.body.code } });
      expect(order).toMatchObject({ userId, fullName: form.fullName, phone: form.phone, email: form.email });
    });

    it('an invalid token is 401 even on the optional-auth route (no order, no stock change)', async () => {
      const v = await mkVariant({ stock: 3 });
      await http()
        .post('/orders')
        .set(bearer('garbage'))
        .send({ ...form, items: [{ variantId: v.id, quantity: 1 }] })
        .expect(401);
      expect(await stockOf(v.id)).toBe(3);
      expect(await prisma.order.count()).toBe(0);
    });

    it('the same variant twice is merged into one line', async () => {
      const v = await mkVariant({ price: 10_000, stock: 10 });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: v.id, quantity: 2 }, { variantId: v.id, quantity: 3 }] })
        .expect(201);
      expect(res.body.totalVnd).toBe(50_000);
      const items = await prisma.orderItem.findMany();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(5);
      expect(await stockOf(v.id)).toBe(5);
    });

    it('merged quantity above 99 is rejected with 400', async () => {
      const v = await mkVariant({ stock: 500 });
      await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: v.id, quantity: 60 }, { variantId: v.id, quantity: 40 }] })
        .expect(400);
      expect(await stockOf(v.id)).toBe(500);
    });

    it.each([
      ['0', 0],
      ['-1', -1],
      ['1.5', 1.5],
      ['100', 100],
      ['a string', '2'],
    ])('quantity %s -> 400, no stock change, no order', async (_label, quantity) => {
      const v = await mkVariant({ stock: 200 });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: v.id, quantity }] })
        .expect(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(await stockOf(v.id)).toBe(200);
      expect(await prisma.order.count()).toBe(0);
      expect(notify).not.toHaveBeenCalled();
    });

    it('empty or missing items -> 400', async () => {
      await http().post('/orders').send({ ...form, items: [] }).expect(400);
      await http().post('/orders').send({ ...form }).expect(400);
      expect(await prisma.order.count()).toBe(0);
    });

    it('invalid checkout fields -> 400 with per-field messages', async () => {
      const v = await mkVariant();
      const res = await http()
        .post('/orders')
        .send({ ...form, phone: '0123', email: 'nope', fullName: '', items: [{ variantId: v.id, quantity: 1 }] })
        .expect(400);
      expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(['phone', 'email', 'fullName']));
    });

    it('over-long addressDetail (301 chars) -> 400 on that field, no stock change, no order', async () => {
      const v = await mkVariant({ stock: 4 });
      const res = await http()
        .post('/orders')
        .send({ ...form, addressDetail: 'x'.repeat(301), items: [{ variantId: v.id, quantity: 1 }] })
        .expect(400);
      expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR', fields: { addressDetail: expect.any(String) } });
      expect(await stockOf(v.id)).toBe(4);
      expect(await prisma.order.count()).toBe(0);
    });

    it('bad ward (or ward of another province) -> 400, no stock change', async () => {
      const v = await mkVariant({ stock: 4 });
      const r1 = await http()
        .post('/orders')
        .send({ ...form, wardCode: '99999', items: [{ variantId: v.id, quantity: 1 }] })
        .expect(400);
      expect(r1.body).toMatchObject({ error: 'VALIDATION_ERROR', fields: { wardCode: expect.any(String) } });
      await http()
        .post('/orders')
        .send({ ...form, provinceCode: '04', items: [{ variantId: v.id, quantity: 1 }] })
        .expect(400);
      expect(await stockOf(v.id)).toBe(4);
      expect(await prisma.order.count()).toBe(0);
    });

    it('inactive variant -> 409 VARIANT_UNAVAILABLE, no stock change on any line', async () => {
      const ok = await mkVariant({ stock: 4 });
      const off = await mkVariant({ stock: 4, isActive: false });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: ok.id, quantity: 1 }, { variantId: off.id, quantity: 1 }] })
        .expect(409);
      expect(res.body.error).toBe('VARIANT_UNAVAILABLE');
      expect(await stockOf(ok.id)).toBe(4);
      expect(await stockOf(off.id)).toBe(4);
      expect(await prisma.order.count()).toBe(0);
    });

    it('active variant of an inactive product -> 409 VARIANT_UNAVAILABLE', async () => {
      const v = await mkVariant({ stock: 4, productActive: false });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: v.id, quantity: 1 }] })
        .expect(409);
      expect(res.body.error).toBe('VARIANT_UNAVAILABLE');
      expect(await stockOf(v.id)).toBe(4);
    });

    it('unknown variantId -> 404 VARIANT_NOT_FOUND, no stock change', async () => {
      const ok = await mkVariant({ stock: 4 });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: ok.id, quantity: 1 }, { variantId: 'does-not-exist', quantity: 1 }] })
        .expect(404);
      expect(res.body.error).toBe('VARIANT_NOT_FOUND');
      expect(await stockOf(ok.id)).toBe(4);
    });

    it('not enough stock -> 409 OUT_OF_STOCK and the whole order is rolled back', async () => {
      const a = await mkVariant({ stock: 10 });
      const b = await mkVariant({ stock: 1 });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: a.id, quantity: 2 }, { variantId: b.id, quantity: 2 }] })
        .expect(409);
      expect(res.body.error).toBe('OUT_OF_STOCK');
      expect(await stockOf(a.id)).toBe(10);
      expect(await stockOf(b.id)).toBe(1);
      expect(await prisma.order.count()).toBe(0);
      expect(await prisma.orderItem.count()).toBe(0);
      expect(notify).not.toHaveBeenCalled();
    });

    it('a notifier failure does not fail or roll back the order', async () => {
      notify.mockRejectedValueOnce(new Error('telegram down'));
      const v = await mkVariant({ stock: 3 });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: v.id, quantity: 1 }] })
        .expect(201);
      expect(await prisma.order.count({ where: { code: res.body.code } })).toBe(1);
      expect(await stockOf(v.id)).toBe(2);
      expect(notify).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrency (real parallel transactions against Postgres)', () => {
    it('stock 1, two simultaneous orders -> exactly one succeeds, the other 409 OUT_OF_STOCK, stock 0', async () => {
      const v = await mkVariant({ stock: 1 });
      const results = await Promise.allSettled([
        orders.create(input([{ variantId: v.id, quantity: 1 }])),
        orders.create(input([{ variantId: v.id, quantity: 1 }])),
      ]);
      const ok = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      const err = errorOf(failed[0].reason);
      expect(err.status).toBe(409);
      expect(err.body.error).toBe('OUT_OF_STOCK');
      expect(await stockOf(v.id)).toBe(0);
      expect(await prisma.order.count()).toBe(1);
      expect(await prisma.orderItem.count()).toBe(1);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it('stock 5, twenty simultaneous HTTP orders of 1 -> exactly 5 succeed, stock never negative', async () => {
      const v = await mkVariant({ stock: 5 });
      const responses = await Promise.all(
        Array.from({ length: 20 }, () =>
          http().post('/orders').send({ ...form, items: [{ variantId: v.id, quantity: 1 }] }),
        ),
      );
      const statuses = responses.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 201)).toHaveLength(5);
      expect(statuses.filter((s) => s === 409)).toHaveLength(15);
      expect(await stockOf(v.id)).toBe(0);
      expect(await prisma.order.count()).toBe(5);
      const codes = responses.filter((r) => r.status === 201).map((r) => r.body.code);
      expect(new Set(codes).size).toBe(5);
    });

    it('multi-line race: the losing order does not leave line 1 decremented', async () => {
      const a = await mkVariant({ stock: 5 });
      const b = await mkVariant({ stock: 1 });
      const results = await Promise.allSettled([
        orders.create(input([{ variantId: a.id, quantity: 1 }, { variantId: b.id, quantity: 1 }])),
        orders.create(input([{ variantId: a.id, quantity: 1 }, { variantId: b.id, quantity: 1 }])),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await stockOf(a.id)).toBe(4);
      expect(await stockOf(b.id)).toBe(0);
      expect(await prisma.orderItem.count()).toBe(2);
    });

    it('multi-line sequential: second order failing on line 2 leaves line 1 untouched', async () => {
      const a = await mkVariant({ stock: 10 });
      const b = await mkVariant({ stock: 1 });
      await orders.create(input([{ variantId: b.id, quantity: 1 }]));
      await expect(
        orders.create(input([{ variantId: a.id, quantity: 2 }, { variantId: b.id, quantity: 1 }])),
      ).rejects.toMatchObject({ status: 409 });
      expect(await stockOf(a.id)).toBe(10);
      expect(await stockOf(b.id)).toBe(0);
    });

    it('opposite line orders in parallel do not deadlock', async () => {
      const a = await mkVariant({ stock: 50 });
      const b = await mkVariant({ stock: 50 });
      const jobs = Array.from({ length: 10 }, (_, i) =>
        orders.create(
          input(
            i % 2 === 0
              ? [{ variantId: a.id, quantity: 1 }, { variantId: b.id, quantity: 1 }]
              : [{ variantId: b.id, quantity: 1 }, { variantId: a.id, quantity: 1 }],
          ),
        ),
      );
      const results = await Promise.allSettled(jobs);
      expect(results.filter((r) => r.status === 'rejected')).toEqual([]);
      expect(await stockOf(a.id)).toBe(40);
      expect(await stockOf(b.id)).toBe(40);
    });
  });

  describe('GET /me/orders', () => {
    it('lists only my orders, newest first, with items', async () => {
      const v = await mkVariant({ stock: 20, name: 'Trà gạo lứt', label: '250g' });
      const first = await http().post('/orders').set(bearer(userToken)).send({ ...form, items: [{ variantId: v.id, quantity: 1 }] }).expect(201);
      const second = await http().post('/orders').set(bearer(userToken)).send({ ...form, items: [{ variantId: v.id, quantity: 2 }] }).expect(201);
      await http().post('/orders').set(bearer(otherToken)).send({ ...form, items: [{ variantId: v.id, quantity: 1 }] }).expect(201);
      await http().post('/orders').send({ ...form, items: [{ variantId: v.id, quantity: 1 }] }).expect(201);

      const res = await http().get('/me/orders').set(bearer(userToken)).expect(200);
      expect(res.body.map((o: { code: string }) => o.code)).toEqual([second.body.code, first.body.code]);
      expect(res.body[0]).toMatchObject({ status: 'PENDING', totalVnd: second.body.totalVnd });
      expect(res.body[0].items).toEqual([
        expect.objectContaining({ productName: 'Trà gạo lứt', variantLabel: '250g', quantity: 2 }),
      ]);

      const other = await http().get('/me/orders').set(bearer(otherToken)).expect(200);
      expect(other.body).toHaveLength(1);
    });

    it('without a token -> 401', async () => {
      await http().get('/me/orders').expect(401);
    });
  });

  describe('GET /orders/lookup', () => {
    it('finds the order by code + phone (any phone format); wrong phone and unknown code are the same 404', async () => {
      const v = await mkVariant();
      const { code } = (await http().post('/orders').send({ ...form, items: [{ variantId: v.id, quantity: 1 }] }).expect(201)).body;

      const ok = await http().get('/orders/lookup').query({ code, phone: '+84 901-234-567' }).expect(200);
      expect(ok.body).toMatchObject({ code, status: 'PENDING', totalVnd: 50_000 });
      expect(ok.body.items).toHaveLength(1);

      const wrongPhone = await http().get('/orders/lookup').query({ code, phone: '0987654321' }).expect(404);
      const unknown = await http().get('/orders/lookup').query({ code: 'HLAAAAAAAA', phone: form.phone }).expect(404);
      expect(wrongPhone.body).toEqual(unknown.body);
    });

    it('6th lookup within a minute from one IP -> 429', async () => {
      for (let i = 0; i < 5; i++) {
        await http().get('/orders/lookup').query({ code: 'HLAAAAAAAA', phone: form.phone }).expect(404);
      }
      const res = await http().get('/orders/lookup').query({ code: 'HLAAAAAAAA', phone: form.phone }).expect(429);
      expect(res.body).toMatchObject({ statusCode: 429, error: 'TOO_MANY_REQUESTS' });
      // Other routes keep the global limit.
      await http().get('/health').expect(200);
    });
  });

  describe('admin', () => {
    const placeOrder = async (stock = 10, quantity = 3) => {
      const v = await mkVariant({ stock });
      const res = await http().post('/orders').send({ ...form, items: [{ variantId: v.id, quantity }] }).expect(201);
      const order = await prisma.order.findUniqueOrThrow({ where: { code: res.body.code } });
      return { v, order };
    };
    const setStatus = (id: string, status: string) =>
      http().patch(`/admin/orders/${id}/status`).set(bearer(adminToken)).send({ status });

    it('admin routes: 401 without token, 403 for a normal user', async () => {
      const { order } = await placeOrder();
      await http().get('/admin/orders').expect(401);
      await http().get(`/admin/orders/${order.id}`).expect(401);
      await http().patch(`/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' }).expect(401);
      await http().get('/admin/orders').set(bearer(userToken)).expect(403);
      await http().get(`/admin/orders/${order.id}`).set(bearer(userToken)).expect(403);
      await http().patch(`/admin/orders/${order.id}/status`).set(bearer(userToken)).send({ status: 'CONFIRMED' }).expect(403);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');
    });

    it('lists newest first, filters by status, shows detail; unknown id 404; bad status filter 400', async () => {
      const { order: o1 } = await placeOrder();
      const { order: o2 } = await placeOrder();
      await setStatus(o1.id, 'CONFIRMED').expect(200);

      const all = await http().get('/admin/orders').set(bearer(adminToken)).expect(200);
      expect(all.body.map((o: { id: string }) => o.id)).toEqual([o2.id, o1.id]);
      const confirmed = await http().get('/admin/orders').query({ status: 'CONFIRMED' }).set(bearer(adminToken)).expect(200);
      expect(confirmed.body.map((o: { id: string }) => o.id)).toEqual([o1.id]);
      await http().get('/admin/orders').query({ status: 'NOPE' }).set(bearer(adminToken)).expect(400);

      const detail = await http().get(`/admin/orders/${o1.id}`).set(bearer(adminToken)).expect(200);
      expect(detail.body).toMatchObject({ id: o1.id, code: o1.code, status: 'CONFIRMED', email: form.email, addressDetail: form.addressDetail });
      expect(detail.body.items).toHaveLength(1);
      await http().get('/admin/orders/nope').set(bearer(adminToken)).expect(404);
    });

    it('PENDING -> COMPLETED is an invalid transition (409); unknown status value 400; unknown order 404', async () => {
      const { order } = await placeOrder();
      const res = await setStatus(order.id, 'COMPLETED').expect(409);
      expect(res.body.error).toBe('INVALID_TRANSITION');
      await setStatus(order.id, 'PENDING').expect(409);
      await setStatus(order.id, 'LOST').expect(400);
      await setStatus('nope', 'CONFIRMED').expect(404);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');
    });

    it('full lifecycle: COMPLETED sets completedAt; nothing after COMPLETED', async () => {
      const { v, order } = await placeOrder(10, 3);
      await setStatus(order.id, 'CONFIRMED').expect(200);
      await setStatus(order.id, 'SHIPPING').expect(200);
      const done = await setStatus(order.id, 'COMPLETED').expect(200);
      expect(done.body.status).toBe('COMPLETED');
      const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(row.completedAt).toBeInstanceOf(Date);
      await setStatus(order.id, 'CANCELLED').expect(409);
      expect(await stockOf(v.id)).toBe(7);
    });

    it('cancel restores stock exactly once; a second cancel is 409', async () => {
      const { v, order } = await placeOrder(10, 3);
      expect(await stockOf(v.id)).toBe(7);
      await setStatus(order.id, 'CANCELLED').expect(200);
      expect(await stockOf(v.id)).toBe(10);
      const again = await setStatus(order.id, 'CANCELLED').expect(409);
      expect(again.body.error).toBe('INVALID_TRANSITION');
      expect(await stockOf(v.id)).toBe(10);
    });

    it('two simultaneous cancels: one 200, one 409, stock restored exactly once', async () => {
      const { v, order } = await placeOrder(10, 3);
      const [r1, r2] = await Promise.all([setStatus(order.id, 'CANCELLED'), setStatus(order.id, 'CANCELLED')]);
      expect([r1.status, r2.status].sort()).toEqual([200, 409]);
      expect(await stockOf(v.id)).toBe(10);
    });

    it('cancelling a multi-line shipping order restores every line', async () => {
      const a = await mkVariant({ stock: 10 });
      const b = await mkVariant({ stock: 10 });
      const res = await http()
        .post('/orders')
        .send({ ...form, items: [{ variantId: a.id, quantity: 4 }, { variantId: b.id, quantity: 6 }] })
        .expect(201);
      const order = await prisma.order.findUniqueOrThrow({ where: { code: res.body.code } });
      await setStatus(order.id, 'CONFIRMED').expect(200);
      await setStatus(order.id, 'SHIPPING').expect(200);
      await setStatus(order.id, 'CANCELLED').expect(200);
      expect(await stockOf(a.id)).toBe(10);
      expect(await stockOf(b.id)).toBe(10);
    });
  });
});
