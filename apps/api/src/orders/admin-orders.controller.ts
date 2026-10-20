import { Body, Controller, Get, HttpCode, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ORDER_STATUSES } from '@hatlanh/shared';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { OrdersService } from './orders.service';

const statusField = z.enum(ORDER_STATUSES, { errorMap: () => ({ message: 'Trạng thái không hợp lệ' }) });
const listQuerySchema = z.object({ status: statusField.optional() });
const changeStatusSchema = z.object({ status: statusField });

@Controller('admin/orders')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query(new ZodPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.orders.adminList(query.status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.adminGet(id);
  }

  /** Allowed moves come from nextOrderStatuses(); CANCELLED restores stock, COMPLETED stamps completedAt. */
  @Patch(':id/status')
  @HttpCode(200)
  changeStatus(@Param('id') id: string, @Body(new ZodPipe(changeStatusSchema)) body: z.infer<typeof changeStatusSchema>) {
    return this.orders.changeStatus(id, body.status);
  }
}
