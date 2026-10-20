'use client';

import type { AuthUser } from '@hatlanh/shared';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { FormAlert, PasswordField, SubmitButton, TextField, focusById } from '@/components/form';
import {
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  REGISTER_FIELDS,
  firstInvalid,
  mapAuthError,
  validateRegister,
  type Errors,
  type RegisterField,
  type RegisterValues,
} from '@/lib/account';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeNextPath } from '@/lib/next-path';
import { AuthShell, Redirecting } from './AuthShell';
import { useLeaveWhenSignedIn } from './use-auth-redirect';

const fid = (f: RegisterField) => `dk-${f}`;

export function RegisterView({ next }: { next?: string }) {
  const { login, ready } = useAuth();
  const leaving = useLeaveWhenSignedIn(next);
  const [values, setValues] = useState<RegisterValues>({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Errors<RegisterField>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  // A field already marked invalid is re-checked as it is fixed; others are checked on blur.
  const set = (field: RegisterField, value: string) => {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (errors[field]) {
      const r = validateRegister(nextValues);
      setErrors((e) => ({ ...e, [field]: r.ok ? undefined : r.errors[field] }));
    }
  };
  const check = (field: RegisterField) => {
    if (!values[field]) return;
    const r = validateRegister(values);
    setErrors((e) => ({ ...e, [field]: r.ok ? undefined : r.errors[field] }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setMessage(null);
    const v = validateRegister(values);
    if (!v.ok) {
      setErrors(v.errors);
      const f = firstInvalid(REGISTER_FIELDS, v.errors);
      if (f) focusById(fid(f));
      return;
    }
    setErrors({});
    busy.current = true;
    setPending(true);
    try {
      const res = await api<{ token: string; user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify(v.data) });
      login(res.token, res.user);
    } catch (err) {
      const m = mapAuthError(err, 'register');
      setErrors(m.fieldErrors as Errors<RegisterField>);
      setMessage(m.message);
      const f = firstInvalid(REGISTER_FIELDS, m.fieldErrors as Errors<RegisterField>);
      if (f) focusById(fid(f));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (!ready) return <Redirecting label="Đang tải…" />;
  if (leaving) return <Redirecting />;

  const safeNext = safeNextPath(next);
  const loginHref = safeNext === '/' ? '/dang-nhap' : `/dang-nhap?next=${encodeURIComponent(safeNext)}`;

  return (
    <AuthShell title="Tạo tài khoản" lead="Để theo dõi đơn, gửi yêu cầu hoàn trả và đánh giá sản phẩm đã mua.">
      <form noValidate onSubmit={submit} aria-label="Đăng ký tài khoản" className="space-y-5">
        <TextField
          id={fid('name')}
          label="Họ tên"
          autoComplete="name"
          maxLength={NAME_MAX}
          value={values.name}
          onValue={(v) => set('name', v)}
          onBlur={() => check('name')}
          error={errors.name}
          disabled={pending}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id={fid('phone')}
            label="Số điện thoại"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            hint="Ví dụ: 0912 345 678"
            value={values.phone}
            onValue={(v) => set('phone', v)}
            onBlur={() => check('phone')}
            error={errors.phone}
            disabled={pending}
          />
          <TextField
            id={fid('email')}
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={254}
            value={values.email}
            onValue={(v) => set('email', v)}
            onBlur={() => check('email')}
            error={errors.email}
            disabled={pending}
          />
        </div>
        <PasswordField
          id={fid('password')}
          label="Mật khẩu"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          hint={`Từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự.`}
          value={values.password}
          onValue={(v) => set('password', v)}
          onBlur={() => check('password')}
          error={errors.password}
          disabled={pending}
        />
        <p className="text-base text-ink-600">
          Đơn đã đặt trước đây khi chưa có tài khoản không tự chuyển vào tài khoản mới; bạn vẫn tra cứu được bằng mã đơn.
        </p>
        <FormAlert message={message} />
        <SubmitButton pending={pending} label="Tạo tài khoản" pendingLabel="Đang tạo tài khoản…" className="sm:w-auto" />
      </form>

      <p className="mt-6 text-base">
        Đã có tài khoản?{' '}
        <Link href={loginHref} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
