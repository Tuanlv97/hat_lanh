const MAX_LENGTH = 2048;
/** Pages that must never be the place we send someone back to after signing in. */
const AUTH_PAGES = ['/dang-nhap', '/dang-ky'];

/**
 * The `?next=` return path, only if it is a same-origin relative path; otherwise `/`.
 * Rejects `//host` and `/\host` (protocol-relative), any scheme, backslashes anywhere, whitespace and
 * control characters (browsers strip tabs/newlines, so `/\t/evil.com` would become `//evil.com`).
 */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return '/';
  if (raw[0] !== '/' || raw[1] === '/' || raw.includes('\\')) return '/';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000- \u007f]/.test(raw)) return '/';
  const pathname = raw.split(/[?#]/)[0];
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return '/';
  return raw;
}

/** Login page URL that brings the visitor back to `path` afterwards. */
export function loginHref(path: string): string {
  const next = safeNextPath(path);
  return next === '/' ? '/dang-nhap' : `/dang-nhap?next=${encodeURIComponent(next)}`;
}
