'use client';

import Link from 'next/link';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StateMessage } from '@/components/StateMessage';
import { RequireAuth } from '@/components/account/RequireAuth';
import { useMyOrders } from '@/lib/use-my-orders';
import { OrderDates, OrderLines, StatusPill } from './OrderParts';
import { ReturnForm } from './ReturnForm';
import { ReviewList } from './ReviewForm';

export function OrderDetailView({ code }: { code: string }) {
  return <RequireAuth>{() => <OrderDetail code={code} />}</RequireAuth>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <nav aria-label="Đường dẫn" className="text-base">
        <Link href="/tai-khoan/don-hang" className="inline-flex min-h-11 items-center text-ink-600 hover:text-ink-800 hover:underline underline-offset-4">
          ← Đơn hàng của tôi
        </Link>
      </nav>
      {children}
    </div>
  );
}

function OrderDetail({ code }: { code: string }) {
  const { state, reload } = useMyOrders();
  const order = useMemo(
    () => (state.status === 'ready' ? state.orders.find((o) => o.code.toUpperCase() === code.trim().toUpperCase()) : undefined),
    [state, code],
  );

  // Links like /tai-khoan/don-hang/HL…#danh-gia-<id> land on content that appears after loading.
  useEffect(() => {
    if (!order || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [order]);

  if (state.status === 'loading') {
    return (
      <Shell>
        <p role="status" className="mt-6 text-lg">
          Đang tải đơn hàng…
        </p>
      </Shell>
    );
  }
  if (state.status === 'error') {
    return (
      <Shell>
        <div role="alert" className="mt-6 rounded-[var(--radius-softer)] bg-green-100 px-6 py-8">
          <p className="text-lg">Chưa tải được đơn hàng. Bạn kiểm tra mạng rồi thử lại nhé.</p>
          <button type="button" onClick={() => void reload()} className="mt-4 inline-flex h-12 cursor-pointer items-center rounded-full bg-ink-800 px-6 font-medium text-bg hover:opacity-90">
            Thử lại
          </button>
        </div>
      </Shell>
    );
  }
  if (!order) {
    return (
      <Shell>
        <div className="mt-6">
          <StateMessage
            title="Không tìm thấy đơn này"
            body="Đơn này không có trong tài khoản của bạn. Đơn đặt khi chưa đăng nhập thì tra cứu bằng mã đơn và số điện thoại."
            action={{ href: '/tra-cuu-don', label: 'Tra cứu đơn' }}
          />
        </div>
      </Shell>
    );
  }

  const completed = order.status === 'COMPLETED';

  return (
    <Shell>
      <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
        <h1 className="text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.03em] tabular-nums">
          <span className="sr-only">Đơn hàng </span>
          {order.code}
        </h1>
        <StatusPill status={order.status} className="mb-1" />
      </div>
      <div className="mt-4">
        <OrderDates order={order} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
        <section aria-labelledby="ct-san-pham" className="rounded-[var(--radius-softer)] bg-green-100 p-5 sm:p-7 lg:self-start">
          <h2 id="ct-san-pham" className="mb-4 text-xl font-semibold">
            Sản phẩm trong đơn
          </h2>
          <OrderLines order={order} />
        </section>

        <div className="space-y-10">
          {completed ? (
            <ReturnForm order={order} />
          ) : (
            <section aria-labelledby="ct-sau" className="rounded-[var(--radius-softer)] bg-surface p-6">
              <h2 id="ct-sau" className="text-xl font-semibold">
                Hoàn trả và đánh giá
              </h2>
              <p className="mt-2 text-base">
                {order.status === 'CANCELLED'
                  ? 'Đơn đã hủy nên không có hoàn trả hay đánh giá.'
                  : 'Khi đơn hoàn thành, bạn có thể gửi yêu cầu hoàn trả và đánh giá sản phẩm ngay tại đây.'}
              </p>
            </section>
          )}
        </div>
      </div>

      {completed && <ReviewList order={order} />}
    </Shell>
  );
}
