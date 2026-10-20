import type { OrderStatus, ReturnReason, ReturnStatus } from '@hatlanh/shared';

const vnd = new Intl.NumberFormat('vi-VN');
export const formatVnd = (n: number): string => `${vnd.format(n)}đ`;

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateTime.format(d);
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
};

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  DAMAGED: 'Hàng hư hỏng',
  WRONG_ITEM: 'Giao sai hàng',
  CHANGED_MIND: 'Đổi ý',
  OTHER: 'Lý do khác',
};

/** `tel:` href for a stored phone number; strips anything that is not a digit or leading plus. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Whole-number input: '' and non-numeric text give NaN so callers can show an error. */
export function parseIntField(raw: string): number {
  const t = raw.trim();
  return /^\d+$/.test(t) ? Number.parseInt(t, 10) : Number.NaN;
}

/** URL-safe slug without diacritics, for suggesting a product slug from its name. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
