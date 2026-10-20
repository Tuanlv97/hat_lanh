import { useModerationSuite } from './moderation-setup';

describe('Comments (e2e)', () => {
  const t = useModerationSuite();

  const mkPost = async (over: { status?: 'DRAFT' | 'PUBLISHED'; publishAt?: Date | null } = {}) => {
    t.seq++;
    return t.prisma.post.create({
      data: { slug: `bai-${t.seq}`, title: `Bài ${t.seq}`, html: '<p>x</p>', status: over.status ?? 'PUBLISHED', publishAt: over.publishAt ?? null },
    });
  };
  const post = (slug: string, body: unknown, token: string | null = t.userToken) => {
    const r = t.http().post(`/posts/${slug}/comments`);
    return (token ? r.set(t.bearer(token)) : r).send(body as object);
  };

  it('requires login', async () => {
    const p = await mkPost();
    await post(p.slug, { content: 'hay' }, null).expect(401);
  });

  it('any logged-in user can comment; returns the comment with status', async () => {
    const p = await mkPost();
    const res = await post(p.slug, { content: '  Bài hay quá  ' }).expect(201);
    expect(res.body).toMatchObject({ content: 'Bài hay quá', status: 'VISIBLE', postId: p.id });
  });

  it('accepts a published post whose publishAt is past; 404 for future/draft/unknown', async () => {
    const past = await mkPost({ publishAt: new Date(Date.now() - 60_000) });
    await post(past.slug, { content: 'ok' }).expect(201);
    const future = await mkPost({ publishAt: new Date(Date.now() + 3_600_000) });
    await post(future.slug, { content: 'ok' }).expect(404);
    const draft = await mkPost({ status: 'DRAFT' });
    await post(draft.slug, { content: 'ok' }).expect(404);
    await post('khong-co', { content: 'ok' }).expect(404);
    await t.http().get(`/posts/${draft.slug}/comments`).expect(404);
  });

  it.each([[''], ['   '], ['x'.repeat(1001)], [5]])('400 for bad content %p', async (content) => {
    const p = await mkPost();
    await post(p.slug, { content }).expect(400);
  });

  it('sensitive / phone / url comments are PENDING; hidden publicly, visible to author', async () => {
    await t.addWord('chữa khỏi');
    const p = await mkPost();
    for (const content of ['chữa khỏi ung thư', 'zalo 0912345678', 'xem www.abc.com']) {
      expect((await post(p.slug, { content }).expect(201)).body.status).toBe('PENDING');
    }
    await post(p.slug, { content: 'Bài rất hay' }).expect(201);
    const pub = await t.http().get(`/posts/${p.slug}/comments`).expect(200);
    expect(pub.body.map((c: { content: string }) => c.content)).toEqual(['Bài rất hay']);
    const other = await t.http().get(`/posts/${p.slug}/comments`).set(t.bearer(t.otherToken)).expect(200);
    expect(other.body).toHaveLength(1);
    const mine = await t.http().get(`/posts/${p.slug}/comments`).set(t.bearer(t.userToken)).expect(200);
    expect(mine.body).toHaveLength(4);
    expect(mine.body.filter((c: { status: string }) => c.status === 'PENDING')).toHaveLength(3);
    expect(JSON.stringify(mine.body)).not.toContain('u@x.com');
    expect(mine.body[0]).toMatchObject({ authorName: 'Khách' });
  });

  it('lists newest first, VISIBLE only', async () => {
    const p = await mkPost();
    await t.prisma.comment.create({ data: { userId: t.userId, postId: p.id, content: 'cũ', createdAt: new Date('2026-01-01') } });
    await t.prisma.comment.create({ data: { userId: t.userId, postId: p.id, content: 'mới', createdAt: new Date('2026-02-01') } });
    await t.prisma.comment.create({ data: { userId: t.userId, postId: p.id, content: 'ẩn', status: 'HIDDEN' } });
    const res = await t.http().get(`/posts/${p.slug}/comments`).expect(200);
    expect(res.body.map((c: { content: string }) => c.content)).toEqual(['mới', 'cũ']);
  });
});
