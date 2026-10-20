'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';

/** Same look as the checkout fields: 48px tall, soft ring, error ring paired with a text message. */
export const fieldClass = (invalid: boolean) =>
  `block min-h-12 w-full rounded-2xl bg-surface px-4 text-base text-ink-800 ring-inset placeholder:text-ink-600 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-green-100 disabled:text-ink-600 ${
    invalid ? 'ring-2 ring-error focus:ring-error' : 'ring-1 ring-green-500 focus:ring-green-700'
  }`;

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  return [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
}

export function FieldMessages({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-base text-ink-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-2 text-base font-medium text-error">
          {error}
        </p>
      )}
    </>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  id: string;
  label: string;
  value: string;
  onValue(v: string): void;
  error?: string;
  hint?: string;
};

export function TextField({ id, label, value, onValue, error, hint, className, ...input }: TextFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-base font-medium">
        {label}
      </label>
      <input
        {...input}
        id={id}
        value={value}
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={fieldClass(!!error)}
      />
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

/** Password with a show/hide toggle; paste and password managers stay allowed. */
export function PasswordField({ id, label, value, onValue, error, hint, className, ...input }: TextFieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-base font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${fieldClass(!!error)} pr-24`}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute top-1/2 right-1.5 inline-flex h-11 -translate-y-1/2 cursor-pointer items-center rounded-xl px-3 text-base font-medium text-ink-800 transition-colors duration-200 hover:bg-green-100"
        >
          {shown ? 'Ẩn' : 'Hiện'}
          <span className="sr-only"> mật khẩu</span>
        </button>
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

/** Live region that is always in the DOM so screen readers announce a message when it appears. */
export function FormAlert({ message, children }: { message: string | null; children?: ReactNode }) {
  return (
    <div role="alert">
      {message && (
        <div className="mt-6 rounded-[var(--radius-soft)] bg-green-100 px-5 py-4 ring-2 ring-error ring-inset">
          <p className="text-base font-medium text-error">{message}</p>
          {children}
        </div>
      )}
    </div>
  );
}

export function SubmitButton({ pending, label, pendingLabel, className = '' }: { pending: boolean; label: string; pendingLabel: string; className?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-ink-800 px-8 text-lg font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100 ${className}`}
    >
      {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

export function focusById(id: string): void {
  window.requestAnimationFrame(() => document.getElementById(id)?.focus());
}
