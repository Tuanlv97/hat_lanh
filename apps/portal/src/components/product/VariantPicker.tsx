"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Price } from "@/components/Price";
import { QuantityStepper } from "@/components/QuantityStepper";
import { addToCart } from "@/lib/cart";
import {
  clampQuantity,
  defaultVariant,
  maxQuantity,
  type Variant,
} from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import { SHIPPING_NOTE } from "@/lib/site";

const LOW_STOCK = 10;

function Check({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" className="check-draw" />
    </svg>
  );
}

export function VariantPicker({
  productName,
  variants,
}: {
  productName: string;
  variants: Variant[];
}) {
  const [selectedId, setSelectedId] = useState(
    defaultVariant(variants)?.id ?? "",
  );
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buyRef = useRef<HTMLDivElement | null>(null);
  const groupId = useId();

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const max = maxQuantity(selected);
  const soldOut = max === 0;
  const prices = new Set(variants.map((v) => v.priceVnd));

  // Keep the quantity inside the new variant's stock when switching.
  useEffect(() => setQty((q) => clampQuantity(q, max)), [max]);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(""), 5000);
    return () => window.clearTimeout(t);
  }, [note]);

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  // Phone: once the main buy row scrolls out of view, a slim bar keeps "Thêm vào giỏ" one tap away.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) =>
      setBarVisible(!e.isIntersecting && e.boundingClientRect.top < 0),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!selected)
    return <p className="text-lg font-medium">Sản phẩm tạm ngừng bán.</p>;

  const add = () => {
    if (soldOut) return;
    const n = clampQuantity(qty, max);
    // The line total never exceeds the stock shown here.
    const { added } = addToCart(selected.id, n, max);
    if (added > 0) setJustAdded(true);
    setNote(
      added > 0
        ? `Đã thêm vào giỏ: ${added} × ${productName} (${selected.label})${added < n ? ` — giỏ đã có đủ ${max} sản phẩm còn lại` : ""}`
        : `Giỏ hàng đã có đủ ${max} sản phẩm ${selected.label} còn lại`,
    );
  };

  const addLabel = soldOut
    ? "Hết hàng"
    : justAdded
      ? "Đã thêm vào giỏ"
      : "Thêm vào giỏ";
  const addClass = `btn btn-lg flex-1 whitespace-nowrap max-sm:px-5 sm:flex-none disabled:cursor-not-allowed disabled:bg-green-100 disabled:text-ink-600 disabled:shadow-none disabled:transform-none ${
    justAdded ? "bg-green-700 text-surface" : "btn-primary"
  }`;

  return (
    <div>
      <p className="flex items-baseline gap-3 text-[clamp(1.9rem,3.2vw,2.5rem)] font-semibold tracking-[-0.02em]">
        <Price
          key={selected.id}
          amount={selected.priceVnd}
          className="toast-in inline-block"
        />
        <span className="text-base font-normal text-ink-600">
          / {selected.label}
        </span>
      </p>

      <fieldset className="mt-6">
        <legend id={groupId} className="text-base font-medium">
          Chọn quy cách
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {variants.map((v) => {
            const on = v.id === selected.id;
            const out = v.stock <= 0;
            return (
              <label
                key={v.id}
                className={`relative flex min-h-16 cursor-pointer flex-col justify-center rounded-2xl px-4 py-2.5 text-base transition-all duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-green-700 ${
                  on
                    ? "bg-surface shadow-[var(--shadow-md)] ring-2 ring-ink-800"
                    : "bg-green-100 ring-1 ring-transparent hover:-translate-y-0.5 hover:ring-green-500"
                } ${out ? "opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name={`variant-${groupId}`}
                  value={v.id}
                  checked={on}
                  onChange={() => setSelectedId(v.id)}
                  className="sr-only"
                />
                <span className="pr-6 font-medium">{v.label}</span>
                <span className="text-sm text-ink-600 tabular-nums">
                  {out
                    ? "Hết hàng"
                    : prices.size > 1
                      ? formatVnd(v.priceVnd)
                      : "Còn hàng"}
                </span>
                {on && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2.5 right-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-bg"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <p
        className="mt-4 inline-flex items-center gap-2 text-base"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${soldOut ? "bg-error" : selected.stock < LOW_STOCK ? "bg-honey-400" : "bg-green-700"}`}
        />
        {soldOut ? (
          <span className="font-medium">
            Quy cách {selected.label} đã hết hàng
          </span>
        ) : selected.stock < LOW_STOCK ? (
          <span>Chỉ còn {selected.stock} sản phẩm</span>
        ) : (
          <span>Còn hàng</span>
        )}
      </p>

      <div ref={buyRef} className="mt-6 flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={qty}
          max={max}
          onChange={setQty}
          label={`Số lượng ${productName} ${selected.label}`}
          disabled={soldOut}
        />

        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className={addClass}
        >
          {justAdded ? <Check /> : !soldOut && <BagPlus />}
          {addLabel}
        </button>
      </div>

      <p className="mt-4 text-base text-ink-600">{SHIPPING_NOTE}.</p>

      <div aria-live="polite" role="status" className="min-h-0">
        {note && (
          <p className="toast-in mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-honey-400 px-4 py-3 text-base shadow-[var(--shadow-sm)]">
            <span className="font-medium">{note}</span>
            <Link
              href="/gio-hang"
              className="font-medium underline underline-offset-4"
            >
              Xem giỏ hàng →
            </Link>
          </p>
        )}
      </div>

      {/* Mobile sticky buy bar, portalled to <body> so animated (transformed) ancestors cannot trap `fixed`.
          Hidden from assistive tech because it repeats the controls above. */}
      {mounted &&
        createPortal(
          <div
            aria-hidden={!barVisible}
            inert={!barVisible}
            className={`safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-green-500/40 bg-bg/95 px-4 pt-3 backdrop-blur transition-transform duration-300 md:hidden ${
              barVisible ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-600">
                  {selected.label}
                </p>
                <Price
                  amount={selected.priceVnd}
                  className="text-lg font-semibold"
                />
              </div>
              <button
                type="button"
                onClick={add}
                disabled={soldOut}
                className={`${addClass} min-h-12 flex-none px-6 text-base`}
              >
                {justAdded ? <Check /> : null}
                {addLabel}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function BagPlus() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8M12 11.5v5M9.5 14h5" />
    </svg>
  );
}
