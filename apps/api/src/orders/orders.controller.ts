import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { checkoutFormSchema } from '@hatlanh/shared';
import { z } from 'zod';
import { CurrentUser, JwtGuard, OptionalJwtGuard, type RequestUser } from '../auth/jwt.guard';
import { ZodPipe } from '../common/zod.pipe';
import { MAX_QUANTITY, OrdersService, type CreateOrderInput } from './orders.service';

export const createOrderSchema = checkoutFormSchema.extend({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1, 'Thiếu sản phẩm').max(100),
        quantity: z
          .number({ invalid_type_error: 'Số lượng phải là số' })
          .int('Số lượng phải là số nguyên')
          .min(1, 'Số lượng tối thiểu là 1')
          .max(MAX_QUANTITY, `Số lượng tối đa là ${MAX_QUANTITY}`),
      }),
      { required_error: 'Giỏ hàng trống' },
    )
    .min(1, 'Giỏ hàng trống')
    .max(50, 'Tối đa 50 sản phẩm mỗi đơn'),
});

const lookupSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã đơn').max(20),
  phone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại').max(20),
});

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Guests and logged-in customers. Name/phone/email always come from the form. */
  @Post('orders')
  @UseGuards(OptionalJwtGuard)
  create(
    @Body(new ZodPipe(createOrderSchema)) body: CreateOrderInput,
    @CurrentUser() user: RequestUser | undefined,
  ): Promise<{ code: string; totalVnd: number }> {
    return this.orders.create(body, user?.id);
  }

  /** Guest order lookup by code + phone; 5 tries per minute per IP to stop code guessing. */
  @Get('orders/lookup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  lookup(@Query(new ZodPipe(lookupSchema)) query: z.infer<typeof lookupSchema>) {
    return this.orders.lookup(query.code, query.phone);
  }

  @Get('me/orders')
  @UseGuards(JwtGuard)
  mine(@CurrentUser() user: RequestUser) {
    return this.orders.listForUser(user.id);
  }
}
