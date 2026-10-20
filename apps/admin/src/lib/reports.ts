import { RETURN_REASONS, type ReturnReason } from '@hatlanh/shared';

export type BestSeller = { productId: string; name: string; quantity: number };
export type ReturnRow = {
  productId: string;
  name: string;
  returnedQuantity: number;
  soldQuantity: number;
  rate: number;
  reasons: Record<ReturnReason, number>;
};
export type RevenuePoint = { period: string; revenueVnd: number };
export type RevenueGroup = 'day' | 'week' | 'month';

export const GROUP_LABEL: Record<RevenueGroup, string> = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };
export const MAX_RANGE_DAYS = 366;

const DAY_MS = 86_400_000;
const hcmDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** `YYYY-MM-DD` of an instant on the shop's calendar (Asia/Ho_Chi_Minh), matching the API's date-only rule. */
export function shopDay(d: Date): string {
  return hcmDate.format(d);
}

/** Default report range: the last 30 days, inclusive of today. */
export function defaultRange(now = new Date()): { from: string; to: string } {
  return { from: shopDay(new Date(now.getTime() - 30 * DAY_MS)), to: shopDay(now) };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Vietnamese error for an invalid range, or null. Mirrors the API's checks so the user sees it before the request. */
export function validateRange(from: string, to: string): string | null {
  if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to)) return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc';
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 'Ngày không hợp lệ';
  if (a > b) return 'Ngày bắt đầu phải trước ngày kết thúc';
  if ((b - a) / DAY_MS > MAX_RANGE_DAYS) return `Khoảng thời gian tối đa ${MAX_RANGE_DAYS} ngày`;
  return null;
}

/** Round an axis maximum up to 1, 2, 5 × 10ⁿ so ticks land on clean numbers. */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Percent text with a comma decimal, e.g. 0.0833 gives "8,3%". */
export function formatRate(rate: number): string {
  return `${(Math.round(rate * 1000) / 10).toString().replace('.', ',')}%`;
}

/** Compact VND for axis ticks: 1.200.000 gives "1,2tr", 45.000 gives "45k". */
export function compactVnd(n: number): string {
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toString().replace('.', ',')}tr`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** Non-empty reason segments of a return row, in the fixed reason order (colors follow the reason, not its size). */
export function reasonSegments(row: ReturnRow): { reason: ReturnReason; quantity: number }[] {
  return RETURN_REASONS.map((reason) => ({ reason, quantity: row.reasons[reason] ?? 0 })).filter((s) => s.quantity > 0);
}

/** `2026-10-19` as `19/10`, `2026-10` style buckets are never produced: the API returns the bucket's first day. */
export function periodLabel(period: string, group: RevenueGroup): string {
  const [y, m, d] = period.split('-');
  if (!y || !m || !d) return period;
  if (group === 'month') return `${m}/${y}`;
  if (group === 'week') return `Tuần ${d}/${m}`;
  return `${d}/${m}`;
}
