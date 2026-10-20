import { Injectable, NotFoundException } from '@nestjs/common';
import { ModerationService } from '../moderation/moderation.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  /** A post is open to comments/reads only when PUBLISHED with publishAt null or already past. */
  private async requirePublishedPost(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED', OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      select: { id: true },
    });
    if (!post) throw new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy bài viết' });
    return post;
  }

  async create(userId: string, slug: string, content: string) {
    const post = await this.requirePublishedPost(slug);
    const status = await this.moderation.check(content);
    return this.prisma.comment.create({ data: { userId, postId: post.id, content, status } });
  }

  async list(slug: string, viewerId?: string) {
    const post = await this.requirePublishedPost(slug);
    const rows = await this.prisma.comment.findMany({
      where: {
        postId: post.id,
        OR: [{ status: 'VISIBLE' }, ...(viewerId ? [{ status: 'PENDING' as const, userId: viewerId }] : [])],
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      content: c.content,
      status: c.status,
      createdAt: c.createdAt,
      authorName: c.user.name,
    }));
  }
}
