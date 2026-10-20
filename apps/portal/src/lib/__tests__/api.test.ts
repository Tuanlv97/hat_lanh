import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, assetUrl, TOKEN_KEY } from '../api';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    key: (i) => Array.from(data.keys())[i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('api()', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON and sends the stored bearer token', async () => {
    storage.setItem(TOKEN_KEY, 'abc');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/health');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer abc');
  });

  it('maps 400 VALIDATION_ERROR to ApiError with fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, { statusCode: 400, error: 'VALIDATION_ERROR', message: 'Bad Request', fields: { phone: 'Số điện thoại không hợp lệ' } }),
      ),
    );

    const err = await api('/orders', { method: 'POST', body: '{}' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      error: 'VALIDATION_ERROR',
      fields: { phone: 'Số điện thoại không hợp lệ' },
    });
  });

  it('keeps extra error details (e.g. remaining) from the body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, { statusCode: 400, error: 'RETURN_QUANTITY_EXCEEDED', message: 'x', orderItemId: 'oi1', remaining: 1 }),
      ),
    );
    const err = await api('/me/orders/HL1/returns', { method: 'POST', body: '{}' }).catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 400, error: 'RETURN_QUANTITY_EXCEEDED', details: { orderItemId: 'oi1', remaining: 1 } });
  });

  it('clears the stored token on 401', async () => {
    storage.setItem(TOKEN_KEY, 'stale');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { statusCode: 401, error: 'UNAUTHORIZED', message: 'Unauthorized' })),
    );

    const err = await api('/auth/me').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(storage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('works without a browser (no window, no token header)', async () => {
    vi.stubGlobal('window', undefined);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api('/products')).resolves.toEqual([]);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('resolves API-served upload paths and leaves placeholders alone', () => {
    expect(assetUrl('/uploads/a.webp')).toBe('http://localhost:3000/uploads/a.webp');
    expect(assetUrl('/placeholder/me-rang.svg')).toBe('/placeholder/me-rang.svg');
  });

  it('builds an ApiError from a non-JSON error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));
    const err = (await api('/x').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.error).toBe('ERROR');
  });
});
