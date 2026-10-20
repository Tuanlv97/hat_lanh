import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextOrderStatuses, normalizePhone, type CheckoutForm, type OrderStatus } from '@hatlanh/shared';
import { AddressService } from '../address/address.service';
import { NOTIFIER, type Notifier } from '../notifications/notifier';
import { PrismaService } from '../prisma/prisma.service';
import { generateOrderCode } from './order-code';

export type CreateOrderInput = CheckoutForm & { items: { variantId: string; quantity: number }[] };

export const MAX_QUANTITY = 99;
const MAX_TOTAL_VND = 2_147_483_647; // Order.totalVnd is a Postgres int4
const CODE_ATTEMPTS = 5;
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

const notFound = (error: string, message: string) => new NotFoundException({ statusCode: 404, error, message });
const conflict = (error: string, message: string, extra: Record<string, unknown> = {}) =>
  new ConflictException({ statusCode: 409, error, message, ...extra });
const badField = (field: string, message: string) =>
  new BadRequestException({ statusCode: 400, error: 'VALIDATION_ERROR', fields: { [field]: message } });

const isCodeCollision = (e: unknown): boolean => {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') return false;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes('code') : String(target ?? '').includes('code');
};

const itemSelect = {
  id: true,
  productId: true,
  variantId: true,
  productName: true,
  variantLabel: true,
  unitPriceVnd: true,
  quantity: true,
} satisfies Prisma.OrderItemSelect;

/** What the customer sees (own orders, lookup): no internal user id. */
const customerOrderSelect = {
  id: true,
  code: true,
  status: true,
  fullName: true,
  totalVnd: true,
  createdAt: true,
  completedAt: true,
  items: { select: itemSelect, orderBy: { id: 'asc' } },
} satisfies Prisma.OrderSelect;

const adminOrderInclude = {
  items: { select: itemSelect, orderBy: { id: 'asc' } },
  user: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.OrderInclude;

const newestFirst: Prisma.OrderOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly address: AddressService,
    @Inject(NOTIFIER) private readonly notifier: Notifier,
  ) {}

  /**
   * Places an order. Stock is decremented atomically with guarded updates inside one transaction:
   * any failing line (unknown/inactive/out of stock) rolls back the whole order.
   */
  async create(input: CreateOrderInput, userId?: string): Promise<{ code: string; totalVnd: number }> {
    if (!this.address.isValidWard(input.provinceCode, input.wardCode)) {
      throw badField('wardCode', 'Phường/Xã không hợp lệ');
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw badField('items', 'Giỏ hàng trống');
    }

    // Merge duplicate variants into one line (first-seen order kept).
    const merged = new Map<string, number>();
    for (const { variantId, quantity } of input.items) {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        throw badField('items', `Số lượng phải là số nguyên từ 1 đến ${MAX_QUANTITY}`);
      }
      merged.set(variantId, (merged.get(variantId) ?? 0) + quantity);
    }
    for (const q of merged.values()) {
      if (q > MAX_QUANTITY) throw badField('items', `Số lượng mỗi sản phẩm tối đa ${MAX_QUANTITY}`);
    }

    let created: { code: string; totalVnd: number; lines: { name: string; variant: string; quantity: number }[] } | undefined;
    for (let attempt = 1; !created; attempt++) {
      try {
        created = await this.prisma.$transaction((tx) => this.placeInTx(tx, input, merged, userId), TX_OPTIONS);
      } catch (e) {
        // A random code collision is astronomically rare; retry the whole transaction with a fresh code.
        if (isCodeCollision(e) && attempt < CODE_ATTEMPTS) continue;
        throw e;
      }
    }

    // The order is committed; a notification failure must never undo or fail it.
    try {
      await this.notifier.notify({
        type: 'ORDER_CREATED',
        code: created.code,
        fullName: input.fullName,
        phone: input.phone,
        totalVnd: created.totalVnd,
        lines: created.lines,
      });
    } catch (e) {
      this.logger.error(`Notifier failed for order ${created.code}: ${e instanceof Error ? e.message : String(e)}`);
    }
    return { code: created.code, totalVnd: created.totalVnd };
  }

  private async placeInTx(
    tx: Prisma.TransactionClient,
    input: CreateOrderInput,
    merged: Map<string, number>,
    userId: string | undefined,
  ) {
    const ids = [...merged.keys()];
    const variants = await tx.variant.findMany({
      where: { id: { in: ids } },
      include: { product: { select: { id: true, name: true, isActive: true } } },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));
    for (const id of ids) {
      const v = byId.get(id);
      if (!v) throw notFound('VARIANT_NOT_FOUND', 'Sản phẩm không tồn tại');
      if (!v.isActive || !v.product.isActive) {
        throw conflict('VARIANT_UNAVAILABLE', `"${v.product.name} - ${v.label}" hiện không còn bán`, { variantId: id });
      }
    }

    // Lock rows in a fixed (id) order so two multi-line orders can never deadlock each other.
    // The `stock >= q` guard is re-checked by Postgres after any concurrent update commits, so stock never goes negative.
    for (const id of [...ids].sort()) {
      const q = merged.get(id)!;
      const { count } = await tx.variant.updateMany({
        where: { id, stock: { gte: q } },
        data: { stock: { decrement: q } },
      });
      if (count === 0) {
        const v = byId.get(id)!;
        throw conflict('OUT_OF_STOCK', `"${v.product.name} - ${v.label}" không đủ hàng`, { variantId: id });
      }
    }

    const lines = ids.map((id) => {
      const v = byId.get(id)!;
      return {
        productId: v.productId,
        variantId: v.id,
        productName: v.product.name,
        variantLabel: v.label,
        unitPriceVnd: v.priceVnd,
        quantity: merged.get(id)!,
      };
    });
    const totalVnd = lines.reduce((sum, l) => sum + l.unitPriceVnd * l.quantity, 0);
    if (!Number.isSafeInteger(totalVnd) || totalVnd > MAX_TOTAL_VND) {
      throw badField('items', 'Tổng tiền đơn hàng quá lớn');
    }

    const order = await tx.order.create({
      data: {
        code: generateOrderCode(),
        userId: userId ?? null,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        provinceCode: input.provinceCode,
        wardCode: input.wardCode,
        addressDetail: input.addressDetail,
        totalVnd,
        items: { create: lines },
      },
      select: { code: true, totalVnd: true },
    });
    return {
      code: order.code,
      totalVnd: order.totalVnd,
      lines: lines.map((l) => ({ name: l.productName, variant: l.variantLabel, quantity: l.quantity })),
    };
  }

  /** Orders of a logged-in user, newest first. */
  listForUser(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, orderBy: newestFirst, select: customerOrderSelect });
  }

  /** Guest lookup. Unknown code and wrong phone give the same 404 so codes cannot be probed. */
  async lookup(code: string, phone: string) {
    const notFoundErr = notFound('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng với mã và số điện thoại này');
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) throw notFoundErr;
    const order = await this.prisma.order.findUnique({
      where: { code: code.trim().toUpperCase() },
      select: { ...customerOrderSelect, phone: true },
    });
    if (!order || order.phone !== normalizedPhone) throw notFoundErr;
    const { phone: _phone, ...rest } = order;
    return rest;
  }

  adminList(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      orderBy: newestFirst,
      include: adminOrderInclude,
    });
  }

  async adminGet(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: adminOrderInclude });
    if (!order) throw notFound('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
    return order;
  }

  /**
   * Moves an order along its lifecycle. Race-safe: the update is guarded on the status we validated,
   * so of two simultaneous changes only one applies (e.g. a double cancel restores stock once).
   */
  async changeStatus(id: string, to: OrderStatus) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        select: { status: true, items: { select: { variantId: true, quantity: true } } },
      });
      if (!order) throw notFound('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
      const invalid = () =>
        conflict('INVALID_TRANSITION', `Không thể chuyển đơn từ ${order.status} sang ${to}`, {
          from: order.status,
          to,
        });
      if (!nextOrderStatuses(order.status).includes(to)) throw invalid();

      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: to, ...(to === 'COMPLETED' ? { completedAt: new Date() } : {}) },
      });
      // Someone else changed the status between our read and our update.
      if (count === 0) throw invalid();

      if (to === 'CANCELLED') {
        // Same lock order as create() (plain code-unit sort of variant ids).
        const items = [...order.items].sort((a, b) => (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0));
        for (const item of items) {
          await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        }
      }
    }, TX_OPTIONS);
    return this.adminGet(id);
  }
}
