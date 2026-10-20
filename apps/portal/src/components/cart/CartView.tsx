'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Price } from '@/components/Price';
import { QuantityStepper } from '@/components/QuantityStepper';
import { StateMessage } from '@/components/StateMessage';
import { MAX_LINE_QUANTITY, overStockFixes, useCart, type ResolvedLine } from '@/lib/cart';
import { PAYMENT_NOTE } from '@/lib/checkout';
import { SHIPPING_NOTE } from '@/lib/site';
import { useCartCatalog } from '@/lib/use-cart-catalog';
import { LineNotice, LineThumb } from './parts';

const primaryBtn =
  'inline-flex h-13 w-full cursor-pointer items-center justify-center rounded-full bg-ink-800 px-8 text-lg font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]';

function Skeleton({ rows }: { rows: number }) {
  return (
    <ul aria-hidden="true" className="space-y-3">
      {Array.from({ length: Math.max(1, Math.min(rows, 4)) }, (_, i) => (
        <li key={i} className="flex gap-4 rounded-[var(--radius-soft)] bg-surface p-4 sm:p-5">
          <div className="h-20 w-20 shrink-0 rounded-2xl bg-green-100 sm:h-24 sm:w-24" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-5 w-2/3 rounded-full bg-green-100" />
            <div className="h-4 w-1/3 rounded-full bg-green-100" />
            <div className="h-11 w-36 rounded-full bg-green-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CartRow({ line, onQty, onRemove }: { line: ResolvedLine; onQty(n: number): void; onRemove(): void }) {
  const name = line.item?.productName ?? 'Sản phẩm không còn bán';
  const label = line.item ? `${line.item.productName} ${line.item.label}` : name;
  const max = line.item ? Math.min(MAX_LINE_QUANTITY, line.item.stock) : 0;
  const purchasable = line.status === 'ok' || line.status === 'over_stock';

  return (
    <li className={`rounded-[var(--radius-soft)] p-4 sm:p-5 ${line.status === 'ok' ? 'bg-surface' : 'bg-green-100'}`}>
      <div className="flex gap-4">
        <LineThumb line={line} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              {line.item ? (
                <Link href={`/san-pham/${line.item.slug}`} className="text-lg leading-snug font-medium hover:underline underline-offset-4">
                  {name}
                </Link>
              ) : (
                <p className="text-lg leading-snug font-medium">{name}</p>
              )}
              {line.item && (
                <p className="text-base text-ink-600">
                  {line.item.label} · <Price amount={line.item.priceVnd} />
                </p>
              )}
            </div>
            {line.status === 'ok' && <Price amount={line.lineTotalVnd} className="text-lg font-semibold" />}
          </div>

          <LineNotice line={line} />

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            {purchasable && <QuantityStepper size="sm" value={line.quantity} max={max} onChange={onQty} label={`Số lượng ${label}`} />}
            {!purchasable && <p className="text-base text-ink-600">Số lượng trong giỏ: {line.quantity}</p>}
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-base text-ink-800 underline underline-offset-4 transition-colors duration-200 hover:bg-green-100"
              aria-label={`Xóa ${label} khỏi giỏ`}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartView() {
  const cart = useCart();
  const { state, resolved, reload } = useCartCatalog(cart.lines, cart.ready && cart.lines.length > 0);
  const [notice, setNotice] = useState('');

  // Quantities above the remaining stock are brought down to it, and the customer is told why.
  useEffect(() => {
    if (!resolved) return;
    const fixes = overStockFixes(resolved.lines);
    if (fixes.length === 0) return;
    const names = resolved.lines
      .filter((l) => fixes.some((f) => f.variantId === l.variantId))
      .map((l) => `${l.item!.productName} ${l.item!.label} (còn ${l.item!.stock})`);
    for (const f of fixes) cart.setQuantity(f.variantId, f.quantity, f.quantity);
    setNotice(`Đã giảm số lượng cho vừa hàng còn lại: ${names.join(', ')}.`);
  }, [resolved, cart]);

  if (!cart.ready) {
    return (
      <Shell>
        <p className="sr-only" role="status">
          Đang tải giỏ hàng…
        </p>
        <Skeleton rows={2} />
      </Shell>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <Shell>
        <StateMessage
          title="Giỏ hàng đang trống"
          body="Gạo lứt, trà rang, mè và các loại hạt đang chờ bạn. Chọn vài món cho bữa cơm thanh đạm nhé."
          action={{ href: '/san-pham', label: 'Xem sản phẩm' }}
        />
      </Shell>
    );
  }

  const count = cart.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <Shell count={count}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <section aria-labelledby="gio-hang-ds">
          <h2 id="gio-hang-ds" className="sr-only">
            Sản phẩm trong giỏ
          </h2>
          <div aria-live="polite" role="status">
            {notice && <p className="mb-4 rounded-2xl bg-honey-400 px-4 py-3 text-base font-medium">{notice}</p>}
          </div>

          {state.status === 'error' ? (
            <div role="alert" className="rounded-[var(--radius-soft)] bg-green-100 p-6">
              <p className="text-lg font-medium">Chưa tải được giá và tồn kho.</p>
              <p className="mt-1 text-base">Giỏ hàng của bạn vẫn còn nguyên. Kiểm tra kết nối rồi thử lại nhé.</p>
              <button type="button" onClick={() => void reload()} className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-full bg-ink-800 px-5 font-medium text-bg hover:opacity-90">
                Thử lại
              </button>
            </div>
          ) : !resolved ? (
            <>
              <p className="sr-only" role="status">
                Đang kiểm tra giá và tồn kho…
              </p>
              <Skeleton rows={cart.lines.length} />
            </>
          ) : (
            <ul className="space-y-3">
              {resolved.lines.map((l) => (
                <CartRow
                  key={l.variantId}
                  line={l}
                  onQty={(n) => cart.setQuantity(l.variantId, n, l.item ? l.item.stock : undefined)}
                  onRemove={() => cart.remove(l.variantId)}
                />
              ))}
            </ul>
          )}

          <Link href="/san-pham" className="mt-6 inline-flex min-h-11 items-center text-base font-medium underline underline-offset-4 hover:text-green-700">
            Tiếp tục mua sắm
          </Link>
        </section>

        <aside aria-labelledby="gio-hang-tong" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-softer)] bg-green-100 p-6 sm:p-8">
            <h2 id="gio-hang-tong" className="text-xl font-semibold">
              Tạm tính
            </h2>
            <p className="mt-2 text-[clamp(2rem,4vw,2.5rem)] leading-tight font-semibold tracking-[-0.02em]">
              {resolved ? <Price amount={resolved.subtotalVnd} /> : <span className="text-ink-600">…</span>}
            </p>
            <p className="mt-1 text-base">Tiền hàng, chưa gồm phí vận chuyển.</p>
            <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-base">{SHIPPING_NOTE}.</p>

            {resolved && resolved.blocking > 0 && (
              <p id="gio-hang-chan" className="mt-4 text-base font-medium text-error">
                Còn {resolved.blocking} sản phẩm cần xóa hoặc chỉnh trước khi đặt hàng.
              </p>
            )}

            <div className="mt-6">
              {resolved?.canCheckout ? (
                <Link href="/dat-hang" className={primaryBtn}>
                  Đặt hàng
                </Link>
              ) : (
                <button type="button" disabled aria-describedby={resolved?.blocking ? 'gio-hang-chan' : undefined} className={`${primaryBtn} disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-600 disabled:active:scale-100`}>
                  Đặt hàng
                </button>
              )}
            </div>
            <p className="mt-4 text-base text-ink-600">{PAYMENT_NOTE}</p>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">Giỏ hàng</h1>
      <p className="mt-3 text-lg">{count ? `${count} sản phẩm, giữ trong trình duyệt này.` : 'Giỏ hàng được giữ trong trình duyệt này.'}</p>
      <div className="mt-8 sm:mt-10">{children}</div>
    </div>
  );
}
