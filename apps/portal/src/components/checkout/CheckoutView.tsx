'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AddressSelect } from '@/components/AddressSelect';
import { Price } from '@/components/Price';
import { StateMessage } from '@/components/StateMessage';
import { LineNotice, LineThumb } from '@/components/cart/parts';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import {
  EMPTY_CHECKOUT,
  firstInvalidField,
  mapOrderError,
  PAYMENT_NOTE,
  validateCheckout,
  type CheckoutField,
  type CheckoutValues,
  type FieldErrors,
} from '@/lib/checkout';
import { SHIPPING_NOTE } from '@/lib/site';
import { useCartCatalog } from '@/lib/use-cart-catalog';
import { CHECKOUT_LIMITS } from '@hatlanh/shared';
import { OrderPlaced } from './OrderPlaced';

const SUBMIT_TIMEOUT_MS = 20_000;
const fid = (f: CheckoutField) => `f-${f}`;

const fieldClass = (invalid: boolean) =>
  `block min-h-12 w-full rounded-2xl bg-surface px-4 text-base text-ink-800 ring-inset placeholder:text-ink-600 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-green-100 disabled:text-ink-600 ${
    invalid ? 'ring-2 ring-error focus:ring-error' : 'ring-1 ring-green-500 focus:ring-green-700'
  }`;

type TextFieldProps = {
  field: Exclude<CheckoutField, 'provinceCode' | 'wardCode'>;
  label: string;
  hint?: string;
  value: string;
  error?: string;
  onChange(v: string): void;
  onBlur(): void;
  disabled: boolean;
  input: Record<string, string | number | boolean>;
  multiline?: boolean;
};

function TextField({ field, label, hint, value, error, onChange, onBlur, disabled, input, multiline }: TextFieldProps) {
  const id = fid(field);
  const describedBy = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    name: field,
    value,
    disabled,
    onBlur,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    ...input,
  };
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={2} onChange={(e) => onChange(e.target.value)} className={`${fieldClass(!!error)} resize-y py-3 leading-relaxed`} />
      ) : (
        <input {...common} onChange={(e) => onChange(e.target.value)} className={fieldClass(!!error)} />
      )}
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
    </div>
  );
}

export function CheckoutView() {
  const cart = useCart();
  const { user, ready: authReady } = useAuth();
  const [placed, setPlaced] = useState<{ code: string; totalVnd: number } | null>(null);
  const { state, resolved, reload } = useCartCatalog(cart.lines, cart.ready && cart.lines.length > 0 && !placed);

  const [values, setValues] = useState<CheckoutValues>(EMPTY_CHECKOUT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const prefilled = useRef(false);

  // Logged-in customers start with their name, email and phone; every field stays editable.
  useEffect(() => {
    if (!authReady || !user || prefilled.current) return;
    prefilled.current = true;
    setValues((v) => ({
      ...v,
      fullName: v.fullName || user.name || '',
      email: v.email || user.email || '',
      phone: v.phone || user.phone || '',
    }));
  }, [authReady, user]);

  // A field that already shows an error is re-checked as it is fixed; others wait for blur.
  const set = (patch: Partial<CheckoutValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    const keys = Object.keys(patch) as CheckoutField[];
    if (keys.some((k) => errors[k])) {
      const r = validateCheckout(next);
      setErrors((e) => {
        const out = { ...e };
        for (const k of keys) if (e[k]) out[k] = r.ok ? undefined : r.errors[k];
        return out;
      });
    }
  };

  const checkField = (field: CheckoutField) => {
    const r = validateCheckout(values);
    setErrors((e) => ({ ...e, [field]: r.ok ? undefined : r.errors[field] }));
  };

  const focusAlert = () => window.requestAnimationFrame(() => alertRef.current?.focus());
  const focusField = (f: CheckoutField) => window.requestAnimationFrame(() => document.getElementById(fid(f))?.focus());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setFormError('');

    const v = validateCheckout(values);
    if (!v.ok) {
      setErrors(v.errors);
      const first = firstInvalidField(v.errors);
      if (first) focusField(first);
      return;
    }
    setErrors({});
    if (!resolved || !resolved.canCheckout) {
      setFormError(
        !resolved
          ? 'Đang kiểm tra giá và tồn kho, bạn đợi một chút rồi bấm lại nhé.'
          : 'Giỏ hàng có sản phẩm hết hàng hoặc không còn bán. Bạn vào giỏ hàng để xóa hoặc chỉnh số lượng trước khi đặt.',
      );
      focusAlert();
      return;
    }

    inFlight.current = true;
    setPending(true);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), SUBMIT_TIMEOUT_MS);
    try {
      const res = await api<{ code: string; totalVnd: number }>('/orders', {
        method: 'POST',
        body: JSON.stringify({ ...v.data, items: resolved.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })) }),
        signal: ctrl.signal,
      });
      // Only a confirmed order empties the cart.
      setPlaced(res);
      cart.clear();
    } catch (err) {
      const m = mapOrderError(err);
      setErrors(m.fieldErrors);
      setFormError(m.message);
      if (m.refreshCart) void reload();
      const first = firstInvalidField(m.fieldErrors);
      if (first) focusField(first);
      else focusAlert();
    } finally {
      window.clearTimeout(timer);
      inFlight.current = false;
      setPending(false);
    }
  }

  if (placed) return <OrderPlaced code={placed.code} totalVnd={placed.totalVnd} />;

  if (!cart.ready) {
    return (
      <Shell>
        <p role="status" className="text-lg">
          Đang tải giỏ hàng…
        </p>
      </Shell>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <Shell>
        <StateMessage title="Giỏ hàng đang trống" body="Bạn chọn sản phẩm trước rồi quay lại đặt hàng nhé." action={{ href: '/san-pham', label: 'Xem sản phẩm' }} />
      </Shell>
    );
  }

  const blocked = resolved ? !resolved.canCheckout : false;

  return (
    <Shell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        {/* Summary first in reading order (what you are ordering), beside the form on wide screens. */}
        <aside aria-labelledby="dh-tom-tat" className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start">
          <div className="rounded-[var(--radius-softer)] bg-green-100 p-5 sm:p-7">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="dh-tom-tat" className="text-xl font-semibold">
                Đơn của bạn
              </h2>
              <Link href="/gio-hang" className="inline-flex min-h-11 items-center text-base font-medium underline underline-offset-4">
                Sửa giỏ hàng
              </Link>
            </div>

            {state.status === 'error' ? (
              <div className="mt-3">
                <p className="text-base">Chưa tải được giá và tồn kho.</p>
                <button type="button" onClick={() => void reload()} className="mt-2 inline-flex h-11 cursor-pointer items-center rounded-full bg-ink-800 px-5 font-medium text-bg hover:opacity-90">
                  Thử lại
                </button>
              </div>
            ) : !resolved ? (
              <p role="status" className="mt-3 text-base">
                Đang kiểm tra giá và tồn kho…
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {resolved.lines.map((l) => (
                  <li key={l.variantId} className="flex gap-3">
                    <LineThumb line={l} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <p className="leading-snug font-medium">{l.item?.productName ?? 'Sản phẩm không còn bán'}</p>
                        {l.status === 'ok' && <Price amount={l.lineTotalVnd} className="font-semibold" />}
                      </div>
                      {l.item && (
                        <p className="text-base text-ink-600">
                          {l.item.label} × {l.quantity}
                        </p>
                      )}
                      <LineNotice line={l} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex items-baseline justify-between gap-4 rounded-2xl bg-surface px-4 py-3">
              <span className="text-base font-medium">Tiền hàng</span>
              <span className="text-2xl font-semibold tracking-[-0.01em]">{resolved ? <Price amount={resolved.subtotalVnd} /> : '…'}</span>
            </div>
            <p className="mt-3 text-base">{SHIPPING_NOTE}.</p>
          </div>
        </aside>

        <form noValidate onSubmit={submit} aria-labelledby="dh-thong-tin" className="lg:col-start-1 lg:row-start-1">
          <h2 id="dh-thong-tin" className="text-[clamp(1.5rem,2.6vw,1.9rem)] leading-tight font-semibold tracking-[-0.02em]">
            Thông tin nhận hàng
          </h2>
          <p className="mt-2 max-w-[56ch] text-lg">
            {user
              ? `Bạn đang đặt với tài khoản ${user.name}. Đơn sẽ có trong mục Đơn hàng của tôi.`
              : 'Không cần tài khoản: điền thông tin bên dưới là đặt được.'}
          </p>

          <div className="mt-6 space-y-5">
            <TextField
              field="fullName"
              label="Họ tên"
              value={values.fullName}
              error={errors.fullName}
              onChange={(v) => set({ fullName: v })}
              onBlur={() => checkField('fullName')}
              disabled={pending}
              input={{ type: 'text', autoComplete: 'name', maxLength: CHECKOUT_LIMITS.fullName }}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                field="phone"
                label="Số điện thoại"
                hint="Ví dụ: 0912 345 678"
                value={values.phone}
                error={errors.phone}
                onChange={(v) => set({ phone: v })}
                onBlur={() => checkField('phone')}
                disabled={pending}
                input={{ type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 20 }}
              />
              <TextField
                field="email"
                label="Email"
                hint="Shop chỉ dùng để liên hệ về đơn."
                value={values.email}
                error={errors.email}
                onChange={(v) => set({ email: v })}
                onBlur={() => checkField('email')}
                disabled={pending}
                input={{ type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: CHECKOUT_LIMITS.email, spellCheck: false }}
              />
            </div>

            <AddressSelect
              provinceCode={values.provinceCode}
              wardCode={values.wardCode}
              onChange={(next) => set(next)}
              onBlurField={checkField}
              errors={{ provinceCode: errors.provinceCode, wardCode: errors.wardCode }}
              ids={{ provinceCode: fid('provinceCode'), wardCode: fid('wardCode') }}
              fieldClass={fieldClass}
              disabled={pending}
            />

            <TextField
              field="addressDetail"
              label="Địa chỉ chi tiết"
              hint="Số nhà, tên đường, thôn/xóm."
              value={values.addressDetail}
              error={errors.addressDetail}
              onChange={(v) => set({ addressDetail: v })}
              onBlur={() => checkField('addressDetail')}
              disabled={pending}
              multiline
              input={{ autoComplete: 'street-address', maxLength: CHECKOUT_LIMITS.addressDetail }}
            />
          </div>

          <div className="mt-8 rounded-[var(--radius-soft)] bg-honey-400 px-5 py-4">
            <p className="text-base font-semibold">Chưa thanh toán online</p>
            <p className="mt-1 text-base">{PAYMENT_NOTE}</p>
          </div>

          <div ref={alertRef} tabIndex={-1} role="alert" className="focus:outline-none">
            {formError && (
              <div className="mt-6 rounded-[var(--radius-soft)] bg-green-100 px-5 py-4 ring-2 ring-error ring-inset">
                <p className="text-base font-medium text-error">{formError}</p>
                {(blocked || /giỏ hàng/i.test(formError)) && (
                  <Link href="/gio-hang" className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                    Mở giỏ hàng
                  </Link>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            aria-describedby={blocked ? 'dh-chan' : undefined}
            className="mt-6 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-ink-800 px-8 text-lg font-medium text-bg transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 disabled:active:scale-100 sm:w-auto"
          >
            {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />}
            {pending ? 'Đang gửi đơn…' : 'Gửi đơn hàng'}
          </button>
          {blocked && (
            <p id="dh-chan" className="mt-3 text-base font-medium text-error">
              Giỏ hàng có sản phẩm cần xóa hoặc chỉnh trước khi đặt.
            </p>
          )}
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">Đặt hàng</h1>
      <div className="mt-8 sm:mt-10">{children}</div>
    </div>
  );
}
