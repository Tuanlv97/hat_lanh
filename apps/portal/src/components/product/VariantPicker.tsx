'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Price } from '@/components/Price';
import { addToCart } from '@/lib/cart-add';
import { clampQuantity, defaultVariant, maxQuantity, type Variant } from '@/lib/catalog';
import { SHIPPING_NOTE } from '@/lib/site';

const LOW_STOCK = 10;

export function VariantPicker({ productName, variants }: { productName: string; variants: Variant[] }) {
  const [selectedId, setSelectedId] = useState(defaultVariant(variants)?.id ?? '');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const groupId = useId();
  const qtyId = useId();

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const max = maxQuantity(selected);
  const soldOut = max === 0;

  // Keep the quantity inside the new variant's stock when switching.
  useEffect(() => setQty((q) => clampQuantity(q, max)), [max]);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(''), 5000);
    return () => window.clearTimeout(t);
  }, [note]);

  if (!selected) return <p className="text-lg font-medium">Sản phẩm tạm ngừng bán.</p>;

  const add = () => {
    if (soldOut) return;
    const n = clampQuantity(qty, max);
    addToCart(selected.id, n);
    setNote(`Đã thêm vào giỏ: ${n} × ${productName} (${selected.label})`);
  };

  const stepBtn =
    'inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-xl text-ink-800 transition-colors duration-200 hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div>
      <p className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.02em]">
        <Price amount={selected.priceVnd} />
      </p>

      <fieldset className="mt-6">
        <legend id={groupId} className="text-base font-medium">
          Quy cách
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {variants.map((v) => {
            const on = v.id === selected.id;
            const out = v.stock <= 0;
            return (
              <label
                key={v.id}
                className={`relative inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-base transition-colors duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-green-700 ${
                  on ? 'bg-ink-800 font-medium text-bg' : 'bg-green-100 text-ink-800 hover:bg-green-500'
                }`}
              >
                <input
                  type="radio"
                  name={`variant-${groupId}`}
                  value={v.id}
                  checked={on}
                  onChange={() => setSelectedId(v.id)}
                  className="sr-only"
                />
                <span>{v.label}</span>
                {out && <span className={`${on ? 'text-bg' : 'text-ink-600'}`}>· Hết hàng</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-4 text-base" aria-live="polite">
        {soldOut ? (
          <span className="font-medium">Quy cách {selected.label} đã hết hàng</span>
        ) : selected.stock < LOW_STOCK ? (
          <span>Chỉ còn {selected.stock} sản phẩm</span>
        ) : (
          <span>Còn hàng</span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full bg-green-100" role="group" aria-label="Số lượng">
          <button type="button" className={stepBtn} onClick={() => setQty((q) => clampQuantity(q - 1, max))} disabled={soldOut || qty <= 1} aria-label="Giảm số lượng">
            −
          </button>
          <label htmlFor={qtyId} className="sr-only">
            Số lượng
          </label>
          <input
            id={qtyId}
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, max)}
            value={qty}
            disabled={soldOut}
            onChange={(e) => setQty(e.target.value === '' ? 1 : clampQuantity(Number(e.target.value), max))}
            className="h-12 w-12 bg-transparent text-center text-lg font-medium tabular-nums [appearance:textfield] focus:outline-none disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button type="button" className={stepBtn} onClick={() => setQty((q) => clampQuantity(q + 1, max))} disabled={soldOut || qty >= max} aria-label="Tăng số lượng">
            +
          </button>
        </div>

        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className="inline-flex h-13 flex-1 cursor-pointer items-center justify-center rounded-full bg-ink-800 px-8 text-lg font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-green-100 disabled:text-ink-600 disabled:active:scale-100 sm:flex-none"
        >
          {soldOut ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      </div>

      <p className="mt-4 text-base text-ink-600">{SHIPPING_NOTE}.</p>

      <div aria-live="polite" role="status" className="min-h-0">
        {note && (
          <p className="toast-in mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-honey-400 px-4 py-3 text-base">
            <span className="font-medium">{note}</span>
            <Link href="/gio-hang" className="underline underline-offset-4">
              Xem giỏ hàng
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
