/** Formats a whole-dong amount the Vietnamese way: 1250000 -> "1.250.000 ₫" (plain space before ₫). */
export function formatVnd(n: number): string {
  const value = Number.isFinite(n) ? Math.round(n) : 0;
  const digits = Math.abs(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${digits} ₫`;
}
