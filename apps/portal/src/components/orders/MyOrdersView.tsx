'use client';

import type { AuthUser } from '@hatlanh/shared';
import Link from 'next/link';
import { Price } from '@/components/Price';
import { StateMessage } from '@/components/StateMessage';
import { RequireAuth } from '@/components/account/RequireAuth';
import { formatDateVi } from '@/lib/catalog';
import { itemSummary } from '@/lib/orders';
import { useMyOrders } from '@/lib/use-my-orders';
import { StatusPill } from './OrderParts';

export function MyOrdersView() {
  return <RequireAuth>{(user) => <MyOrders user={user} />}</RequireAuth>;
}

function MyOrders({ user }: { user: AuthUser }) {
  const { state, reload } = useMyOrders();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">Đơn hàng của tôi</h1>
      <p className="mt-4 max-w-[56ch] text-lg">
        Chào {user.name}. Đơn hoàn thành có thể gửi yêu cầu hoàn trả và đánh giá sản phẩm.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div>
          {state.status === 'loading' && (
            <p role="status" className="text-lg">
              Đang tải đơn hàng…
            </p>
          )}
          {state.status === 'error' && (
            <div role="alert" className="rounded-[var(--radius-softer)] bg-green-100 px-6 py-8">
              <p className="text-lg">Chưa tải được đơn hàng. Bạn kiểm tra mạng rồi thử lại nhé.</p>
              <button type="button" onClick={() => void reload()} className="mt-4 inline-flex h-12 cursor-pointer items-center rounded-full bg-ink-800 px-6 font-medium text-bg hover:opacity-90">
                Thử lại
              </button>
            </div>
          )}
          {state.status === 'ready' && state.orders.length === 0 && (
            <StateMessage
              title="Chưa có đơn nào"
              body="Đơn bạn đặt khi đã đăng nhập sẽ hiện ở đây."
              action={{ href: '/san-pham', label: 'Xem sản phẩm' }}
            />
          )}
          {state.status === 'ready' && state.orders.length > 0 && (
            <ul className="space-y-3" aria-label="Danh sách đơn hàng">
              {state.orders.map((o) => (
                <li key={o.code}>
                  <Link
                    href={`/tai-khoan/don-hang/${encodeURIComponent(o.code)}`}
                    className="group grid gap-3 rounded-[var(--radius-soft)] bg-green-100 px-5 py-5 transition-colors duration-200 hover:bg-green-500 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className="text-lg font-semibold tracking-wide tabular-nums">{o.code}</span>
                        <StatusPill status={o.status} className="group-hover:bg-surface" />
                      </p>
                      <p className="mt-2 truncate text-base">{itemSummary(o)}</p>
                      <p className="text-base text-ink-600">
                        Đặt ngày <time dateTime={o.createdAt}>{formatDateVi(o.createdAt)}</time>
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <Price amount={o.totalVnd} className="text-xl font-semibold" />
                      <span className="text-base font-medium underline underline-offset-4">Xem chi tiết</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside aria-labelledby="dh-khac" className="rounded-[var(--radius-softer)] bg-surface p-6 lg:self-start">
          <h2 id="dh-khac" className="text-lg font-semibold">
            Không thấy đơn của bạn?
          </h2>
          <p className="mt-2 text-base">
            Đơn đặt khi chưa đăng nhập không tự vào tài khoản. Bạn tra cứu bằng mã đơn và số điện thoại đã dùng khi đặt.
          </p>
          <Link href="/tra-cuu-don" className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
            Tra cứu đơn
          </Link>
        </aside>
      </div>
    </div>
  );
}
