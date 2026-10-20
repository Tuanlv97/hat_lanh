import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RETURN_REASONS, type ReturnReason } from '@hatlanh/shared';
import { PrismaService } from '../prisma/prisma.service';

export type RevenueGroup = 'day' | 'week' | 'month';

/** COUNT/SUM come back from Postgres as bigint; quantities and VND amounts are far below 2^53. */
const num = (v: bigint | number | null): number => {
  const n = Number(v ?? 0);
  if (!Number.isSafeInteger(n)) throw new RangeError('Report value out of safe integer range');
  return n;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Units sold per product in non-cancelled orders created in [from, to]. */
  async bestSellers(from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<{ productId: string; name: string; quantity: bigint }[]>`
      SELECT oi."productId" AS "productId", MAX(oi."productName") AS name, SUM(oi.quantity) AS quantity
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${from} AND o."createdAt" <= ${to}
      GROUP BY oi."productId"
      ORDER BY quantity DESC, name ASC`;
    return rows.map((r) => ({ productId: r.productId, name: r.name, quantity: num(r.quantity) }));
  }

  /**
   * Approved returns whose request was created in [from, to]; soldQuantity is the product's units in
   * non-cancelled orders CREATED in the same [from, to] (same basis as best-sellers).
   */
  async returns(from: Date, to: Date) {
    const returned = await this.prisma.$queryRaw<
      { productId: string; name: string; reason: ReturnReason; quantity: bigint }[]
    >`
      SELECT oi."productId" AS "productId", MAX(oi."productName") AS name, ri.reason::text AS reason, SUM(ri.quantity) AS quantity
      FROM "ReturnItem" ri
      JOIN "ReturnRequest" rr ON rr.id = ri."returnId"
      JOIN "OrderItem" oi ON oi.id = ri."orderItemId"
      WHERE rr.status = 'APPROVED' AND rr."createdAt" >= ${from} AND rr."createdAt" <= ${to}
      GROUP BY oi."productId", ri.reason`;
    if (returned.length === 0) return [];
    const ids = [...new Set(returned.map((r) => r.productId))];
    const sold = await this.prisma.$queryRaw<{ productId: string; quantity: bigint }[]>`
      SELECT oi."productId" AS "productId", SUM(oi.quantity) AS quantity
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${from} AND o."createdAt" <= ${to}
        AND oi."productId" IN (${Prisma.join(ids)})
      GROUP BY oi."productId"`;
    const soldBy = new Map(sold.map((s) => [s.productId, num(s.quantity)]));

    const byProduct = new Map<
      string,
      { productId: string; name: string; returnedQuantity: number; reasons: Record<ReturnReason, number> }
    >();
    for (const r of returned) {
      let e = byProduct.get(r.productId);
      if (!e) {
        e = {
          productId: r.productId,
          name: r.name,
          returnedQuantity: 0,
          reasons: Object.fromEntries(RETURN_REASONS.map((k) => [k, 0])) as Record<ReturnReason, number>,
        };
        byProduct.set(r.productId, e);
      }
      const q = num(r.quantity);
      e.returnedQuantity += q;
      e.reasons[r.reason] += q;
    }
    return [...byProduct.values()]
      .map((e) => {
        const soldQuantity = soldBy.get(e.productId) ?? 0;
        const rate = soldQuantity === 0 ? 0 : Math.round((e.returnedQuantity / soldQuantity) * 10_000) / 10_000;
        return { ...e, soldQuantity, rate };
      })
      .sort((a, b) => b.returnedQuantity - a.returnedQuantity || a.name.localeCompare(b.name));
  }

  /**
   * Revenue of COMPLETED orders (items only, net of APPROVED returns), bucketed by the order's
   * completedAt in Asia/Ho_Chi_Minh. The column is `timestamp` (UTC wall-clock), hence the double AT TIME ZONE.
   * `group` is validated to day|week|month and still bound as a parameter.
   */
  async revenue(from: Date, to: Date, group: RevenueGroup) {
    const rows = await this.prisma.$queryRaw<{ period: string; revenue: bigint }[]>`
      SELECT to_char(date_trunc(${group}, o."completedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS period,
             SUM(oi."unitPriceVnd"::bigint * (oi.quantity - COALESCE(rt.qty, 0))) AS revenue
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      LEFT JOIN (
        SELECT ri."orderItemId" AS "orderItemId", SUM(ri.quantity) AS qty
        FROM "ReturnItem" ri
        JOIN "ReturnRequest" rr ON rr.id = ri."returnId"
        WHERE rr.status = 'APPROVED'
        GROUP BY ri."orderItemId"
      ) rt ON rt."orderItemId" = oi.id
      WHERE o.status = 'COMPLETED' AND o."completedAt" >= ${from} AND o."completedAt" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC`;
    return rows.map((r) => ({ period: r.period, revenueVnd: num(r.revenue) }));
  }
}
