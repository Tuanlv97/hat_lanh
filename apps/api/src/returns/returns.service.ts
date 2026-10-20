import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ReturnReason, ReturnStatus } from '@hatlanh/shared';
import { NOTIFIER, type Notifier } from '../notifications/notifier';
import { PrismaService } from '../prisma/prisma.service';

export type ReturnLineInput = { orderItemId: string; quantity: number; reason: ReturnReason };
export type AdminReturnLineInput = ReturnLineInput & { restock: boolean };

const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

const notFound = (error: string, message: string) => new NotFoundException({ statusCode: 404, error, message });
const badRequest = (error: string, message: string, extra: Record<string, unknown> = {}) =>
  new BadRequestException({ statusCode: 400, error, message, ...extra });
const orderNotFound = () => notFound('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');

const returnInclude = {
  items: {
    orderBy: { id: 'asc' },
    include: { orderItem: { select: { id: true, productId: true, variantId: true, productName: true, variantLabel: true, quantity: true } } },
  },
} satisfies Prisma.ReturnRequestInclude;

const adminReturnInclude = {
  ...returnInclude,
  order: {
    select: {
      id: true,
      code: true,
      fullName: true,
      phone: true,
      status: true,
      completedAt: true,
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ReturnRequestInclude;

const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFIER) private readonly notifier: Notifier,
  ) {}

  /** Customer self-service return on their own COMPLETED order. Guest orders and other users' orders are 404. */
  async createForCustomer(userId: string, code: string, items: ReturnLineInput[], note = '') {
    const created = await this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, code);
      if (!order || order.userId !== userId) throw orderNotFound();
      await this.checkLines(tx, order, items);
      return tx.returnRequest.create({
        data: {
          orderId: order.id,
          status: 'REQUESTED',
          source: 'CUSTOMER',
          note,
          items: { create: items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity, reason: i.reason, restock: false })) },
        },
        include: { ...returnInclude, order: { select: { code: true, fullName: true } } },
      });
    }, TX_OPTIONS);

    // The return is committed; a notification failure must never undo or fail it.
    try {
      await this.notifier.notify({
        type: 'RETURN_REQUESTED',
        orderCode: created.order.code,
        returnId: created.id,
        fullName: created.order.fullName,
        itemCount: created.items.length,
      });
    } catch (e) {
      this.logger.error(`Notifier failed for return ${created.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
    const { order: _order, ...rest } = created;
    return rest;
  }

  /** Shop-created return (customer contacted via Zalo/Facebook, or a guest order): APPROVED at once, restock applied. */
  async createByAdmin(code: string, items: AdminReturnLineInput[], note = '') {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, code);
      if (!order) throw orderNotFound();
      const orderItems = await this.checkLines(tx, order, items);
      const created = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          status: 'APPROVED',
          source: 'ADMIN',
          note,
          items: {
            create: items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity, reason: i.reason, restock: i.restock })),
          },
        },
        include: adminReturnInclude,
      });
      const variantOf = new Map(orderItems.map((oi) => [oi.id, oi.variantId]));
      await this.restock(
        tx,
        items.filter((i) => i.restock).map((i) => ({ variantId: variantOf.get(i.orderItemId)!, quantity: i.quantity })),
      );
      return created;
    }, TX_OPTIONS);
  }

  adminList(status?: ReturnStatus) {
    return this.prisma.returnRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: adminReturnInclude,
    });
  }

  /**
   * Approve or reject a REQUESTED return. Race-safe: the status update is guarded on REQUESTED,
   * so of two simultaneous decisions only one applies (stock is restored at most once).
   * Approving adds stock back only for the return items listed in `restockItemIds`.
   */
  async decide(id: string, decision: 'APPROVED' | 'REJECTED', restockItemIds: string[] = []) {
    await this.prisma.$transaction(async (tx) => {
      const ret = await tx.returnRequest.findUnique({
        where: { id },
        select: {
          status: true,
          items: { select: { id: true, quantity: true, orderItem: { select: { variantId: true } } } },
        },
      });
      if (!ret) throw notFound('RETURN_NOT_FOUND', 'Không tìm thấy yêu cầu hoàn trả');
      const alreadyDecided = () =>
        new ConflictException({ statusCode: 409, error: 'ALREADY_DECIDED', message: 'Yêu cầu hoàn trả đã được xử lý', status: ret.status });
      if (ret.status !== 'REQUESTED') throw alreadyDecided();

      const restockIds = new Set(restockItemIds);
      const own = new Set(ret.items.map((i) => i.id));
      const foreign = [...restockIds].filter((rid) => !own.has(rid));
      if (foreign.length > 0) {
        throw badRequest('RETURN_ITEM_NOT_IN_RETURN', 'Sản phẩm nhập lại kho không thuộc yêu cầu hoàn trả này', { itemIds: foreign });
      }

      const { count } = await tx.returnRequest.updateMany({ where: { id, status: 'REQUESTED' }, data: { status: decision } });
      // Someone else decided between our read and our update.
      if (count === 0) throw alreadyDecided();

      if (decision === 'APPROVED' && restockIds.size > 0) {
        await tx.returnItem.updateMany({ where: { returnId: id, id: { in: [...restockIds] } }, data: { restock: true } });
        await this.restock(
          tx,
          ret.items.filter((i) => restockIds.has(i.id)).map((i) => ({ variantId: i.orderItem.variantId, quantity: i.quantity })),
        );
      }
    }, TX_OPTIONS);
    return this.prisma.returnRequest.findUniqueOrThrow({ where: { id }, include: adminReturnInclude });
  }

  /**
   * Finds the order by code and takes a row lock on it. Every return creation for one order serialises here,
   * so the "already requested" sums read afterwards include any concurrent request that committed first.
   */
  private async lockOrder(tx: Prisma.TransactionClient, code: string) {
    const rows = await tx.$queryRaw<{ id: string; userId: string | null; status: string }[]>`
      SELECT "id", "userId", "status"::text AS "status" FROM "Order" WHERE "code" = ${code.trim().toUpperCase()} FOR UPDATE`;
    return rows[0];
  }

  /** Order must be COMPLETED; every line must belong to it and fit in ordered − Σ(non-REJECTED returns). */
  private async checkLines(
    tx: Prisma.TransactionClient,
    order: { id: string; status: string },
    items: ReturnLineInput[],
  ) {
    if (order.status !== 'COMPLETED') {
      throw badRequest('ORDER_NOT_COMPLETED', 'Chỉ có thể hoàn trả đơn hàng đã hoàn thành');
    }
    const ids = items.map((i) => i.orderItemId);
    const orderItems = await tx.orderItem.findMany({
      where: { id: { in: ids }, orderId: order.id },
      select: { id: true, variantId: true, productName: true, variantLabel: true, quantity: true },
    });
    const byId = new Map(orderItems.map((oi) => [oi.id, oi]));
    const foreign = ids.filter((id) => !byId.has(id));
    if (foreign.length > 0) {
      throw badRequest('ORDER_ITEM_NOT_IN_ORDER', 'Sản phẩm không thuộc đơn hàng này', { orderItemIds: foreign });
    }

    const used = await tx.returnItem.groupBy({
      by: ['orderItemId'],
      where: { orderItemId: { in: ids }, request: { status: { not: 'REJECTED' } } },
      _sum: { quantity: true },
    });
    const usedById = new Map(used.map((u) => [u.orderItemId, u._sum.quantity ?? 0]));
    for (const line of items) {
      const oi = byId.get(line.orderItemId)!;
      const remaining = oi.quantity - (usedById.get(oi.id) ?? 0);
      if (line.quantity > remaining) {
        throw badRequest(
          'RETURN_QUANTITY_EXCEEDED',
          `"${oi.productName} - ${oi.variantLabel}" chỉ còn có thể hoàn tối đa ${Math.max(remaining, 0)}`,
          { orderItemId: oi.id, remaining: Math.max(remaining, 0) },
        );
      }
    }
    return orderItems;
  }

  /** Adds stock back, locking variants in the same (code-unit sorted id) order as order create/cancel. */
  private async restock(tx: Prisma.TransactionClient, lines: { variantId: string; quantity: number }[]) {
    const merged = new Map<string, number>();
    for (const l of lines) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.quantity);
    for (const variantId of [...merged.keys()].sort(byString)) {
      await tx.variant.update({ where: { id: variantId }, data: { stock: { increment: merged.get(variantId)! } } });
    }
  }
}
