import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { PostsService } from './posts.service';

const fields = {
  title: z.string({ required_error: 'Vui lòng nhập tiêu đề' }).trim().min(1, 'Vui lòng nhập tiêu đề').max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),
  html: z.string({ required_error: 'Vui lòng nhập nội dung' }).max(500_000),
  topicId: z.string().min(1).nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED'], { errorMap: () => ({ message: 'Trạng thái không hợp lệ' }) }),
  publishAt: z
    .string()
    .datetime({ offset: true, message: 'Thời gian đăng không hợp lệ' })
    .transform((s) => new Date(s))
    .nullable(),
  productIds: z.array(z.string().min(1)).max(50),
};
const createSchema = z.object({
  title: fields.title,
  html: fields.html,
  status: fields.status,
  slug: fields.slug.optional(),
  topicId: fields.topicId.optional(),
  publishAt: fields.publishAt.optional(),
  productIds: fields.productIds.optional(),
});
const updateSchema = z.object(fields).partial();

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPostsController {
  constructor(private readonly posts: PostsService) {}

  @Get('posts')
  list() {
    return this.posts.adminList();
  }

  @Get('posts/:id')
  get(@Param('id') id: string) {
    return this.posts.adminGet(id);
  }

  @Post('posts')
  create(@Body(new ZodPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.posts.create(body);
  }

  @Patch('posts/:id')
  update(@Param('id') id: string, @Body(new ZodPipe(updateSchema)) body: z.infer<typeof updateSchema>) {
    return this.posts.update(id, body);
  }

  @Delete('posts/:id')
  @HttpCode(200)
  remove(@Param('id') id: string) {
    return this.posts.remove(id);
  }
}
