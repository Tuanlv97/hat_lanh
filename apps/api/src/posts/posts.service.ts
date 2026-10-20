import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { publishedWhere } from './post-visibility';
import { sanitizeHtml } from './sanitize';
import { slugify, uniqueSlug } from './slug';

export interface PostInput {
  title: string;
  slug?: string;
  html: string;
  topicId?: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  publishAt?: Date | null;
  productIds?: string[];
}

const EXCERPT_LENGTH = 160;
const notFound = () => new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy bài viết' });
const badRequest = (message: string) => new BadRequestException({ statusCode: 400, error: 'BAD_REQUEST', message });
const conflict = (error: string, message: string) => new ConflictException({ statusCode: 409, error, message });
const prismaCode = (e: unknown) => (e instanceof Prisma.PrismaClientKnownRequestError ? e.code : undefined);

/** Plain-text excerpt (~160 chars, cut at a word boundary) derived from already-sanitized html. */
export function deriveExcerpt(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, String.fromCharCode(39))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= EXCERPT_LENGTH) return text;
  const cut = text.slice(0, EXCERPT_LENGTH);
  const space = cut.lastIndexOf(' ');
  return `${(space > EXCERPT_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function intParam(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- public ----

  async list(q: { topic?: string; page?: string; pageSize?: string }) {
    const page = intParam(q.page, 1, 1, 1_000_000);
    const pageSize = intParam(q.pageSize, 10, 1, 50);
    const where: Prisma.PostWhereInput = { AND: [publishedWhere(), q.topic ? { topic: { slug: q.topic } } : {}] };
    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: [{ publishAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          html: true,
          coverImage: true,
          publishAt: true,
          createdAt: true,
          topic: { select: { id: true, slug: true, name: true } },
        },
      }),
    ]);
    const items = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || deriveExcerpt(p.html),
      coverImage: p.coverImage,
      topic: p.topic,
      publishedAt: p.publishAt ?? p.createdAt,
    }));
    return { items, total, page, pageSize };
  }

  /** Detail embeds linked products and the visible-comment count; comments themselves come from GET /posts/:slug/comments. */
  async detail(slug: string) {
    const p = await this.prisma.post.findFirst({
      where: { slug, ...publishedWhere() },
      include: {
        topic: { select: { id: true, slug: true, name: true } },
        postProducts: {
          where: { product: { isActive: true, variants: { some: { isActive: true } } } },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                createdAt: true,
                variants: { where: { isActive: true }, orderBy: { priceVnd: 'asc' }, take: 1, select: { priceVnd: true } },
              },
            },
          },
        },
        _count: { select: { comments: { where: { status: 'VISIBLE' } } } },
      },
    });
    if (!p) throw notFound();
    const products = p.postProducts
      .map((pp) => pp.product)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((x) => ({
        id: x.id,
        name: x.name,
        slug: x.slug,
        image: x.images[0] ?? null,
        minPriceVnd: x.variants[0].priceVnd,
      }));
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || deriveExcerpt(p.html),
      html: p.html,
      coverImage: p.coverImage,
      topic: p.topic,
      publishedAt: p.publishAt ?? p.createdAt,
      products,
      commentCount: p._count.comments,
    };
  }

  // ---- admin ----

  adminList() {
    return this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        publishAt: true,
        createdAt: true,
        updatedAt: true,
        topic: { select: { id: true, slug: true, name: true } },
      },
    });
  }

  async adminGet(id: string) {
    const p = await this.prisma.post.findUnique({
      where: { id },
      include: { topic: { select: { id: true, slug: true, name: true } }, postProducts: { select: { productId: true } } },
    });
    if (!p) throw notFound();
    const { postProducts, ...rest } = p;
    return { ...rest, productIds: postProducts.map((x) => x.productId) };
  }

  private async assertTopic(topicId: string | null | undefined) {
    if (!topicId) return;
    const t = await this.prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } });
    if (!t) throw badRequest('Chủ đề không tồn tại');
  }

  private async assertProducts(ids: string[]) {
    const count = await this.prisma.product.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw badRequest('Có sản phẩm liên kết không tồn tại');
  }

  async create(input: PostInput) {
    await this.assertTopic(input.topicId);
    const productIds = [...new Set(input.productIds ?? [])];
    await this.assertProducts(productIds);
    const slug =
      input.slug ??
      (await uniqueSlug(slugify(input.title) || 'bai-viet', async (s) => (await this.prisma.post.count({ where: { slug: s } })) > 0));
    const publishAt = input.publishAt ?? (input.status === 'PUBLISHED' ? new Date() : null);
    try {
      return await this.prisma.post.create({
        data: {
          slug,
          title: input.title,
          html: sanitizeHtml(input.html),
          topicId: input.topicId ?? null,
          status: input.status,
          publishAt,
          postProducts: { create: productIds.map((productId) => ({ productId })) },
        },
      });
    } catch (e) {
      if (prismaCode(e) === 'P2002') throw conflict('SLUG_TAKEN', 'Slug đã tồn tại');
      throw e;
    }
  }

  async update(id: string, input: Partial<PostInput>) {
    const existing = await this.prisma.post.findUnique({ where: { id }, select: { status: true, publishAt: true } });
    if (!existing) throw notFound();
    if (input.topicId !== undefined) await this.assertTopic(input.topicId);
    const productIds = input.productIds ? [...new Set(input.productIds)] : undefined;
    if (productIds) await this.assertProducts(productIds);

    const status = input.status ?? existing.status;
    let publishAt = input.publishAt !== undefined ? input.publishAt : existing.publishAt;
    if (status === 'PUBLISHED' && !publishAt) publishAt = new Date();

    try {
      return await this.prisma.post.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.html !== undefined ? { html: sanitizeHtml(input.html) } : {}),
          ...(input.topicId !== undefined ? { topicId: input.topicId } : {}),
          status,
          publishAt,
          ...(productIds
            ? { postProducts: { deleteMany: {}, create: productIds.map((productId) => ({ productId })) } }
            : {}),
        },
      });
    } catch (e) {
      if (prismaCode(e) === 'P2002') throw conflict('SLUG_TAKEN', 'Slug đã tồn tại');
      if (prismaCode(e) === 'P2025') throw notFound();
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.post.delete({ where: { id } });
    } catch (e) {
      if (prismaCode(e) === 'P2025') throw notFound();
      throw e;
    }
    return { ok: true };
  }
}
