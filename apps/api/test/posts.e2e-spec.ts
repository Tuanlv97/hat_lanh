import type { Test } from 'supertest';
import { useModerationSuite } from './moderation-setup';

describe('Posts / blog (e2e)', () => {
  const t = useModerationSuite();
  const adm = (r: Test) => r.set(t.bearer(t.adminToken));
  const past = () => new Date(Date.now() - 60_000);
  const future = () => new Date(Date.now() + 3_600_000);

  const mkTopic = (name = 'Dinh dưỡng', slug = 'dinh-duong') => t.prisma.topic.create({ data: { name, slug } });
  const mkPost = async (
    over: { status?: 'DRAFT' | 'PUBLISHED'; publishAt?: Date | null; topicId?: string | null; title?: string; html?: string } = {},
  ) => {
    t.seq++;
    return t.prisma.post.create({
      data: {
        slug: `bai-${t.seq}`,
        title: over.title ?? `Bài ${t.seq}`,
        html: over.html ?? '<p>nội dung</p>',
        status: over.status ?? 'PUBLISHED',
        publishAt: over.publishAt === undefined ? past() : over.publishAt,
        topicId: over.topicId ?? null,
      },
    });
  };
  const mkProduct = async (
    slug: string,
    opts: { isActive?: boolean; variants?: { label: string; priceVnd: number; isActive?: boolean }[] } = {},
  ) => {
    const category = await t.prisma.category.findFirstOrThrow();
    return t.prisma.product.create({
      data: {
        slug,
        name: `SP ${slug}`,
        categoryId: category.id,
        description: 'd',
        origin: 'VN',
        benefits: 'b',
        images: ['/uploads/a.png', '/uploads/b.png'],
        isActive: opts.isActive ?? true,
        variants: {
          create: (opts.variants ?? [{ label: '500g', priceVnd: 50000 }, { label: '1kg', priceVnd: 90000 }]).map((v) => ({
            ...v,
            stock: 5,
            isActive: v.isActive ?? true,
          })),
        },
      },
    });
  };

  describe('public', () => {
    it('draft and future posts are 404 on detail and absent from the list; past is 200', async () => {
      const ok = await mkPost();
      const draft = await mkPost({ status: 'DRAFT' });
      const sched = await mkPost({ publishAt: future() });
      const nullAt = await mkPost({ publishAt: null });
      await t.http().get(`/posts/${ok.slug}`).expect(200);
      await t.http().get(`/posts/${nullAt.slug}`).expect(200);
      await t.http().get(`/posts/${draft.slug}`).expect(404);
      await t.http().get(`/posts/${sched.slug}`).expect(404);
      await t.http().get('/posts/khong-co').expect(404);
      const list = await t.http().get('/posts').expect(200);
      const slugs = list.body.items.map((p: { slug: string }) => p.slug);
      expect(slugs.sort()).toEqual([ok.slug, nullAt.slug].sort());
    });

    it('list returns title, slug, excerpt, topic, publishedAt, newest first', async () => {
      const topic = await mkTopic();
      const a = await mkPost({
        publishAt: new Date(Date.now() - 3 * 3600_000),
        topicId: topic.id,
        html: `<p>${'chữ '.repeat(100)}</p>`,
      });
      const b = await mkPost({ publishAt: new Date(Date.now() - 3600_000) });
      const res = await t.http().get('/posts').expect(200);
      expect(res.body.items.map((p: { slug: string }) => p.slug)).toEqual([b.slug, a.slug]);
      const item = res.body.items[1];
      expect(item).toMatchObject({ title: a.title, slug: a.slug, topic: { slug: 'dinh-duong', name: 'Dinh dưỡng' } });
      expect(item.publishedAt).toBeTruthy();
      expect(item.excerpt.length).toBeLessThanOrEqual(165);
      expect(item.excerpt.length).toBeGreaterThan(100);
      expect(item.excerpt).not.toContain('<');
      expect(item.html).toBeUndefined();
      expect(res.body).toMatchObject({ page: 1, pageSize: 10, total: 2 });
    });

    it('explicit excerpt column wins over the derived one', async () => {
      const p = await mkPost();
      await t.prisma.post.update({ where: { id: p.id }, data: { excerpt: 'Tóm tắt' } });
      const res = await t.http().get('/posts').expect(200);
      expect(res.body.items[0].excerpt).toBe('Tóm tắt');
    });

    it('filters by topic slug', async () => {
      const t1 = await mkTopic('A', 'a');
      const t2 = await mkTopic('B', 'b');
      const p1 = await mkPost({ topicId: t1.id });
      await mkPost({ topicId: t2.id });
      const res = await t.http().get('/posts?topic=a').expect(200);
      expect(res.body.items.map((p: { slug: string }) => p.slug)).toEqual([p1.slug]);
      expect((await t.http().get('/posts?topic=zzz').expect(200)).body.items).toEqual([]);
    });

    it('paginates with bounds', async () => {
      for (let i = 0; i < 5; i++) await mkPost({ publishAt: new Date(Date.now() - (i + 1) * 60_000) });
      const p1 = await t.http().get('/posts?page=1&pageSize=2').expect(200);
      const p3 = await t.http().get('/posts?page=3&pageSize=2').expect(200);
      expect(p1.body.items).toHaveLength(2);
      expect(p3.body.items).toHaveLength(1);
      expect(p1.body).toMatchObject({ total: 5, page: 1, pageSize: 2 });
      expect((await t.http().get('/posts?pageSize=999').expect(200)).body.pageSize).toBe(50);
      expect((await t.http().get('/posts?page=0&pageSize=0').expect(200)).body).toMatchObject({ page: 1, pageSize: 1 });
      expect((await t.http().get('/posts?page=abc&pageSize=xyz').expect(200)).body).toMatchObject({ page: 1, pageSize: 10 });
    });

    it('detail includes html, topic, active linked products only, and visible comment count', async () => {
      const topic = await mkTopic();
      const p = await mkPost({ topicId: topic.id });
      const good = await mkProduct('gao-lut');
      const hidden = await mkProduct('an', { isActive: false });
      const noVariant = await mkProduct('khong-bien-the', { variants: [{ label: 'x', priceVnd: 1, isActive: false }] });
      await t.prisma.postProduct.createMany({
        data: [good, hidden, noVariant].map((x) => ({ postId: p.id, productId: x.id })),
      });
      await t.prisma.comment.createMany({
        data: [
          { userId: t.userId, postId: p.id, content: 'a', status: 'VISIBLE' },
          { userId: t.userId, postId: p.id, content: 'b', status: 'PENDING' },
          { userId: t.userId, postId: p.id, content: 'c', status: 'HIDDEN' },
        ],
      });
      const res = await t.http().get(`/posts/${p.slug}`).expect(200);
      expect(res.body).toMatchObject({ slug: p.slug, html: '<p>nội dung</p>', topic: { slug: 'dinh-duong' }, commentCount: 1 });
      expect(res.body.products).toEqual([
        { id: good.id, name: 'SP gao-lut', slug: 'gao-lut', image: '/uploads/a.png', minPriceVnd: 50000 },
      ]);
    });

    it('GET /topics lists topics', async () => {
      await mkTopic('B', 'b');
      await mkTopic('A', 'a');
      const res = await t.http().get('/topics').expect(200);
      expect(res.body.map((x: { slug: string }) => x.slug)).toEqual(['a', 'b']);
      expect(res.body[0]).toMatchObject({ id: expect.any(String), name: 'A' });
    });
  });

  describe('admin posts', () => {
    it('401 anonymous, 403 customer on every route', async () => {
      const routes = [
        ['get', '/admin/posts'],
        ['post', '/admin/posts'],
        ['get', '/admin/posts/x'],
        ['patch', '/admin/posts/x'],
        ['delete', '/admin/posts/x'],
        ['get', '/admin/topics'],
        ['post', '/admin/topics'],
        ['patch', '/admin/topics/x'],
        ['delete', '/admin/topics/x'],
      ] as const;
      for (const [m, url] of routes) {
        await t.http()[m](url).expect(401);
        await t.http()[m](url).set(t.bearer(t.userToken)).expect(403);
      }
    });

    it('sanitizes html on save and stores only the sanitized html', async () => {
      const topic = await mkTopic();
      const res = await adm(t.http().post('/admin/posts'))
        .send({
          title: 'XSS',
          topicId: topic.id,
          status: 'DRAFT',
          html: '<p>hi</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a><iframe src="https://a.com"></iframe><img src="/uploads/a.png">',
        })
        .expect(201);
      const row = await t.prisma.post.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.html).not.toMatch(/script|onerror|iframe|javascript/i);
      expect(row.html).toContain('<p>hi</p>');
      expect(row.html).toContain('<img src="/uploads/a.png" />');
      expect(row.html).not.toContain('src="x"');
      expect(res.body.html).toBe(row.html);
    });

    it('auto-generates slug via normalizeVi and appends -2, -3 when taken', async () => {
      const mk = () =>
        adm(t.http().post('/admin/posts')).send({ title: 'Cách nấu gạo lứt', html: '<p>x</p>', status: 'DRAFT' });
      expect((await mk().expect(201)).body.slug).toBe('cach-nau-gao-lut');
      expect((await mk().expect(201)).body.slug).toBe('cach-nau-gao-lut-2');
      expect((await mk().expect(201)).body.slug).toBe('cach-nau-gao-lut-3');
    });

    it('explicit duplicate slug -> 409 SLUG_TAKEN (create and patch)', async () => {
      const a = await mkPost();
      const res = await adm(t.http().post('/admin/posts'))
        .send({ title: 'X', slug: a.slug, html: '<p>x</p>', status: 'DRAFT' })
        .expect(409);
      expect(res.body.error).toBe('SLUG_TAKEN');
      const b = await mkPost();
      const r2 = await adm(t.http().patch(`/admin/posts/${b.id}`)).send({ slug: a.slug }).expect(409);
      expect(r2.body.error).toBe('SLUG_TAKEN');
    });

    it('publish without publishAt sets it to now; future publishAt is scheduled', async () => {
      const now = await adm(t.http().post('/admin/posts'))
        .send({ title: 'Now', html: '<p>x</p>', status: 'PUBLISHED' })
        .expect(201);
      expect(new Date(now.body.publishAt).getTime()).toBeLessThanOrEqual(Date.now());
      await t.http().get(`/posts/${now.body.slug}`).expect(200);
      const sched = await adm(t.http().post('/admin/posts'))
        .send({ title: 'Later', html: '<p>x</p>', status: 'PUBLISHED', publishAt: future().toISOString() })
        .expect(201);
      await t.http().get(`/posts/${sched.body.slug}`).expect(404);
      const d = await adm(t.http().post('/admin/posts')).send({ title: 'Draft', html: '<p>x</p>', status: 'DRAFT' }).expect(201);
      await t.http().get(`/posts/${d.body.slug}`).expect(404);
      const pub = await adm(t.http().patch(`/admin/posts/${d.body.id}`)).send({ status: 'PUBLISHED' }).expect(200);
      expect(pub.body.publishAt).toBeTruthy();
      await t.http().get(`/posts/${d.body.slug}`).expect(200);
    });

    it('PATCH sanitizes html; validates input; unknown topic 400', async () => {
      const p = await mkPost();
      const res = await adm(t.http().patch(`/admin/posts/${p.id}`))
        .send({ html: '<p>a</p><script>x</script>', title: 'Mới' })
        .expect(200);
      expect(res.body).toMatchObject({ html: '<p>a</p>', title: 'Mới' });
      await adm(t.http().patch('/admin/posts/nope')).send({ title: 'x' }).expect(404);
      await adm(t.http().post('/admin/posts')).send({ title: '', html: 'x', status: 'DRAFT' }).expect(400);
      await adm(t.http().post('/admin/posts')).send({ title: 'x', html: 'x', status: 'WEIRD' }).expect(400);
      await adm(t.http().post('/admin/posts')).send({ title: 'x', html: 'x', status: 'DRAFT', topicId: 'nope' }).expect(400);
    });

    it('productIds replace the linked set; unknown product -> 400', async () => {
      const p1 = await mkProduct('p1');
      const p2 = await mkProduct('p2');
      const created = await adm(t.http().post('/admin/posts'))
        .send({ title: 'L', html: '<p>x</p>', status: 'PUBLISHED', productIds: [p1.id] })
        .expect(201);
      const ids = async () =>
        (await t.prisma.postProduct.findMany({ where: { postId: created.body.id } })).map((x) => x.productId);
      expect(await ids()).toEqual([p1.id]);
      await adm(t.http().patch(`/admin/posts/${created.body.id}`)).send({ productIds: [p2.id] }).expect(200);
      expect(await ids()).toEqual([p2.id]);
      await adm(t.http().patch(`/admin/posts/${created.body.id}`)).send({ productIds: [p1.id, 'nope'] }).expect(400);
      expect(await ids()).toEqual([p2.id]);
      await adm(t.http().post('/admin/posts')).send({ title: 'M', html: 'x', status: 'DRAFT', productIds: ['nope'] }).expect(400);
      await adm(t.http().patch(`/admin/posts/${created.body.id}`)).send({ title: 'only title' }).expect(200);
      expect(await ids()).toEqual([p2.id]);
      await adm(t.http().patch(`/admin/posts/${created.body.id}`)).send({ productIds: [] }).expect(200);
      expect(await ids()).toEqual([]);
    });

    it('admin list shows all statuses with topic; get by id includes productIds; delete removes', async () => {
      const topic = await mkTopic();
      const d = await mkPost({ status: 'DRAFT', topicId: topic.id });
      const s = await mkPost({ publishAt: future() });
      const prod = await mkProduct('p1');
      await t.prisma.postProduct.create({ data: { postId: d.id, productId: prod.id } });
      const list = await adm(t.http().get('/admin/posts')).expect(200);
      expect(list.body.map((p: { id: string }) => p.id).sort()).toEqual([d.id, s.id].sort());
      expect(list.body.find((p: { id: string }) => p.id === d.id).topic).toMatchObject({ slug: 'dinh-duong' });
      const one = await adm(t.http().get(`/admin/posts/${d.id}`)).expect(200);
      expect(one.body).toMatchObject({ id: d.id, status: 'DRAFT', productIds: [prod.id] });
      await adm(t.http().get('/admin/posts/nope')).expect(404);
      await adm(t.http().delete(`/admin/posts/${d.id}`)).expect(200);
      expect(await t.prisma.post.findUnique({ where: { id: d.id } })).toBeNull();
      await adm(t.http().delete(`/admin/posts/${d.id}`)).expect(404);
    });
  });

  describe('admin topics', () => {
    it('create (slug auto/explicit), list, patch, delete', async () => {
      const c = await adm(t.http().post('/admin/topics')).send({ name: 'Món chay' }).expect(201);
      expect(c.body).toMatchObject({ name: 'Món chay', slug: 'mon-chay' });
      const c2 = await adm(t.http().post('/admin/topics')).send({ name: 'Món chay' }).expect(201);
      expect(c2.body.slug).toBe('mon-chay-2');
      const e = await adm(t.http().post('/admin/topics')).send({ name: 'X', slug: 'mon-chay' }).expect(409);
      expect(e.body.error).toBe('SLUG_TAKEN');
      expect((await adm(t.http().get('/admin/topics')).expect(200)).body).toHaveLength(2);
      const up = await adm(t.http().patch(`/admin/topics/${c.body.id}`)).send({ name: 'Sức khỏe' }).expect(200);
      expect(up.body.name).toBe('Sức khỏe');
      await adm(t.http().patch('/admin/topics/nope')).send({ name: 'x' }).expect(404);
      await adm(t.http().post('/admin/topics')).send({ name: '' }).expect(400);
      await adm(t.http().delete(`/admin/topics/${c2.body.id}`)).expect(200);
      await adm(t.http().delete(`/admin/topics/${c2.body.id}`)).expect(404);
    });

    it('deleting a topic that still has posts -> 409 TOPIC_HAS_POSTS', async () => {
      const topic = await mkTopic();
      await mkPost({ topicId: topic.id });
      const res = await adm(t.http().delete(`/admin/topics/${topic.id}`)).expect(409);
      expect(res.body.error).toBe('TOPIC_HAS_POSTS');
      expect(await t.prisma.topic.findUnique({ where: { id: topic.id } })).not.toBeNull();
    });
  });
});
