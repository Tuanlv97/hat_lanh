import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { RETURN_REASONS } from '@hatlanh/shared';
import { z } from 'zod';
import { CurrentUser, JwtGuard, type RequestUser } from '../auth/jwt.guard';
import { ZodPipe } from '../common/zod.pipe';
import { ReturnsService } from './returns.service';

export const MAX_RETURN_LINES = 50;
/** Upper bound only to keep values in int4; the real limit is the ordered quantity (RETURN_QUANTITY_EXCEEDED). */
const MAX_LINE_QUANTITY = 10_000;

export const returnLineSchema = z.object({
  orderItemId: z.string().min(1, 'Thiếu sản phẩm').max(100),
  quantity: z
    .number({ required_error: 'Thiếu số lượng', invalid_type_error: 'Số lượng phải là số' })
    .int('Số lượng phải là số nguyên')
    .min(1, 'Số lượng tối thiểu là 1')
    .max(MAX_LINE_QUANTITY, 'Số lượng quá lớn'),
  reason: z.enum(RETURN_REASONS, { errorMap: () => ({ message: 'Lý do không hợp lệ' }) }),
});

export const noteSchema = z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional();

/** Lines must be 1..50 with distinct orderItemIds. */
export const linesOf = <T extends z.ZodTypeAny>(line: T) =>
  z
    .array(line, { required_error: 'Chọn ít nhất 1 sản phẩm' })
    .min(1, 'Chọn ít nhất 1 sản phẩm')
    .max(MAX_RETURN_LINES, `Tối đa ${MAX_RETURN_LINES} sản phẩm mỗi yêu cầu`)
    .refine(
      (items) => new Set(items.map((i: { orderItemId: string }) => i.orderItemId)).size === items.length,
      'Mỗi sản phẩm chỉ được chọn một lần',
    );

const customerReturnSchema = z.object({ items: linesOf(returnLineSchema), note: noteSchema });

@Controller('me/orders')
@UseGuards(JwtGuard)
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post(':code/returns')
  create(
    @Param('code') code: string,
    @Body(new ZodPipe(customerReturnSchema)) body: z.infer<typeof customerReturnSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.returns.createForCustomer(user.id, code, body.items, body.note ?? '');
  }
}
