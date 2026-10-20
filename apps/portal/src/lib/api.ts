export const TOKEN_KEY = 'hl_token';
export const USER_KEY = 'hl_user';

const DEFAULT_API_URL = 'http://localhost:3000';

/** Error thrown for any non-2xx API response; mirrors the API's `{ statusCode, error, message, fields? }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, error: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.fields = fields;
  }
}

const isBrowser = (): boolean => typeof window !== 'undefined';

/** Server components read `API_URL`; the browser reads the inlined `NEXT_PUBLIC_API_URL`. */
export function apiBaseUrl(): string {
  const url = isBrowser() ? process.env.NEXT_PUBLIC_API_URL : (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL);
  return (url || DEFAULT_API_URL).replace(/\/+$/, '');
}

/**
 * Resolves an image path stored by the API: `/uploads/...` is served by the API host,
 * `/placeholder/...` (seed data) and absolute URLs are used as-is.
 */
export function assetUrl(src: string): string {
  if (!src.startsWith('/uploads/')) return src;
  return `${(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')}${src}`;
}

function readToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Drops a stale session; AuthProvider listens for `hl:auth` to update the UI. */
export function clearStoredSession(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
  if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('hl:auth'));
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Fetches `path` from the API, adds the bearer token in the browser, and throws ApiError on failure. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = readToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  const body = await parseBody(res);

  if (!res.ok) {
    if (res.status === 401 && token) clearStoredSession();
    const obj = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const error = typeof obj.error === 'string' ? obj.error : 'ERROR';
    const message =
      typeof obj.message === 'string' ? obj.message : typeof body === 'string' && body ? body : res.statusText || error;
    const fields =
      obj.fields && typeof obj.fields === 'object' ? (obj.fields as Record<string, string>) : undefined;
    throw new ApiError(res.status, error, message, fields);
  }
  return body as T;
}
