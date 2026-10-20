import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ModerationService } from '../moderation/moderation.service';
import { PrismaService } from '../prisma/prisma.service';

const already = () =>
  new ConflictException({ statusCode: 409, error: 'ALREADY_REVIEWED', message: 'Bạn đã đánh giá sản phẩm này rồi' });

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  private async requireProduct(productId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) throw new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm' });
  }

  async create(userId: string, productId: string, rating: number, content: string) {
    await this.requireProduct(productId);
    const purchased = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, status: 'COMPLETED' } },
      select: { id: true },
    });
    if (!purchased) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'NOT_PURCHASED',
        message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng',
      });
    }
    const exists = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });
    if (exists) throw already();
    const status = await this.moderation.check(content);
    try {
      return await this.prisma.review.create({ data: { userId, productId, rating, content, status } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw already();
      throw e;
    }
  }

  async list(productId: string, viewerId?: string) {
    await this.requireProduct(productId);
    const rows = await this.prisma.review.findMany({
      where: {
        productId,
        OR: [{ status: 'VISIBLE' }, ...(viewerId ? [{ status: 'PENDING' as const, userId: viewerId }] : [])],
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      status: r.status,
      createdAt: r.createdAt,
      authorName: r.user.name,
    }));
  }
}
