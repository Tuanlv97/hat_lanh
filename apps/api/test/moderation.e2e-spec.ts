import { useModerationSuite } from './moderation-setup';

describe('Moderation admin (e2e)', () => {
  const t = useModerationSuite();

  const mkReview = async (status: 'PENDING' | 'VISIBLE', content = 'đánh giá', createdAt = new Date()) => {
    t.seq++;
    const categoryId = (await t.prisma.category.findFirstOrThrow()).id;
    const p = await t.prisma.product.create({
      data: { name: `SP ${t.seq}`, slug: `sp-${t.seq}`, categoryId, description: 'm', origin: 'VN', benefits: 't', images: [] },
    });
    return t.prisma.review.create({
      data: { userId: t.userId, productId: p.id, rating: 4, content, status, createdAt },
      include: { product: true },
    });
  };
  const mkComment = async (status: 'PENDING' | 'VISIBLE' | 'HIDDEN', content = 'bình luận', createdAt = new Date()) => {
    t.seq++;
    const p = await t.prisma.post.create({ data: { slug: `bai-${t.seq}`, title: `Bài ${t.seq}`, html: 'x', status: 'PUBLISHED' } });
    return t.prisma.comment.create({ data: { userId: t.userId, postId: p.id, content, status, createdAt }, include: { post: true } });
  };
  const admin = (m: 'get' | 'post' | 'patch' | 'delete', url: string) => t.http()[m](url).set(t.bearer(t.adminToken));

  describe('auth', () => {
    it.each([
      ['get', '/admin/moderation'],
      ['patch', '/admin/moderation/review/x'],
      ['delete', '/admin/moderation/review/x'],
      ['get', '/admin/sensitive-words'],
      ['post', '/admin/sensitive-words'],
      ['delete', '/admin/sensitive-words/x'],
    ] as const)('%s %s -> 401 without token, 403 for a customer', async (m, url) => {
      await t.http()[m](url).expect(401);
      await t.http()[m](url).set(t.bearer(t.userToken)).expect(403);
    });
  });

  describe('GET /admin/moderation', () => {
    it('defaults to PENDING, merges both kinds newest first with the required fields', async () => {
      const r = await mkReview('PENDING', 'rv', new Date('2026-03-01'));
      const c = await mkComment('PENDING', 'cm', new Date('2026-04-01'));
      await mkReview('VISIBLE');
      await mkComment('HIDDEN');
      const res = await admin('get', '/admin/moderation').expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        kind: 'comment', id: c.id, content: 'cm', authorName: 'Khách', targetName: c.post.title, targetSlug: c.post.slug, status: 'PENDING',
      });
      expect(res.body[1]).toMatchObject({
        kind: 'review', id: r.id, content: 'rv', authorName: 'Khách', targetName: r.product.name, targetSlug: r.product.slug, status: 'PENDING',
      });
    });

    it('filters by kind and status; 400 on bad values', async () => {
      await mkReview('PENDING');
      await mkComment('PENDING');
      await mkComment('HIDDEN');
      expect((await admin('get', '/admin/moderation?kind=review').expect(200)).body.map((x: { kind: string }) => x.kind)).toEqual(['review']);
      expect((await admin('get', '/admin/moderation?kind=comment').expect(200)).body).toHaveLength(1);
      expect((await admin('get', '/admin/moderation?status=HIDDEN').expect(200)).body).toHaveLength(1);
      await admin('get', '/admin/moderation?kind=post').expect(400);
      await admin('get', '/admin/moderation?status=NOPE').expect(400);
    });
  });

  describe('PATCH / DELETE', () => {
    it('approve makes a pending review public; hide removes it', async () => {
      const r = await mkReview('PENDING');
      const url = `/products/${r.productId}/reviews`;
      expect((await t.http().get(url).expect(200)).body).toEqual([]);
      const ok = await admin('patch', `/admin/moderation/review/${r.id}`).send({ action: 'approve' }).expect(200);
      expect(ok.body).toMatchObject({ kind: 'review', id: r.id, status: 'VISIBLE' });
      expect((await t.http().get(url).expect(200)).body).toHaveLength(1);
      await admin('patch', `/admin/moderation/review/${r.id}`).send({ action: 'hide' }).expect(200);
      expect((await t.http().get(url).expect(200)).body).toEqual([]);
      expect((await t.prisma.review.findUniqueOrThrow({ where: { id: r.id } })).status).toBe('HIDDEN');
    });

    it('approve/hide a comment', async () => {
      const c = await mkComment('PENDING');
      const url = `/posts/${c.post.slug}/comments`;
      await admin('patch', `/admin/moderation/comment/${c.id}`).send({ action: 'approve' }).expect(200);
      expect((await t.http().get(url).expect(200)).body).toHaveLength(1);
      await admin('patch', `/admin/moderation/comment/${c.id}`).send({ action: 'hide' }).expect(200);
      expect((await t.http().get(url).expect(200)).body).toEqual([]);
    });

    it('404 unknown id, 400 bad kind/action', async () => {
      await admin('patch', '/admin/moderation/review/nope').send({ action: 'approve' }).expect(404);
      await admin('patch', '/admin/moderation/comment/nope').send({ action: 'approve' }).expect(404);
      await admin('delete', '/admin/moderation/review/nope').expect(404);
      await admin('delete', '/admin/moderation/comment/nope').expect(404);
      const r = await mkReview('PENDING');
      await admin('patch', `/admin/moderation/review/${r.id}`).send({ action: 'nuke' }).expect(400);
      await admin('patch', `/admin/moderation/post/${r.id}`).send({ action: 'approve' }).expect(400);
      await admin('delete', `/admin/moderation/post/${r.id}`).expect(400);
    });

    it('delete removes a review and a comment', async () => {
      const r = await mkReview('VISIBLE');
      const c = await mkComment('VISIBLE');
      await admin('delete', `/admin/moderation/review/${r.id}`).expect(200);
      await admin('delete', `/admin/moderation/comment/${c.id}`).expect(200);
      expect(await t.prisma.review.count()).toBe(0);
      expect(await t.prisma.comment.count()).toBe(0);
    });
  });

  describe('/admin/sensitive-words', () => {
    it('POST normalizes, trims; GET lists; DELETE removes', async () => {
      const res = await admin('post', '/admin/sensitive-words').send({ term: '  TRỊ BỆNH ' }).expect(201);
      expect(res.body).toMatchObject({ term: 'tri benh' });
      expect((await t.prisma.sensitiveWord.findMany()).map((w) => w.term)).toEqual(['tri benh']);
      const list = await admin('get', '/admin/sensitive-words').expect(200);
      expect(list.body).toEqual([expect.objectContaining({ id: res.body.id, term: 'tri benh' })]);
      await admin('delete', `/admin/sensitive-words/${res.body.id}`).expect(200);
      expect(await t.prisma.sensitiveWord.count()).toBe(0);
      await admin('delete', `/admin/sensitive-words/${res.body.id}`).expect(404);
    });

    it('duplicate (after normalization) -> 409 WORD_EXISTS', async () => {
      await admin('post', '/admin/sensitive-words').send({ term: 'tri benh' }).expect(201);
      const res = await admin('post', '/admin/sensitive-words').send({ term: 'TRỊ BỆNH' }).expect(409);
      expect(res.body.error).toBe('WORD_EXISTS');
    });

    it.each([[''], ['   '], ['x'.repeat(101)], [3]])('400 for bad term %p', async (term) => {
      await admin('post', '/admin/sensitive-words').send({ term }).expect(400);
    });

    it('a newly added word takes effect immediately for new reviews', async () => {
      await admin('post', '/admin/sensitive-words').send({ term: 'Chữa khỏi' }).expect(201);
      const categoryId = (await t.prisma.category.findFirstOrThrow()).id;
      const p = await t.prisma.product.create({
        data: {
          name: 'P', slug: 'p-x', categoryId, description: 'm', origin: 'VN', benefits: 't', images: [],
          variants: { create: [{ label: '1', priceVnd: 1000, stock: 1 }] },
        },
        include: { variants: true },
      });
      await t.prisma.order.create({
        data: {
          code: 'HLMOD0001', userId: t.userId, status: 'COMPLETED', fullName: 'A', phone: '0901234567', email: 'a@e.com',
          provinceCode: '01', wardCode: '00004', addressDetail: 'x', totalVnd: 1000,
          items: { create: [{ productId: p.id, variantId: p.variants[0].id, productName: 'P', variantLabel: '1', unitPriceVnd: 1000, quantity: 1 }] },
        },
      });
      const res = await t.http().post(`/products/${p.id}/reviews`).set(t.bearer(t.userToken)).send({ rating: 5, content: 'chua khoi het' }).expect(201);
      expect(res.body.status).toBe('PENDING');
    });
  });
});
