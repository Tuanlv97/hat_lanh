'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Place = { code: string; name: string };
type Load<T> = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; data: T };

export type AddressSelectProps = {
  provinceCode: string;
  wardCode: string;
  /** Changing the province always resets the ward (`wardCode: ''`). */
  onChange(next: { provinceCode: string; wardCode: string }): void;
  onBlurField?(field: 'provinceCode' | 'wardCode'): void;
  errors?: { provinceCode?: string; wardCode?: string };
  /** ids so the form can focus the first invalid field. */
  ids?: { provinceCode: string; wardCode: string };
  /** Shared look with the form's other fields. */
  fieldClass: (invalid: boolean) => string;
  disabled?: boolean;
};

/**
 * Two-level Vietnamese address (after the 01/07/2025 reform there are no districts):
 * Tỉnh/Thành → Phường/Xã. The ward list loads from the API once a province is chosen.
 */
export function AddressSelect({
  provinceCode,
  wardCode,
  onChange,
  onBlurField,
  errors = {},
  ids = { provinceCode: 'f-provinceCode', wardCode: 'f-wardCode' },
  fieldClass,
  disabled = false,
}: AddressSelectProps) {
  const [provinces, setProvinces] = useState<Load<Place[]>>({ status: 'loading' });
  const [wards, setWards] = useState<Load<Place[]>>({ status: 'idle' });
  const wardCache = useRef(new Map<string, Place[]>());

  const loadProvinces = useCallback(async () => {
    setProvinces({ status: 'loading' });
    try {
      setProvinces({ status: 'ready', data: await api<Place[]>('/address/provinces') });
    } catch {
      setProvinces({ status: 'error' });
    }
  }, []);

  useEffect(() => void loadProvinces(), [loadProvinces]);

  const [wardTry, setWardTry] = useState(0);
  useEffect(() => {
    if (!provinceCode) {
      setWards({ status: 'idle' });
      return;
    }
    const cached = wardCache.current.get(provinceCode);
    if (cached) {
      setWards({ status: 'ready', data: cached });
      return;
    }
    let cancelled = false;
    setWards({ status: 'loading' });
    api<Place[]>(`/address/provinces/${encodeURIComponent(provinceCode)}/wards`)
      .then((data) => {
        wardCache.current.set(provinceCode, data);
        if (!cancelled) setWards({ status: 'ready', data });
      })
      .catch(() => !cancelled && setWards({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [provinceCode, wardTry]);

  const pErr = errors.provinceCode;
  const wErr = errors.wardCode;
  const wardDisabled = disabled || !provinceCode || wards.status !== 'ready';
  const hint = 'f-ward-hint';

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor={ids.provinceCode} className="mb-2 block text-base font-medium">
          Tỉnh/Thành
        </label>
        <select
          id={ids.provinceCode}
          name="provinceCode"
          autoComplete="address-level1"
          value={provinceCode}
          disabled={disabled || provinces.status !== 'ready'}
          aria-invalid={pErr ? true : undefined}
          aria-describedby={pErr ? `${ids.provinceCode}-err` : undefined}
          onChange={(e) => onChange({ provinceCode: e.target.value, wardCode: '' })}
          onBlur={() => onBlurField?.('provinceCode')}
          className={fieldClass(!!pErr)}
        >
          <option value="">{provinces.status === 'loading' ? 'Đang tải…' : 'Chọn Tỉnh/Thành'}</option>
          {provinces.status === 'ready' && provinces.data.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
        {pErr && (
          <p id={`${ids.provinceCode}-err`} className="mt-2 text-base font-medium text-error">
            {pErr}
          </p>
        )}
        {provinces.status === 'error' && (
          <p role="alert" className="mt-2 text-base">
            Chưa tải được danh sách Tỉnh/Thành.{' '}
            <button type="button" onClick={() => void loadProvinces()} className="min-h-11 cursor-pointer font-medium underline underline-offset-4">
              Thử lại
            </button>
          </p>
        )}
      </div>

      <div>
        <label htmlFor={ids.wardCode} className="mb-2 block text-base font-medium">
          Phường/Xã
        </label>
        <select
          id={ids.wardCode}
          name="wardCode"
          autoComplete="address-level2"
          value={wardCode}
          disabled={wardDisabled}
          aria-invalid={wErr ? true : undefined}
          aria-describedby={[wErr ? `${ids.wardCode}-err` : '', !provinceCode ? hint : ''].filter(Boolean).join(' ') || undefined}
          onChange={(e) => onChange({ provinceCode, wardCode: e.target.value })}
          onBlur={() => onBlurField?.('wardCode')}
          className={fieldClass(!!wErr)}
        >
          <option value="">{wards.status === 'loading' ? 'Đang tải…' : 'Chọn Phường/Xã'}</option>
          {wards.status === 'ready' && wards.data.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
        </select>
        {!provinceCode && (
          <p id={hint} className="mt-2 text-base text-ink-600">
            Chọn Tỉnh/Thành trước.
          </p>
        )}
        {wErr && (
          <p id={`${ids.wardCode}-err`} className="mt-2 text-base font-medium text-error">
            {wErr}
          </p>
        )}
        {wards.status === 'error' && (
          <p role="alert" className="mt-2 text-base">
            Chưa tải được danh sách Phường/Xã.{' '}
            <button type="button" onClick={() => setWardTry((n) => n + 1)} className="min-h-11 cursor-pointer font-medium underline underline-offset-4">
              Thử lại
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
