import { useModerationSuite } from './moderation-setup';

describe('Reviews (e2e)', () => {
  const t = useModerationSuite();

  const mkProduct = async () => {
    t.seq++;
    const categoryId = (await t.prisma.category.findFirstOrThrow()).id;
    return t.prisma.product.create({
      data: {
        name: `Sản phẩm ${t.seq}`,
        slug: `san-pham-${t.seq}`,
        categoryId,
        description: 'mô tả',
        origin: 'VN',
        benefits: 'tốt',
        images: [],
        variants: { create: [{ label: '500g', priceVnd: 50_000, stock: 10 }] },
      },
      include: { variants: true },
    });
  };
  const mkOrder = async (productId: string, variantId: string, status: 'COMPLETED' | 'PENDING', uid?: string) => {
    t.seq++;
    return t.prisma.order.create({
      data: {
        code: `HLREV${String(t.seq).padStart(4, '0')}`,
        userId: uid ?? t.userId,
        status,
        fullName: 'A',
        phone: '0901234567',
        email: 'a@example.com',
        provinceCode: '01',
        wardCode: '00004',
        addressDetail: '12 Hàng Bông',
        totalVnd: 50_000,
        items: { create: [{ productId, variantId, productName: 'x', variantLabel: '500g', unitPriceVnd: 50_000, quantity: 1 }] },
      },
    });
  };
  const bought = async () => {
    const p = await mkProduct();
    await mkOrder(p.id, p.variants[0].id, 'COMPLETED');
    return p;
  };
  const post = (pid: string, body: unknown, token: string | null = t.userToken) => {
    const r = t.http().post(`/products/${pid}/reviews`);
    return (token ? r.set(t.bearer(token)) : r).send(body as object);
  };

  it('requires login', async () => {
    const p = await bought();
    await post(p.id, { rating: 5, content: 'ok' }, null).expect(401);
  });

  it('creates a VISIBLE review after a completed purchase', async () => {
    const p = await bought();
    const res = await post(p.id, { rating: 5, content: '  Gạo lứt rất ngon  ' }).expect(201);
    expect(res.body).toMatchObject({ rating: 5, content: 'Gạo lứt rất ngon', status: 'VISIBLE', productId: p.id });
  });

  it('403 NOT_PURCHASED when the order is only PENDING', async () => {
    const p = await mkProduct();
    await mkOrder(p.id, p.variants[0].id, 'PENDING');
    const res = await post(p.id, { rating: 5, content: 'ok' }).expect(403);
    expect(res.body.error).toBe('NOT_PURCHASED');
  });

  it('403 NOT_PURCHASED when only another user completed an order', async () => {
    const p = await mkProduct();
    await mkOrder(p.id, p.variants[0].id, 'COMPLETED', t.otherId);
    const res = await post(p.id, { rating: 5, content: 'ok' }).expect(403);
    expect(res.body.error).toBe('NOT_PURCHASED');
  });

  it('404 for an unknown product', async () => {
    await post('nope', { rating: 5, content: 'ok' }).expect(404);
  });

  it('409 ALREADY_REVIEWED on a second review', async () => {
    const p = await bought();
    await post(p.id, { rating: 5, content: 'ok' }).expect(201);
    const res = await post(p.id, { rating: 4, content: 'again' }).expect(409);
    expect(res.body.error).toBe('ALREADY_REVIEWED');
  });

  it.each([[0], [6], [2.5], ['5']])('400 for rating %p', async (rating) => {
    const p = await bought();
    await post(p.id, { rating, content: 'ok' }).expect(400);
  });

  it.each([[''], ['   '], ['x'.repeat(1001)]])('400 for bad content', async (content) => {
    const p = await bought();
    await post(p.id, { rating: 5, content }).expect(400);
  });

  it.each(['Gạo này trị bệnh tốt', 'gọi 0912 345 678', 'xem https://x.vn'])('%s becomes PENDING', async (content) => {
    await t.addWord('trị bệnh');
    const p = await bought();
    const res = await post(p.id, { rating: 5, content }).expect(201);
    expect(res.body.status).toBe('PENDING');
    expect(await t.prisma.review.count({ where: { status: 'PENDING' } })).toBe(1);
  });

  describe('GET /products/:id/reviews', () => {
    it('hides PENDING from the public but shows it flagged to its author; never leaks email', async () => {
      const p = await bought();
      await t.addWord('chữa khỏi');
      await post(p.id, { rating: 3, content: 'chữa khỏi mọi bệnh' }).expect(201);
      const pub = await t.http().get(`/products/${p.id}/reviews`).expect(200);
      expect(pub.body).toEqual([]);
      const other = await t.http().get(`/products/${p.id}/reviews`).set(t.bearer(t.otherToken)).expect(200);
      expect(other.body).toEqual([]);
      const mine = await t.http().get(`/products/${p.id}/reviews`).set(t.bearer(t.userToken)).expect(200);
      expect(mine.body).toHaveLength(1);
      expect(mine.body[0]).toMatchObject({ status: 'PENDING', rating: 3, authorName: 'Khách' });
      expect(JSON.stringify(mine.body)).not.toContain('u@x.com');
    });

    it('lists VISIBLE newest first and rejects a bad token', async () => {
      const p = await mkProduct();
      await t.prisma.review.create({ data: { userId: t.userId, productId: p.id, rating: 5, content: 'cũ', createdAt: new Date('2026-01-01') } });
      await t.prisma.review.create({ data: { userId: t.otherId, productId: p.id, rating: 4, content: 'mới', createdAt: new Date('2026-02-01') } });
      await t.prisma.review.create({ data: { userId: t.otherId, productId: (await mkProduct()).id, rating: 1, content: 'khác' } });
      const res = await t.http().get(`/products/${p.id}/reviews`).expect(200);
      expect(res.body.map((r: { content: string }) => r.content)).toEqual(['mới', 'cũ']);
      expect(res.body[0]).toMatchObject({ authorName: 'Khách 2', status: 'VISIBLE' });
      await t.http().get(`/products/${p.id}/reviews`).set(t.bearer('garbage')).expect(401);
    });

    it('404 for an unknown product', async () => {
      await t.http().get('/products/nope/reviews').expect(404);
    });
  });
});
