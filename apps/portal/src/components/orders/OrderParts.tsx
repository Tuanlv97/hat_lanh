import { Price } from '@/components/Price';
import { formatDateVi } from '@/lib/catalog';
import { orderStatusLabel, type CustomerOrder } from '@/lib/orders';

const PILL: Record<string, string> = {
  PENDING: 'bg-honey-400',
  CONFIRMED: 'bg-green-100',
  SHIPPING: 'bg-green-100',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-surface text-ink-600',
};

/** The label carries the meaning; the fill only echoes it. */
export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-base font-medium text-ink-800 ${PILL[status] ?? 'bg-green-100'} ${className}`}>
      {orderStatusLabel(status)}
    </span>
  );
}

/** One line per order item and the order total. No personal data. */
export function OrderLines({ order }: { order: Pick<CustomerOrder, 'items' | 'totalVnd'> }) {
  return (
    <div>
      <ul className="space-y-3">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-4 rounded-2xl bg-surface px-4 py-3">
            <div className="min-w-0">
              <p className="leading-snug font-medium">{it.productName}</p>
              <p className="text-base text-ink-600">
                {it.variantLabel} × {it.quantity} · <Price amount={it.unitPriceVnd} />
              </p>
            </div>
            <Price amount={it.unitPriceVnd * it.quantity} className="shrink-0 font-semibold" />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between gap-4 px-4">
        <span className="text-base font-medium">Tiền hàng</span>
        <span className="text-2xl font-semibold tracking-[-0.01em]">
          <Price amount={order.totalVnd} />
        </span>
      </div>
      <p className="mt-1 px-4 text-base text-ink-600">Phí vận chuyển được shop báo riêng khi xác nhận đơn.</p>
    </div>
  );
}

export function OrderDates({ order }: { order: Pick<CustomerOrder, 'createdAt' | 'completedAt'> }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 text-base">
      <div>
        <dt className="text-ink-600">Ngày đặt</dt>
        <dd className="font-medium">
          <time dateTime={order.createdAt}>{formatDateVi(order.createdAt)}</time>
        </dd>
      </div>
      {order.completedAt && (
        <div>
          <dt className="text-ink-600">Ngày hoàn thành</dt>
          <dd className="font-medium">
            <time dateTime={order.completedAt}>{formatDateVi(order.completedAt)}</time>
          </dd>
        </div>
      )}
    </dl>
  );
}
