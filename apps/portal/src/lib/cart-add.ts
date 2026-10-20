import { CART_EVENT, CART_KEY } from './cart-count';

/** One cart line as stored in localStorage `hl_cart`. */
export type CartLine = { variantId: string; quantity: number };

export const MAX_LINE_QUANTITY = 99;

function clampLine(q: unknown): number {
  const n = typeof q === 'number' && Number.isFinite(q) ? Math.floor(q) : 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, n));
}

/** Parses a raw `hl_cart` value, dropping anything that is not a `{ variantId: string, quantity: number }` line. */
function parseLines(raw: string | null): CartLine[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const lines: CartLine[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const { variantId, quantity } = item as { variantId?: unknown; quantity?: unknown };
    if (typeof variantId !== 'string' || !variantId) continue;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) continue;
    lines.push({ variantId, quantity: clampLine(quantity) });
  }
  return lines;
}

/** Pure: the cart after adding `quantity` of `variantId` (merged into an existing line, totals clamped to 1–99). */
export function mergeCartLine(raw: string | null, variantId: string, quantity: number): CartLine[] {
  const lines = parseLines(raw);
  const add = clampLine(quantity);
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) existing.quantity = clampLine(existing.quantity + add);
  else lines.push({ variantId, quantity: add });
  return lines;
}

/**
 * Adds a variant to the guest cart in localStorage and signals the header count (`hl:cart`).
 * Interim helper until Task 15 moves it into `lib/cart.ts`.
 */
export function addToCart(variantId: string, quantity: number): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CART_KEY);
  } catch {
    /* storage unavailable */
  }
  const lines = mergeCartLine(raw, variantId, quantity);
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable: the line lives only for this page */
  }
  window.dispatchEvent(new Event(CART_EVENT));
  return lines;
}
