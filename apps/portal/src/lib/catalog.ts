/** Public catalog shapes, as returned by the API (`apps/api/src/catalog/products.service.ts`). */
export type Variant = {
  id: string;
  label: string;
  priceVnd: number;
  stock: number;
  isActive?: boolean;
};

export type Category = { id: string; slug: string; name: string; sortOrder: number };

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  category: { slug: string; name: string };
  images: string[];
  minPriceVnd: number;
  variants: Variant[];
};

export type Review = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  userName: string;
};

export type ProductDetail = ProductSummary & {
  description: string;
  origin: string;
  benefits: string;
  averageRating: number;
  reviewCount: number;
  reviews: Review[];
};

export const MAX_QUANTITY = 99;

/** Lowest price across the variants, or null when there are none. */
export function priceFrom(variants: Variant[]): number | null {
  if (variants.length === 0) return null;
  return Math.min(...variants.map((v) => v.priceVnd));
}

/** True when the variants carry more than one price, so the price reads "Từ …". */
export function hasPriceRange(variants: Variant[]): boolean {
  return new Set(variants.map((v) => v.priceVnd)).size > 1;
}

/** True when no variant can be bought. */
export function isSoldOut(variants: Variant[]): boolean {
  return !variants.some((v) => v.stock > 0);
}

/** The variant preselected on the detail page: the first one in stock, else the first. */
export function defaultVariant(variants: Variant[]): Variant | undefined {
  return variants.find((v) => v.stock > 0) ?? variants[0];
}

/** Most of this variant one line can hold: its stock, capped at 99. */
export function maxQuantity(variant: Variant | undefined): number {
  if (!variant) return 0;
  return Math.max(0, Math.min(MAX_QUANTITY, Math.floor(variant.stock)));
}

/** Clamps a typed quantity to 1..max (max below 1 still yields 1; the button is disabled then). */
export function clampQuantity(q: number, max: number): number {
  const n = Number.isFinite(q) ? Math.floor(q) : 1;
  return Math.max(1, Math.min(Math.max(1, max), n));
}

/** "4,5/5 · 3 đánh giá", or "Chưa có đánh giá". */
export function ratingSummary(average: number, count: number): string {
  if (count <= 0) return 'Chưa có đánh giá';
  const avg = (Math.round(average * 10) / 10).toString().replace('.', ',');
  return `${avg}/5 · ${count} đánh giá`;
}

/** The seed leaves origin as a bracketed note for the owner, e.g. "[Điền vùng trồng / nhà cung cấp]". */
export function isOriginPlaceholder(origin: string): boolean {
  return /^\[.*\]$/s.test(origin.trim());
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** dd/mm/yyyy in Vietnam time; '' for an unparseable value. */
export function formatDateVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return dateFmt.format(d);
}

/** A product slug safe to put in an API path: not empty, not `.`/`..` (raw or percent-encoded), no slashes. */
export function isSafeSlug(slug: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return false;
  }
  if (!decoded || decoded === '.' || decoded === '..') return false;
  return !decoded.includes('/') && !decoded.includes('\\');
}
