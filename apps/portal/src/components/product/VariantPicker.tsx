'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Price } from '@/components/Price';
import { QuantityStepper } from '@/components/QuantityStepper';
import { addToCart } from '@/lib/cart';
import { clampQuantity, defaultVariant, maxQuantity, type Variant } from '@/lib/catalog';
import { SHIPPING_NOTE } from '@/lib/site';

const LOW_STOCK = 10;

export function VariantPicker({ productName, variants }: { productName: string; variants: Variant[] }) {
  const [selectedId, setSelectedId] = useState(defaultVariant(variants)?.id ?? '');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const groupId = useId();

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
    // The line total never exceeds the stock shown here.
    const { added } = addToCart(selected.id, n, max);
    setNote(
      added > 0
        ? `Đã thêm vào giỏ: ${added} × ${productName} (${selected.label})${added < n ? ` — giỏ đã có đủ ${max} sản phẩm còn lại` : ''}`
        : `Giỏ hàng đã có đủ ${max} sản phẩm ${selected.label} còn lại`,
    );
  };

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
        <QuantityStepper value={qty} max={max} onChange={setQty} label={`Số lượng ${productName} ${selected.label}`} disabled={soldOut} />

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
