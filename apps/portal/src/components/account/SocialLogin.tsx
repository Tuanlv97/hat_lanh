'use client';

import type { AuthUser } from '@hatlanh/shared';
import { useId, useRef, useState, type FormEvent } from 'react';
import { FormAlert, SubmitButton, TextField, focusById } from '@/components/form';
import { firstInvalid, mapAuthError, oauthDevMode, validateDevLogin, DEV_LOGIN_FIELDS, type DevLoginField, type Errors } from '@/lib/account';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Provider = 'google' | 'facebook';
const PROVIDER_NAME: Record<Provider, string> = { google: 'Google', facebook: 'Facebook' };

/**
 * Google / Facebook buttons. Real OAuth is a later seam (docs/oauth-setup.md): in dev mode
 * (`NEXT_PUBLIC_OAUTH_MODE=dev`) they open a clearly labelled test form calling `POST /auth/dev-login`;
 * otherwise they are disabled with "Sắp có".
 */
export function SocialLogin() {
  const dev = oauthDevMode();
  const [provider, setProvider] = useState<Provider | null>(null);
  const panelId = useId();

  return (
    <section aria-labelledby="mxh-title" className="mt-10">
      <h2 id="mxh-title" className="text-lg font-semibold">
        Hoặc đăng nhập bằng
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(['google', 'facebook'] as const).map((p) => (
          <button
            key={p}
            type="button"
            disabled={!dev}
            aria-expanded={dev ? provider === p : undefined}
            aria-controls={dev ? panelId : undefined}
            onClick={() => setProvider((cur) => (cur === p ? null : p))}
            className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-base font-medium transition-colors duration-200 disabled:cursor-not-allowed ${
              provider === p ? 'bg-green-500 text-ink-800' : 'bg-green-100 text-ink-800 hover:bg-green-500 disabled:hover:bg-green-100'
            }`}
          >
            {PROVIDER_NAME[p]}
            {!dev && <span className="rounded-full bg-surface px-2 text-sm text-ink-600">Sắp có</span>}
          </button>
        ))}
      </div>
      {dev && provider && <DevLoginForm key={provider} id={panelId} provider={provider} onClose={() => setProvider(null)} />}
    </section>
  );
}

function DevLoginForm({ id, provider, onClose }: { id: string; provider: Provider; onClose(): void }) {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', name: '' });
  const [errors, setErrors] = useState<Errors<DevLoginField>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const fid = (f: DevLoginField) => `dev-${f}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setMessage(null);
    const v = validateDevLogin(values);
    if (!v.ok) {
      setErrors(v.errors);
      const f = firstInvalid(DEV_LOGIN_FIELDS, v.errors);
      if (f) focusById(fid(f));
      return;
    }
    setErrors({});
    busy.current = true;
    setPending(true);
    try {
      const res = await api<{ token: string; user: AuthUser }>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ provider, ...v.data }),
      });
      login(res.token, res.user);
    } catch (err) {
      const m = mapAuthError(err, 'dev');
      setErrors(m.fieldErrors);
      setMessage(m.message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div id={id} className="mt-4 rounded-[var(--radius-soft)] bg-honey-400 p-5 sm:p-6">
      <h3 className="text-lg font-semibold">Đăng nhập thử (chế độ phát triển)</h3>
      <p className="mt-1 text-base">
        Giả lập đăng nhập {PROVIDER_NAME[provider]} để thử trên máy, không qua {PROVIDER_NAME[provider]} thật. Chế độ này phải tắt khi chạy thật.
      </p>
      <form noValidate onSubmit={submit} className="mt-4 space-y-4">
        <TextField
          id={fid('email')}
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          maxLength={254}
          value={values.email}
          onValue={(email) => setValues((s) => ({ ...s, email }))}
          error={errors.email}
          disabled={pending}
        />
        <TextField
          id={fid('name')}
          label="Họ tên"
          autoComplete="name"
          maxLength={100}
          value={values.name}
          onValue={(name) => setValues((s) => ({ ...s, name }))}
          error={errors.name}
          disabled={pending}
        />
        <FormAlert message={message} />
        <div className="flex flex-wrap gap-3">
          <SubmitButton pending={pending} label={`Đăng nhập thử với ${PROVIDER_NAME[provider]}`} pendingLabel="Đang đăng nhập…" className="sm:w-auto" />
          <button type="button" onClick={onClose} className="inline-flex h-14 cursor-pointer items-center rounded-full px-6 text-lg font-medium hover:bg-surface">
            Đóng
          </button>
        </div>
      </form>
    </div>
  );
}
