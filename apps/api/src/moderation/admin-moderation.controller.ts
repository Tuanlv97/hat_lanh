import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { MODERATION_STATUSES } from '@hatlanh/shared';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const KINDS = ['review', 'comment'] as const;
type Kind = (typeof KINDS)[number];

const listQuerySchema = z.object({
  status: z.enum(MODERATION_STATUSES, { errorMap: () => ({ message: 'Trạng thái không hợp lệ' }) }).default('PENDING'),
  kind: z.enum(KINDS, { errorMap: () => ({ message: 'Loại không hợp lệ' }) }).optional(),
});
const actionSchema = z.object({
  action: z.enum(['approve', 'hide'], { errorMap: () => ({ message: 'Hành động không hợp lệ' }) }),
});

const kindOf = (kind: string): Kind => {
  if (kind !== 'review' && kind !== 'comment') {
    throw new BadRequestException({ statusCode: 400, error: 'BAD_REQUEST', message: 'Loại không hợp lệ' });
  }
  return kind;
};
const notFound = () => new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy nội dung' });

@Controller('admin/moderation')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminModerationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query(new ZodPipe(listQuerySchema)) q: z.infer<typeof listQuerySchema>) {
    const [reviews, comments] = await Promise.all([
      q.kind === 'comment'
        ? []
        : this.prisma.review.findMany({
            where: { status: q.status },
            include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
          }),
      q.kind === 'review'
        ? []
        : this.prisma.comment.findMany({
            where: { status: q.status },
            include: { user: { select: { name: true } }, post: { select: { title: true, slug: true } } },
          }),
    ]);
    return [
      ...reviews.map((r) => ({
        kind: 'review' as const,
        id: r.id,
        content: r.content,
        rating: r.rating,
        authorName: r.user.name,
        targetName: r.product.name,
        targetSlug: r.product.slug,
        status: r.status,
        createdAt: r.createdAt,
      })),
      ...comments.map((c) => ({
        kind: 'comment' as const,
        id: c.id,
        content: c.content,
        authorName: c.user.name,
        targetName: c.post.title,
        targetSlug: c.post.slug,
        status: c.status,
        createdAt: c.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  @Patch(':kind/:id')
  async decide(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body(new ZodPipe(actionSchema)) body: z.infer<typeof actionSchema>,
  ) {
    const k = kindOf(kind);
    const status = body.action === 'approve' ? ('VISIBLE' as const) : ('HIDDEN' as const);
    const result =
      k === 'review'
        ? await this.prisma.review.updateMany({ where: { id }, data: { status } })
        : await this.prisma.comment.updateMany({ where: { id }, data: { status } });
    if (result.count === 0) throw notFound();
    return { kind: k, id, status };
  }

  @Delete(':kind/:id')
  async remove(@Param('kind') kind: string, @Param('id') id: string) {
    const k = kindOf(kind);
    const result =
      k === 'review'
        ? await this.prisma.review.deleteMany({ where: { id } })
        : await this.prisma.comment.deleteMany({ where: { id } });
    if (result.count === 0) throw notFound();
    return { ok: true };
  }
}
