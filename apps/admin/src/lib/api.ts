export const TOKEN_KEY = 'hl_admin_token';

const DEFAULT_API_URL = 'http://localhost:3000';

/** Error thrown for any non-2xx API response; mirrors the API's `{ statusCode, error, message, fields? }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly fields?: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(status: number, error: string, message: string, fields?: Record<string, string>, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.fields = fields;
    this.details = details;
  }
}

export function apiBaseUrl(): string {
  return ((import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_URL).replace(/\/+$/, '');
}

/** `/uploads/...` is served by the API host; absolute URLs and `/placeholder/...` are used as-is. */
export function assetUrl(src: string): string {
  return src.startsWith('/uploads/') ? `${apiBaseUrl()}${src}` : src;
}

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
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

/** Fetches `path` from the API with the admin bearer token; throws ApiError on failure. */
export async function api<T>(path: string, init: RequestInit = {}, token: string | null = readToken()): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  const body = await parseBody(res);
  if (!res.ok) {
    const obj = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const error = typeof obj.error === 'string' ? obj.error : 'ERROR';
    const message = typeof obj.message === 'string' ? obj.message : res.statusText || error;
    const fields = obj.fields && typeof obj.fields === 'object' ? (obj.fields as Record<string, string>) : undefined;
    const { statusCode: _s, error: _e, message: _m, fields: _f, ...rest } = obj;
    throw new ApiError(res.status, error, message, fields, Object.keys(rest).length > 0 ? rest : undefined);
  }
  return body as T;
}
