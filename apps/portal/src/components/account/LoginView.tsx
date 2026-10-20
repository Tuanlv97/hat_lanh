'use client';

import type { AuthUser } from '@hatlanh/shared';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { FormAlert, PasswordField, SubmitButton, TextField, focusById } from '@/components/form';
import { FORGOT_PASSWORD_NOTE, LOGIN_FIELDS, firstInvalid, mapAuthError, validateLogin, type Errors, type LoginField } from '@/lib/account';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeNextPath } from '@/lib/next-path';
import { AuthShell, Redirecting } from './AuthShell';
import { SocialLogin } from './SocialLogin';
import { useLeaveWhenSignedIn } from './use-auth-redirect';

const fid = (f: LoginField) => `dn-${f}`;

export function LoginView({ next }: { next?: string }) {
  const { login, ready } = useAuth();
  const leaving = useLeaveWhenSignedIn(next);
  const [values, setValues] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState<Errors<LoginField>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setMessage(null);
    const v = validateLogin(values);
    if (!v.ok) {
      setErrors(v.errors);
      const f = firstInvalid(LOGIN_FIELDS, v.errors);
      if (f) focusById(fid(f));
      return;
    }
    setErrors({});
    busy.current = true;
    setPending(true);
    try {
      const res = await api<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(v.data) });
      login(res.token, res.user); // useLeaveWhenSignedIn then goes to `next`
    } catch (err) {
      const m = mapAuthError(err, 'login');
      setErrors(m.fieldErrors);
      setMessage(m.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (!ready) return <Redirecting label="Đang tải…" />;
  if (leaving) return <Redirecting />;

  const safeNext = safeNextPath(next);
  const registerHref = safeNext === '/' ? '/dang-ky' : `/dang-ky?next=${encodeURIComponent(safeNext)}`;

  return (
    <AuthShell title="Đăng nhập" lead="Dùng email hoặc số điện thoại bạn đã đăng ký.">
      <form noValidate onSubmit={submit} aria-label="Đăng nhập bằng mật khẩu" className="space-y-5">
        <TextField
          id={fid('identifier')}
          label="Email hoặc số điện thoại"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={values.identifier}
          onValue={(identifier) => setValues((s) => ({ ...s, identifier }))}
          error={errors.identifier}
          disabled={pending}
        />
        <PasswordField
          id={fid('password')}
          label="Mật khẩu"
          autoComplete="current-password"
          maxLength={200}
          value={values.password}
          onValue={(password) => setValues((s) => ({ ...s, password }))}
          error={errors.password}
          hint={FORGOT_PASSWORD_NOTE}
          disabled={pending}
        />
        <FormAlert message={message} />
        <SubmitButton pending={pending} label="Đăng nhập" pendingLabel="Đang đăng nhập…" className="sm:w-auto" />
      </form>

      <p className="mt-6 text-base">
        Chưa có tài khoản?{' '}
        <Link href={registerHref} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
          Đăng ký
        </Link>
      </p>

      <SocialLogin />
    </AuthShell>
  );
}
