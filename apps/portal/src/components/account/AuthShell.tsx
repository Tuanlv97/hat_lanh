import Link from 'next/link';
import type { ReactNode } from 'react';

/** Two-part layout for sign-in pages: the form, and beside it what an account is for (guests never need one). */
export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <div className="max-w-xl">
          <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">{title}</h1>
          <p className="mt-4 max-w-[48ch] text-lg">{lead}</p>
          <div className="mt-8">{children}</div>
        </div>

        <aside aria-labelledby="tk-loi-ich" className="rounded-[var(--radius-softer)] bg-green-100 p-6 sm:p-8 lg:self-start">
          <h2 id="tk-loi-ich" className="text-xl font-semibold">
            Tài khoản để làm gì?
          </h2>
          <ul className="mt-4 space-y-3 text-base">
            <li>Xem lại mọi đơn đã đặt và trạng thái giao hàng.</li>
            <li>Gửi yêu cầu hoàn trả khi đơn đã hoàn thành.</li>
            <li>Đánh giá sản phẩm bạn đã mua và nhận.</li>
          </ul>
          <div className="mt-6 rounded-2xl bg-surface px-4 py-4">
            <p className="text-base">Không cần tài khoản vẫn đặt hàng được. Đã đặt mà chưa có tài khoản?</p>
            <Link href="/tra-cuu-don" className="mt-1 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
              Tra cứu đơn bằng mã đơn
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function Redirecting({ label = 'Đang chuyển trang…' }: { label?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <p role="status" className="text-lg">
        {label}
      </p>
    </div>
  );
}
