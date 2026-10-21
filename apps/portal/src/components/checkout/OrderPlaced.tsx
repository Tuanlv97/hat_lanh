'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Price } from '@/components/Price';
import { PAYMENT_NOTE } from '@/lib/checkout';
import { SHIPPING_NOTE } from '@/lib/site';

/** Shown once POST /orders succeeded (the cart has already been emptied). */
export function OrderPlaced({ code, totalVnd }: { code: string; totalVnd: number }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'manual'>('idle');

  // Move focus to the result so screen readers announce it and keyboard users start here.
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied('ok');
    } catch {
      // No clipboard permission (or http): select the code so the customer can copy it.
      codeRef.current?.select();
      setCopied('manual');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em] focus:outline-none focus-visible:outline-none">
            Đã nhận đơn
          </h1>
          <p className="mt-4 max-w-[48ch] text-xl">Chúng tôi sẽ nhắn lại để xác nhận đơn.</p>
          <p className="mt-3 max-w-[56ch] text-lg">{PAYMENT_NOTE} {SHIPPING_NOTE}.</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/tra-cuu-don?code=${encodeURIComponent(code)}`}
              className="inline-flex h-13 items-center rounded-full bg-primary px-7 text-lg font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]"
            >
              Tra cứu đơn
            </Link>
            <Link href="/san-pham" className="inline-flex h-13 items-center rounded-full bg-green-100 px-7 text-lg font-medium transition-colors duration-200 hover:bg-green-500">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>

        <section aria-labelledby="dh-ma" className="rounded-[var(--radius-softer)] bg-green-100 p-6 sm:p-8 lg:self-start">
          <h2 id="dh-ma" className="text-lg font-medium">
            Mã đơn hàng
          </h2>
          <label htmlFor="dh-ma-don" className="sr-only">
            Mã đơn hàng
          </label>
          <input
            id="dh-ma-don"
            ref={codeRef}
            readOnly
            value={code}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full bg-transparent text-[clamp(2rem,5vw,2.75rem)] font-semibold tracking-[0.04em] tabular-nums"
          />
          <button
            type="button"
            onClick={() => void copy()}
            className="mt-3 inline-flex h-11 cursor-pointer items-center rounded-full bg-surface px-5 text-base font-medium transition-colors duration-200 hover:bg-green-500"
          >
            {copied === 'ok' ? 'Đã chép mã' : 'Chép mã đơn'}
          </button>
          <p role="status" className="mt-2 min-h-6 text-base text-ink-600">
            {copied === 'ok' ? 'Đã chép vào bộ nhớ tạm.' : copied === 'manual' ? 'Mã đã được chọn, bạn bấm giữ hoặc Ctrl+C để chép.' : 'Giữ mã này cùng số điện thoại để tra cứu đơn.'}
          </p>

          <div className="mt-6 flex items-baseline justify-between gap-4 rounded-2xl bg-surface px-4 py-3">
            <span className="text-base font-medium">Tiền hàng</span>
            <Price amount={totalVnd} className="text-2xl font-semibold" />
          </div>
        </section>
      </div>
    </div>
  );
}
