import type { INestApplication } from '@nestjs/common';
import { PrismaClient, type OrderStatus } from '@prisma/client';
import request from 'supertest';
import { ADMIN_EMAIL, seedAdmin } from '../prisma/seed';
import { NOTIFIER, type NotificationEvent } from '../src/notifications/notifier';
import { createTestApp, resetDb, resetThrottle } from './helpers';

const ADMIN_PASSWORD = 'AdminPass123!';

describe('Returns (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
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

  const mkVariant = async (stock = 10, name?: string) => {
    seq++;
    const p = await prisma.product.create({
      data: {
        name: name ?? `Sản phẩm ${seq}`,
        slug: `san-pham-${seq}`,
        categoryId,
        description: 'mô tả',
        origin: 'Việt Nam',
        benefits: 'tốt',
        images: [],
        variants: { create: [{ label: '500g', priceVnd: 50_000, stock }] },
      },
      include: { variants: true },
    });
    return p.variants[0];
  };

  /** Order fixture created directly with Prisma (stock is not touched: it was already sold). */
  const mkOrder = async (opts: { userId?: string | null; status?: OrderStatus; lines: { variantId: string; quantity: number }[] }) => {
    seq++;
    const variants = await prisma.variant.findMany({
      where: { id: { in: opts.lines.map((l) => l.variantId) } },
      include: { product: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));
    const status = opts.status ?? 'COMPLETED';
    return prisma.order.create({
      data: {
        code: `HLTEST${String(seq).padStart(4, '0')}`,
        userId: opts.userId === undefined ? userId : opts.userId,
        status,
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'a@example.com',
        provinceCode: '01',
        wardCode: '00004',
        addressDetail: '12 Hàng Bông',
        totalVnd: opts.lines.reduce((s, l) => s + 50_000 * l.quantity, 0),
        completedAt: status === 'COMPLETED' ? new Date() : null,
        items: {
          create: opts.lines.map((l) => {
            const v = byId.get(l.variantId)!;
            return {
              productId: v.productId,
              variantId: v.id,
              productName: v.product.name,
              variantLabel: v.label,
              unitPriceVnd: v.priceVnd,
              quantity: l.quantity,
            };
          }),
        },
      },
      include: { items: { orderBy: { id: 'asc' } } },
    });
  };
  const stockOf = async (id: string) => (await prisma.variant.findUniqueOrThrow({ where: { id } })).stock;
  const requestReturn = (code: string, items: unknown[], token = userToken, note?: string) =>
    http()
      .post(`/me/orders/${code}/returns`)
      .set(bearer(token))
      .send(note === undefined ? { items } : { items, note });
  const decide = (id: string, body: Record<string, unknown>, token = adminToken) =>
    http().patch(`/admin/returns/${id}/decision`).set(bearer(token)).send(body);
  const adminCreate = (body: Record<string, unknown>, token = adminToken) =>
    http().post('/admin/returns').set(bearer(token)).send(body);

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await createTestApp((b) => b.overrideProvider(NOTIFIER).useValue({ notify }));
    await app.listen(0, '127.0.0.1');
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

  describe('POST /me/orders/:code/returns', () => {
    it('creates a REQUESTED CUSTOMER return (restock false), stock untouched, notifier called once', async () => {
      const v = await mkVariant(5);
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 3 }] });
      const res = await requestReturn(order.code, [{ orderItemId: order.items[0].id, quantity: 2, reason: 'DAMAGED' }], userToken, 'Túi bị rách')
        .expect(201);
      expect(res.body).toMatchObject({ status: 'REQUESTED', source: 'CUSTOMER', orderId: order.id, note: 'Túi bị rách' });
      const row = await prisma.returnRequest.findUniqueOrThrow({ where: { id: res.body.id }, include: { items: true } });
      expect(row).toMatchObject({ status: 'REQUESTED', source: 'CUSTOMER' });
      expect(row.items).toEqual([
        expect.objectContaining({ orderItemId: order.items[0].id, quantity: 2, reason: 'DAMAGED', restock: false }),
      ]);
      expect(await stockOf(v.id)).toBe(5);
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith({
        type: 'RETURN_REQUESTED',
        orderCode: order.code,
        returnId: res.body.id,
        fullName: 'Nguyễn Văn A',
        itemCount: 1,
      });
    });

    it('a notifier rejection still gives 201 and keeps the return', async () => {
      notify.mockRejectedValueOnce(new Error('telegram down'));
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 1 }] });
      const res = await requestReturn(order.code, [{ orderItemId: order.items[0].id, quantity: 1, reason: 'OTHER' }]).expect(201);
      expect(await prisma.returnRequest.count({ where: { id: res.body.id } })).toBe(1);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it('order code is case-insensitive', async () => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 1 }] });
      await requestReturn(order.code.toLowerCase(), [{ orderItemId: order.items[0].id, quantity: 1, reason: 'OTHER' }]).expect(201);
    });

    it.each(['PENDING', 'CONFIRMED', 'SHIPPING', 'CANCELLED'] as const)('%s order -> 400 ORDER_NOT_COMPLETED', async (status) => {
      const v = await mkVariant();
      const order = await mkOrder({ status, lines: [{ variantId: v.id, quantity: 1 }] });
      const res = await requestReturn(order.code, [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' }]).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'ORDER_NOT_COMPLETED' });
      expect(await prisma.returnRequest.count()).toBe(0);
      expect(notify).not.toHaveBeenCalled();
    });

    it("another user's order, a guest order and an unknown code -> 404", async () => {
      const v = await mkVariant();
      const mine = await mkOrder({ lines: [{ variantId: v.id, quantity: 1 }] });
      const guest = await mkOrder({ userId: null, lines: [{ variantId: v.id, quantity: 1 }] });
      const r1 = await requestReturn(mine.code, [{ orderItemId: mine.items[0].id, quantity: 1, reason: 'DAMAGED' }], otherToken).expect(404);
      const r2 = await requestReturn(guest.code, [{ orderItemId: guest.items[0].id, quantity: 1, reason: 'DAMAGED' }]).expect(404);
      const r3 = await requestReturn('HLNOPE0000', [{ orderItemId: mine.items[0].id, quantity: 1, reason: 'DAMAGED' }]).expect(404);
      expect(r1.body).toMatchObject({ statusCode: 404, error: 'ORDER_NOT_FOUND' });
      expect(r2.body).toEqual(r1.body);
      expect(r3.body).toEqual(r1.body);
      expect(await prisma.returnRequest.count()).toBe(0);
    });

    it('no token -> 401', async () => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 1 }] });
      await http()
        .post(`/me/orders/${order.code}/returns`)
        .send({ items: [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' }] })
        .expect(401);
    });

    it('quantity above the ordered quantity -> 400 RETURN_QUANTITY_EXCEEDED', async () => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 2 }] });
      const res = await requestReturn(order.code, [{ orderItemId: order.items[0].id, quantity: 3, reason: 'DAMAGED' }]).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'RETURN_QUANTITY_EXCEEDED' });
      expect(await prisma.returnRequest.count()).toBe(0);
    });

    it('over-quantity after an earlier REQUESTED and an earlier APPROVED return; a REJECTED one frees it again', async () => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 3 }] });
      const itemId = order.items[0].id;
      const first = await requestReturn(order.code, [{ orderItemId: itemId, quantity: 2, reason: 'DAMAGED' }]).expect(201);
      // 2 of 3 pending -> only 1 left.
      const over = await requestReturn(order.code, [{ orderItemId: itemId, quantity: 2, reason: 'DAMAGED' }]).expect(400);
      expect(over.body.error).toBe('RETURN_QUANTITY_EXCEEDED');

      await decide(first.body.id, { decision: 'APPROVED' }).expect(200);
      // Still 2 of 3 used after approval.
      await requestReturn(order.code, [{ orderItemId: itemId, quantity: 2, reason: 'DAMAGED' }]).expect(400);
      const last = await requestReturn(order.code, [{ orderItemId: itemId, quantity: 1, reason: 'WRONG_ITEM' }]).expect(201);
      await requestReturn(order.code, [{ orderItemId: itemId, quantity: 1, reason: 'DAMAGED' }]).expect(400);

      // Rejecting the last one frees its unit again.
      await decide(last.body.id, { decision: 'REJECTED' }).expect(200);
      await requestReturn(order.code, [{ orderItemId: itemId, quantity: 1, reason: 'CHANGED_MIND' }]).expect(201);
    });

    it('an admin-created return counts towards the limit too', async () => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 2 }] });
      await adminCreate({ orderCode: order.code, items: [{ orderItemId: order.items[0].id, quantity: 2, reason: 'DAMAGED', restock: false }] }).expect(201);
      const res = await requestReturn(order.code, [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' }]).expect(400);
      expect(res.body.error).toBe('RETURN_QUANTITY_EXCEEDED');
    });

    it('orderItemId from another order -> 400, nothing created', async () => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 2 }] });
      const other = await mkOrder({ lines: [{ variantId: v.id, quantity: 2 }] });
      const res = await requestReturn(order.code, [
        { orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' },
        { orderItemId: other.items[0].id, quantity: 1, reason: 'DAMAGED' },
      ]).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'ORDER_ITEM_NOT_IN_ORDER' });
      expect(await prisma.returnRequest.count()).toBe(0);
      expect(await prisma.returnItem.count()).toBe(0);
    });

    it.each([
      ['no items', { items: [] }],
      ['missing items', {}],
      ['quantity 0', { items: [{ orderItemId: 'x', quantity: 0, reason: 'DAMAGED' }] }],
      ['quantity 1.5', { items: [{ orderItemId: 'x', quantity: 1.5, reason: 'DAMAGED' }] }],
      ['unknown reason', { items: [{ orderItemId: 'x', quantity: 1, reason: 'BORED' }] }],
      ['note over 500 chars', { items: [{ orderItemId: 'x', quantity: 1, reason: 'DAMAGED' }], note: 'x'.repeat(501) }],
      ['51 items', { items: Array.from({ length: 51 }, (_, i) => ({ orderItemId: `x${i}`, quantity: 1, reason: 'DAMAGED' })) }],
      ['duplicate orderItemId', { items: [{ orderItemId: 'x', quantity: 1, reason: 'DAMAGED' }, { orderItemId: 'x', quantity: 1, reason: 'OTHER' }] }],
    ])('%s -> 400 VALIDATION_ERROR', async (_label, body) => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 2 }] });
      const res = await http().post(`/me/orders/${order.code}/returns`).set(bearer(userToken)).send(body).expect(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(await prisma.returnRequest.count()).toBe(0);
    });

    it('two parallel customer requests for the last unit -> exactly one 201', async () => {
      const v = await mkVariant();
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 1 }] });
      const item = [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' }];
      const results = await Promise.all([requestReturn(order.code, item), requestReturn(order.code, item)]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
      expect(results.find((r) => r.status === 400)!.body.error).toBe('RETURN_QUANTITY_EXCEEDED');
      expect(await prisma.returnItem.count()).toBe(1);
      expect(notify).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /admin/returns/:id/decision', () => {
    const setup = async () => {
      const a = await mkVariant(10);
      const b = await mkVariant(10);
      const order = await mkOrder({ lines: [{ variantId: a.id, quantity: 3 }, { variantId: b.id, quantity: 2 }] });
      const itemA = order.items.find((i) => i.variantId === a.id)!;
      const itemB = order.items.find((i) => i.variantId === b.id)!;
      const res = await requestReturn(order.code, [
        { orderItemId: itemA.id, quantity: 2, reason: 'DAMAGED' },
        { orderItemId: itemB.id, quantity: 1, reason: 'WRONG_ITEM' },
      ]).expect(201);
      const ret = await prisma.returnRequest.findUniqueOrThrow({ where: { id: res.body.id }, include: { items: true } });
      const riA = ret.items.find((i) => i.orderItemId === itemA.id)!;
      const riB = ret.items.find((i) => i.orderItemId === itemB.id)!;
      return { a, b, order, ret, riA, riB };
    };

    it('approve with restock raises stock by exactly the returned quantity, only for the chosen items', async () => {
      const { a, b, ret, riA, riB } = await setup();
      const res = await decide(ret.id, { decision: 'APPROVED', restockItemIds: [riA.id] }).expect(200);
      expect(res.body.status).toBe('APPROVED');
      expect(await stockOf(a.id)).toBe(12);
      expect(await stockOf(b.id)).toBe(10);
      expect((await prisma.returnItem.findUniqueOrThrow({ where: { id: riA.id } })).restock).toBe(true);
      expect((await prisma.returnItem.findUniqueOrThrow({ where: { id: riB.id } })).restock).toBe(false);
    });

    it('approve without restock leaves stock unchanged', async () => {
      const { a, b, ret } = await setup();
      await decide(ret.id, { decision: 'APPROVED' }).expect(200);
      expect(await stockOf(a.id)).toBe(10);
      expect(await stockOf(b.id)).toBe(10);
      expect((await prisma.returnRequest.findUniqueOrThrow({ where: { id: ret.id } })).status).toBe('APPROVED');
    });

    it('reject then approve -> 409 ALREADY_DECIDED, stock unchanged', async () => {
      const { a, b, ret, riA, riB } = await setup();
      const r = await decide(ret.id, { decision: 'REJECTED' }).expect(200);
      expect(r.body.status).toBe('REJECTED');
      const again = await decide(ret.id, { decision: 'APPROVED', restockItemIds: [riA.id, riB.id] }).expect(409);
      expect(again.body).toMatchObject({ statusCode: 409, error: 'ALREADY_DECIDED' });
      expect(await stockOf(a.id)).toBe(10);
      expect(await stockOf(b.id)).toBe(10);
      expect((await prisma.returnRequest.findUniqueOrThrow({ where: { id: ret.id } })).status).toBe('REJECTED');
    });

    it('approving twice -> 409', async () => {
      const { a, ret, riA } = await setup();
      await decide(ret.id, { decision: 'APPROVED', restockItemIds: [riA.id] }).expect(200);
      await decide(ret.id, { decision: 'APPROVED', restockItemIds: [riA.id] }).expect(409);
      expect(await stockOf(a.id)).toBe(12);
    });

    it('two parallel approvals with restock -> one 200, one 409, stock restored once', async () => {
      const { a, b, ret, riA, riB } = await setup();
      const body = { decision: 'APPROVED', restockItemIds: [riA.id, riB.id] };
      const [r1, r2] = await Promise.all([decide(ret.id, body), decide(ret.id, body)]);
      expect([r1.status, r2.status].sort()).toEqual([200, 409]);
      expect(await stockOf(a.id)).toBe(12);
      expect(await stockOf(b.id)).toBe(11);
    });

    it('restockItemIds not belonging to this return -> 400, nothing changes', async () => {
      const { a, ret, riA } = await setup();
      const { ret: other } = await setup();
      const res = await decide(ret.id, { decision: 'APPROVED', restockItemIds: [riA.id, other.items[0].id] }).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'RETURN_ITEM_NOT_IN_RETURN' });
      expect(await stockOf(a.id)).toBe(10);
      expect((await prisma.returnRequest.findUniqueOrThrow({ where: { id: ret.id } })).status).toBe('REQUESTED');
    });

    it('bad decision value -> 400; unknown return -> 404', async () => {
      const { ret } = await setup();
      await decide(ret.id, { decision: 'MAYBE' }).expect(400);
      const res = await decide('nope', { decision: 'APPROVED' }).expect(404);
      expect(res.body.error).toBe('RETURN_NOT_FOUND');
    });
  });

  describe('POST /admin/returns', () => {
    it('creates an APPROVED ADMIN return and restocks only items with restock: true (guest order allowed)', async () => {
      const a = await mkVariant(10);
      const b = await mkVariant(10);
      const order = await mkOrder({ userId: null, lines: [{ variantId: a.id, quantity: 3 }, { variantId: b.id, quantity: 3 }] });
      const itemA = order.items.find((i) => i.variantId === a.id)!;
      const itemB = order.items.find((i) => i.variantId === b.id)!;
      const res = await adminCreate({
        orderCode: order.code,
        note: 'Khách nhắn Zalo',
        items: [
          { orderItemId: itemA.id, quantity: 2, reason: 'DAMAGED', restock: true },
          { orderItemId: itemB.id, quantity: 1, reason: 'CHANGED_MIND', restock: false },
        ],
      }).expect(201);
      expect(res.body).toMatchObject({ status: 'APPROVED', source: 'ADMIN', orderId: order.id, note: 'Khách nhắn Zalo' });
      expect(await stockOf(a.id)).toBe(12);
      expect(await stockOf(b.id)).toBe(10);
      const items = await prisma.returnItem.findMany({ where: { returnId: res.body.id } });
      expect(items.find((i) => i.orderItemId === itemA.id)).toMatchObject({ quantity: 2, restock: true });
      expect(items.find((i) => i.orderItemId === itemB.id)).toMatchObject({ quantity: 1, restock: false });
      expect(notify).not.toHaveBeenCalled();
    });

    it('same rules: non-completed 400, over-quantity 400 (no stock change), item of another order 400, unknown code 404', async () => {
      const v = await mkVariant(10);
      const shipping = await mkOrder({ status: 'SHIPPING', lines: [{ variantId: v.id, quantity: 2 }] });
      const done = await mkOrder({ lines: [{ variantId: v.id, quantity: 2 }] });
      const r1 = await adminCreate({ orderCode: shipping.code, items: [{ orderItemId: shipping.items[0].id, quantity: 1, reason: 'DAMAGED', restock: true }] }).expect(400);
      expect(r1.body.error).toBe('ORDER_NOT_COMPLETED');
      const r2 = await adminCreate({ orderCode: done.code, items: [{ orderItemId: done.items[0].id, quantity: 3, reason: 'DAMAGED', restock: true }] }).expect(400);
      expect(r2.body.error).toBe('RETURN_QUANTITY_EXCEEDED');
      const r3 = await adminCreate({ orderCode: done.code, items: [{ orderItemId: shipping.items[0].id, quantity: 1, reason: 'DAMAGED', restock: true }] }).expect(400);
      expect(r3.body.error).toBe('ORDER_ITEM_NOT_IN_ORDER');
      const r4 = await adminCreate({ orderCode: 'HLNOPE0000', items: [{ orderItemId: done.items[0].id, quantity: 1, reason: 'DAMAGED', restock: true }] }).expect(404);
      expect(r4.body.error).toBe('ORDER_NOT_FOUND');
      await adminCreate({ orderCode: done.code, items: [{ orderItemId: done.items[0].id, quantity: 1, reason: 'DAMAGED' }] }).expect(400);
      expect(await stockOf(v.id)).toBe(10);
      expect(await prisma.returnRequest.count()).toBe(0);
    });
  });

  describe('GET /admin/returns', () => {
    it('lists newest first with items, order code, customer name and product names; filters by status', async () => {
      const v = await mkVariant(10, 'Gạo lứt đỏ');
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 5 }] });
      const r1 = await requestReturn(order.code, [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' }]).expect(201);
      const r2 = await adminCreate({ orderCode: order.code, items: [{ orderItemId: order.items[0].id, quantity: 1, reason: 'OTHER', restock: false }] }).expect(201);

      const all = await http().get('/admin/returns').set(bearer(adminToken)).expect(200);
      expect(all.body.map((r: { id: string }) => r.id)).toEqual([r2.body.id, r1.body.id]);
      expect(all.body[1]).toMatchObject({
        status: 'REQUESTED',
        source: 'CUSTOMER',
        order: { code: order.code, fullName: 'Nguyễn Văn A' },
      });
      expect(all.body[1].items).toEqual([
        expect.objectContaining({ quantity: 1, reason: 'DAMAGED', orderItem: expect.objectContaining({ productName: 'Gạo lứt đỏ', variantLabel: '500g' }) }),
      ]);

      const requested = await http().get('/admin/returns').query({ status: 'REQUESTED' }).set(bearer(adminToken)).expect(200);
      expect(requested.body.map((r: { id: string }) => r.id)).toEqual([r1.body.id]);
      await http().get('/admin/returns').query({ status: 'NOPE' }).set(bearer(adminToken)).expect(400);
    });

    it('admin routes: 401 without token, 403 for a normal user', async () => {
      const v = await mkVariant(10);
      const order = await mkOrder({ lines: [{ variantId: v.id, quantity: 2 }] });
      const r = await requestReturn(order.code, [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED' }]).expect(201);
      const createBody = { orderCode: order.code, items: [{ orderItemId: order.items[0].id, quantity: 1, reason: 'DAMAGED', restock: true }] };
      await http().get('/admin/returns').expect(401);
      await http().post('/admin/returns').send(createBody).expect(401);
      await http().patch(`/admin/returns/${r.body.id}/decision`).send({ decision: 'APPROVED' }).expect(401);
      await http().get('/admin/returns').set(bearer(userToken)).expect(403);
      await adminCreate(createBody, userToken).expect(403);
      await decide(r.body.id, { decision: 'APPROVED', restockItemIds: [] }, userToken).expect(403);
      expect(await prisma.returnRequest.count()).toBe(1);
      expect((await prisma.returnRequest.findUniqueOrThrow({ where: { id: r.body.id } })).status).toBe('REQUESTED');
      expect(await stockOf(v.id)).toBe(10);
    });
  });
});
