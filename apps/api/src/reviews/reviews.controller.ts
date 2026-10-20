import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, JwtGuard, OptionalJwtGuard, type RequestUser } from '../auth/jwt.guard';
import { ZodPipe } from '../common/zod.pipe';
import { ReviewsService } from './reviews.service';

const reviewSchema = z.object({
  rating: z
    .number({ required_error: 'Vui lòng chọn số sao', invalid_type_error: 'Số sao phải là số' })
    .int('Số sao phải là số nguyên')
    .min(1, 'Tối thiểu 1 sao')
    .max(5, 'Tối đa 5 sao'),
  content: z
    .string({ required_error: 'Vui lòng nhập nội dung', invalid_type_error: 'Nội dung không hợp lệ' })
    .trim()
    .min(1, 'Vui lòng nhập nội dung')
    .max(1000, 'Nội dung tối đa 1000 ký tự'),
});

@Controller('products/:id/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @UseGuards(JwtGuard)
  create(
    @Param('id') id: string,
    @Body(new ZodPipe(reviewSchema)) body: z.infer<typeof reviewSchema>,
    @CurrentUser() user: RequestUser | undefined,
  ) {
    return this.reviews.create(user!.id, id, body.rating, body.content);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  list(@Param('id') id: string, @CurrentUser() user: RequestUser | undefined) {
    return this.reviews.list(id, user?.id);
  }
}
