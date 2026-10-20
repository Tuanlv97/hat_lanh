import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { ADMIN_EMAIL, seedAdmin } from '../prisma/seed';
import { createTestApp, resetDb } from './helpers';

const ADMIN_PASSWORD = 'AdminPass123!';
// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Catalog + uploads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let categoryId: string;
  const http = () => request(app.getHttpServer());
  const admin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const prevAdminPassword = process.env.ADMIN_PASSWORD;

  const mkProduct = async (
    name: string,
    slug: string,
    opts: { isActive?: boolean; variants?: { label: string; isActive?: boolean }[] } = {},
  ) =>
    prisma.product.create({
      data: {
        name,
        slug,
        categoryId,
        description: 'mô tả',
        origin: 'Việt Nam',
        benefits: 'tốt',
        images: ['/uploads/a.png'],
        isActive: opts.isActive ?? true,
        variants: {
          create: (opts.variants ?? [{ label: '500g' }]).map((v) => ({
            label: v.label,
            priceVnd: 50000,
            stock: 5,
            isActive: v.isActive ?? true,
          })),
        },
      },
      include: { variants: true },
    });

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prisma);
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

  describe('public', () => {
    it('GET /categories', async () => {
      const res = await http().get('/categories').expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('slug');
    });

    it('q="gao lut" finds "Gạo lứt đỏ"; other products excluded', async () => {
      await mkProduct('Gạo lứt đỏ', 'gao-lut-do');
      await mkProduct('Nấm hương', 'nam-huong');
      const res = await http().get('/products').query({ q: 'gao lut' }).expect(200);
      expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Gạo lứt đỏ']);
    });

    it('filters by category slug', async () => {
      await mkProduct('Gạo lứt đỏ', 'gao-lut-do');
      const cat = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
      expect((await http().get('/products').query({ category: cat.slug }).expect(200)).body).toHaveLength(1);
      expect((await http().get('/products').query({ category: 'khong-co' }).expect(200)).body).toHaveLength(0);
    });

    it('hidden product absent from list and 404 on detail', async () => {
      await mkProduct('Ẩn', 'an', { isActive: false });
      expect((await http().get('/products').expect(200)).body).toHaveLength(0);
      await http().get('/products/an').expect(404);
    });

    it('product without an active variant is absent from the list', async () => {
      await mkProduct('Hết', 'het', { variants: [{ label: '1kg', isActive: false }] });
      expect((await http().get('/products').expect(200)).body).toHaveLength(0);
    });

    it('detail: active variants, avg rating, visible reviews only', async () => {
      const p = await mkProduct('Gạo lứt đỏ', 'gao-lut-do', {
        variants: [{ label: '500g' }, { label: '1kg', isActive: false }],
      });
      const u = await prisma.user.findFirstOrThrow({ where: { email: 'u@x.com' } });
      const u2 = await prisma.user.create({ data: { name: 'B', email: 'b@x.com' } });
      await prisma.review.create({ data: { userId: u.id, productId: p.id, rating: 4, content: 'ngon', status: 'VISIBLE' } });
      await prisma.review.create({ data: { userId: u2.id, productId: p.id, rating: 1, content: 'spam', status: 'HIDDEN' } });
      const res = await http().get('/products/gao-lut-do').expect(200);
      expect(res.body.variants).toHaveLength(1);
      expect(res.body).toMatchObject({
        origin: 'Việt Nam',
        benefits: 'tốt',
        images: ['/uploads/a.png'],
        averageRating: 4,
        reviewCount: 1,
      });
      expect(res.body.reviews).toHaveLength(1);
      expect(res.body.reviews[0]).toMatchObject({ rating: 4, content: 'ngon' });
      expect(JSON.stringify(res.body)).not.toContain('b@x.com');
      expect(JSON.stringify(res.body)).not.toContain('u@x.com');
    });
  });

  describe('admin', () => {
    it('401 without token, 403 for USER', async () => {
      await http().get('/admin/products').expect(401);
      await http().post('/admin/products').send({}).expect(401);
      await http().get('/admin/products').set('Authorization', `Bearer ${userToken}`).expect(403);
      await http().post('/admin/uploads').set('Authorization', `Bearer ${userToken}`).expect(403);
      await http().delete('/admin/variants/x').set('Authorization', `Bearer ${userToken}`).expect(403);
    });

    const body = () => ({
      name: 'Đậu hũ non',
      categoryId,
      description: 'd',
      origin: 'VN',
      benefits: 'b',
      images: [],
      variants: [{ label: '300g', priceVnd: 20000, stock: 10 }],
    });

    it('creates with generated slug, 409 SLUG_TAKEN on duplicate', async () => {
      const res = await admin(http().post('/admin/products').send(body())).expect(201);
      expect(res.body.slug).toBe('dau-hu-non');
      expect(res.body.variants).toHaveLength(1);
      const dup = await admin(http().post('/admin/products').send(body())).expect(409);
      expect(dup.body.error).toBe('SLUG_TAKEN');
    });

    it('patch, hide, list incl. hidden, variants CRUD', async () => {
      const p = (await admin(http().post('/admin/products').send(body())).expect(201)).body;
      await admin(http().patch(`/admin/products/${p.id}`).send({ name: 'Đậu hũ già' })).expect(200);
      const v = (
        await admin(
          http().post(`/admin/products/${p.id}/variants`).send({ label: '600g', priceVnd: 35000, stock: 0, isActive: true }),
        ).expect(201)
      ).body;
      expect(v).toMatchObject({ label: '600g', priceVnd: 35000 });
      await admin(http().patch(`/admin/variants/${v.id}`).send({ stock: 7, isActive: false })).expect(200);
      await admin(http().patch(`/admin/products/${p.id}/hide`)).expect(200);
      const list = await admin(http().get('/admin/products')).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({ name: 'Đậu hũ già', isActive: false });
      expect(list.body[0].variants).toHaveLength(2);
      await http().get(`/products/${p.slug}`).expect(404);
      await admin(http().delete(`/admin/variants/${v.id}`)).expect(200);
    });

    it('priceVnd non-integer / negative / stock negative -> 400', async () => {
      const p = await mkProduct('X', 'x');
      for (const bad of [
        { priceVnd: 10.5, stock: 1 },
        { priceVnd: -5, stock: 1 },
        { priceVnd: 0, stock: 1 },
        { priceVnd: 100, stock: -1 },
      ]) {
        const res = await admin(http().post(`/admin/products/${p.id}/variants`).send({ label: 'Z', ...bad })).expect(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      }
      await admin(http().patch(`/admin/variants/${p.variants[0].id}`).send({ priceVnd: 1.5 })).expect(400);
    });

    it('DELETE of an ordered variant -> 409 VARIANT_HAS_ORDERS', async () => {
      const p = await mkProduct('X', 'x');
      const variant = p.variants[0];
      const order = await prisma.order.create({
        data: {
          code: 'HL-1',
          fullName: 'A',
          phone: '0900000000',
          email: 'a@x.com',
          provinceCode: '01',
          wardCode: '00001',
          addressDetail: 'a',
          totalVnd: 50000,
        },
      });
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: p.id,
          variantId: variant.id,
          productName: 'X',
          variantLabel: '500g',
          unitPriceVnd: 50000,
          quantity: 1,
        },
      });
      const res = await admin(http().delete(`/admin/variants/${variant.id}`)).expect(409);
      expect(res.body.error).toBe('VARIANT_HAS_ORDERS');
    });
  });

  describe('uploads', () => {
    it('rejects .exe, and text renamed .png', async () => {
      await admin(http().post('/admin/uploads').attach('file', Buffer.from('MZ binary'), 'evil.exe')).expect(400);
      await admin(
        http().post('/admin/uploads').attach('file', Buffer.from('hello text'), { filename: 'fake.png', contentType: 'image/png' }),
      ).expect(400);
    });
    it('rejects missing file and >5MB', async () => {
      await admin(http().post('/admin/uploads')).expect(400);
      const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10)]);
      await admin(http().post('/admin/uploads').attach('file', big, { filename: 'big.png', contentType: 'image/png' })).expect(400);
    });
    it('accepts a valid png and serves it', async () => {
      const res = await admin(
        http().post('/admin/uploads').attach('file', PNG, { filename: '../../x.png', contentType: 'image/png' }),
      ).expect(200);
      expect(res.body.url).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);
      const file = await http().get(res.body.url).expect(200);
      expect(file.headers['content-type']).toContain('image/png');
      fs.rmSync(path.join(__dirname, '..', 'uploads', path.basename(res.body.url)), { force: true });
    });
  });
});
