'use client';

import { useEffect, useId, useState } from 'react';

type QuantityStepperProps = {
  value: number;
  /** Highest allowed value (stock, capped at 99). Below 1 disables the stepper. */
  max: number;
  onChange(next: number): void;
  /** Accessible name, e.g. "Số lượng Gạo lứt đỏ 500g". */
  label: string;
  disabled?: boolean;
  /** `sm` for cart rows. */
  size?: 'md' | 'sm';
};

const clamp = (n: number, max: number) => Math.max(1, Math.min(Math.max(1, max), Math.floor(n)));

/**
 * − [n] + stepper. The field may be empty while the customer is typing; it only snaps back
 * (clamped to 1..max) when it loses focus, so clearing "1" to type "3" never fights the user.
 */
export function QuantityStepper({ value, max, onChange, label, disabled = false, size = 'md' }: QuantityStepperProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const off = disabled || max < 1;

  // Follow outside changes (buttons, other tabs, stock clamps) unless the customer is typing.
  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  const commit = (n: number) => {
    const next = clamp(n, max);
    if (next !== value) onChange(next);
    return next;
  };

  const box = size === 'sm' ? 'h-11 w-11 text-lg' : 'h-12 w-12 text-xl';
  const btn = `inline-flex ${box} cursor-pointer items-center justify-center rounded-full text-ink-800 transition-colors duration-200 hover:bg-green-500 active:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`;

  return (
    <div className="inline-flex items-center rounded-full bg-green-100" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => commit(value - 1)} disabled={off || value <= 1} aria-label="Giảm số lượng">
        −
      </button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={2}
        value={text}
        disabled={off}
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
          setText(digits);
          const n = Number(digits);
          if (digits !== '' && n >= 1) commit(n);
        }}
        onBlur={() => {
          setEditing(false);
          const n = Number(text);
          setText(String(text === '' || !(n >= 1) ? value : clamp(n, max)));
        }}
        className={`${size === 'sm' ? 'h-11 w-10 text-base' : 'h-12 w-12 text-lg'} rounded-lg bg-transparent text-center font-medium tabular-nums disabled:opacity-40`}
      />
      <button type="button" className={btn} onClick={() => commit(value + 1)} disabled={off || value >= max} aria-label="Tăng số lượng">
        +
      </button>
    </div>
  );
}
