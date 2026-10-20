import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, JwtGuard, OptionalJwtGuard, type RequestUser } from '../auth/jwt.guard';
import { ZodPipe } from '../common/zod.pipe';
import { CommentsService } from './comments.service';

const commentSchema = z.object({
  content: z
    .string({ required_error: 'Vui lòng nhập nội dung', invalid_type_error: 'Nội dung không hợp lệ' })
    .trim()
    .min(1, 'Vui lòng nhập nội dung')
    .max(1000, 'Nội dung tối đa 1000 ký tự'),
});

@Controller('posts/:slug/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post()
  @UseGuards(JwtGuard)
  create(
    @Param('slug') slug: string,
    @Body(new ZodPipe(commentSchema)) body: z.infer<typeof commentSchema>,
    @CurrentUser() user: RequestUser | undefined,
  ) {
    return this.comments.create(user!.id, slug, body.content);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  list(@Param('slug') slug: string, @CurrentUser() user: RequestUser | undefined) {
    return this.comments.list(slug, user?.id);
  }
}
