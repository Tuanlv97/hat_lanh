'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FormAlert, SubmitButton, TextField, focusById } from '@/components/form';
import { api } from '@/lib/api';
import { mapLookupError, validateLookup, type CustomerOrder, type LookupValues } from '@/lib/orders';
import { OrderDates, OrderLines, StatusPill } from './OrderParts';

/** Only what the lookup page shows: never name, phone, email or address. */
type LookupResult = Pick<CustomerOrder, 'code' | 'status' | 'totalVnd' | 'createdAt' | 'completedAt' | 'items'>;

const fid = (f: keyof LookupValues) => `tc-${f}`;

export function LookupView({ initialCode }: { initialCode: string }) {
  const [values, setValues] = useState<LookupValues>({ code: initialCode.slice(0, 20), phone: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LookupValues, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setMessage(null);
    const v = validateLookup(values);
    if (!v.ok) {
      setErrors(v.errors);
      focusById(fid(v.errors.code ? 'code' : 'phone'));
      return;
    }
    setErrors({});
    busy.current = true;
    setPending(true);
    try {
      const qs = new URLSearchParams(v.data).toString();
      const o = await api<LookupResult>(`/orders/lookup?${qs}`, { cache: 'no-store' });
      setResult({ code: o.code, status: o.status, totalVnd: o.totalVnd, createdAt: o.createdAt, completedAt: o.completedAt, items: o.items });
    } catch (err) {
      setResult(null);
      setMessage(mapLookupError(err));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8">
      <h1 className="text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em]">Tra cứu đơn</h1>
      <p className="mt-4 max-w-[52ch] text-lg">Nhập mã đơn và số điện thoại bạn dùng khi đặt hàng để xem trạng thái đơn.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-14">
        <form noValidate onSubmit={submit} aria-label="Tra cứu đơn hàng" className="space-y-5 lg:self-start">
          <TextField
            id={fid('code')}
            label="Mã đơn"
            hint="Ví dụ: HL7K2M9Q4P. Mã có trong tin xác nhận khi đặt."
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            value={values.code}
            onValue={(code) => setValues((s) => ({ ...s, code }))}
            error={errors.code}
            disabled={pending}
          />
          <TextField
            id={fid('phone')}
            label="Số điện thoại đặt hàng"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            value={values.phone}
            onValue={(phone) => setValues((s) => ({ ...s, phone }))}
            error={errors.phone}
            disabled={pending}
          />
          <FormAlert message={message} />
          <SubmitButton pending={pending} label="Tra cứu" pendingLabel="Đang tra cứu…" />
        </form>

        <div aria-live="polite">
          {result ? (
            <section aria-labelledby="tc-ket-qua" className="rounded-[var(--radius-softer)] bg-green-100 p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 ref={resultRef} tabIndex={-1} id="tc-ket-qua" className="text-2xl font-semibold tabular-nums focus:outline-none">
                  <span className="sr-only">Đơn </span>
                  {result.code}
                </h2>
                <StatusPill status={result.status} />
              </div>
              <div className="mt-4">
                <OrderDates order={result} />
              </div>
              <div className="mt-6">
                <OrderLines order={result} />
              </div>
            </section>
          ) : (
            <div className="rounded-[var(--radius-softer)] bg-green-100 p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Có tài khoản?</h2>
              <p className="mt-2 text-base">
                Đơn đặt khi đã đăng nhập nằm sẵn trong mục Đơn hàng của tôi, kèm yêu cầu hoàn trả và đánh giá.
              </p>
              <Link href="/tai-khoan/don-hang" className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                Đơn hàng của tôi
              </Link>
              <p className="mt-4 text-base">Cần đổi thông tin hay hủy đơn? Bạn nhắn cho shop kèm mã đơn nhé.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
