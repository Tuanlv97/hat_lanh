import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RETURN_STATUSES } from '@hatlanh/shared';
import { z } from 'zod';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodPipe } from '../common/zod.pipe';
import { linesOf, noteSchema, returnLineSchema } from './returns.controller';
import { ReturnsService } from './returns.service';

const listQuerySchema = z.object({
  status: z.enum(RETURN_STATUSES, { errorMap: () => ({ message: 'Trạng thái không hợp lệ' }) }).optional(),
});

const adminCreateSchema = z.object({
  orderCode: z.string().trim().min(1, 'Vui lòng nhập mã đơn').max(20),
  items: linesOf(returnLineSchema.extend({ restock: z.boolean({ required_error: 'Chọn có nhập lại kho hay không' }) })),
  note: noteSchema,
});

const decisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED'], { errorMap: () => ({ message: 'Quyết định không hợp lệ' }) }),
    restockItemIds: z.array(z.string().min(1).max(100)).max(50).optional(),
  })
  .refine((b) => b.decision === 'APPROVED' || !b.restockItemIds?.length, {
    message: 'Từ chối hoàn trả không nhập lại kho',
    path: ['restockItemIds'],
  });

@Controller('admin/returns')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  list(@Query(new ZodPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.returns.adminList(query.status);
  }

  /** Shop-created return: APPROVED immediately, stock added back for lines with `restock: true`. */
  @Post()
  create(@Body(new ZodPipe(adminCreateSchema)) body: z.infer<typeof adminCreateSchema>) {
    return this.returns.createByAdmin(body.orderCode, body.items, body.note ?? '');
  }

  @Patch(':id/decision')
  @HttpCode(200)
  decide(@Param('id') id: string, @Body(new ZodPipe(decisionSchema)) body: z.infer<typeof decisionSchema>) {
    return this.returns.decide(id, body.decision, body.restockItemIds ?? []);
  }
}
