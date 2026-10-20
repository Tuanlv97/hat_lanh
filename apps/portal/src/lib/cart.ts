'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { ProductSummary } from './catalog';

/**
 * The cart lives only in the browser (localStorage `hl_cart`), for guests and logged-in customers alike:
 * there is no server-side cart, so logging in or out leaves it unchanged.
 */

/** One cart line as stored in localStorage `hl_cart`. */
export type CartLine = { variantId: string; quantity: number };

/** localStorage key holding the cart: JSON array of `{ variantId, quantity }`. */
export const CART_KEY = 'hl_cart';
/** Same-tab change signal; `storage` events only fire in other tabs. */
export const CART_EVENT = 'hl:cart';
export const MAX_LINE_QUANTITY = 99;

export type CartAction =
  /** Adds to an existing line or appends one. `max` (known stock) caps the line total. */
  | { type: 'add'; variantId: string; quantity: number; max?: number }
  /** Sets a line's quantity; 0 or less removes it. */
  | { type: 'setQuantity'; variantId: string; quantity: number; max?: number }
  | { type: 'remove'; variantId: string }
  | { type: 'clear' }
  /** Combines another cart (e.g. another tab's) into this one: overlapping lines are summed, then clamped. */
  | { type: 'merge'; lines: CartLine[] };

function limitOf(max: number | undefined): number {
  if (max === undefined || !Number.isFinite(max)) return MAX_LINE_QUANTITY;
  return Math.min(MAX_LINE_QUANTITY, Math.floor(max));
}

/** Whole quantity in 1..limit (non-numbers become 1). */
function clampQty(q: number, limit = MAX_LINE_QUANTITY): number {
  const n = Number.isFinite(q) ? Math.floor(q) : 1;
  return Math.max(1, Math.min(Math.max(1, limit), n));
}

/** Pure cart state transitions. Never mutates `state`; returns it unchanged when nothing happens. */
export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const limit = limitOf(action.max);
      if (limit < 1) return state;
      const add = clampQty(action.quantity);
      const i = state.findIndex((l) => l.variantId === action.variantId);
      if (i === -1) return [...state, { variantId: action.variantId, quantity: Math.min(add, limit) }];
      const next = Math.min(limit, clampQty(state[i].quantity + add));
      if (next === state[i].quantity) return state;
      return state.map((l, j) => (j === i ? { ...l, quantity: next } : l));
    }
    case 'setQuantity': {
      const i = state.findIndex((l) => l.variantId === action.variantId);
      if (i === -1) return state;
      if (!(action.quantity >= 1)) return state.filter((_, j) => j !== i);
      const next = clampQty(action.quantity, limitOf(action.max));
      if (next === state[i].quantity) return state;
      return state.map((l, j) => (j === i ? { ...l, quantity: next } : l));
    }
    case 'remove':
      return state.some((l) => l.variantId === action.variantId) ? state.filter((l) => l.variantId !== action.variantId) : state;
    case 'clear':
      return state.length === 0 ? state : [];
    case 'merge': {
      const totals = new Map<string, number>();
      for (const l of [...state, ...action.lines]) totals.set(l.variantId, (totals.get(l.variantId) ?? 0) + l.quantity);
      return [...totals].map(([variantId, quantity]) => ({ variantId, quantity: clampQty(quantity) }));
    }
  }
}

/**
 * Parses a raw `hl_cart` value: drops anything that is not a `{ variantId: string, quantity: number >= 1 }` line,
 * floors and clamps quantities, merges duplicate variants. Garbage gives an empty cart.
 */
export function parseCart(raw: string | null): CartLine[] {
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
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 1) continue;
    lines.push({ variantId, quantity: clampQty(quantity) });
  }
  return cartReducer([], { type: 'merge', lines });
}

/** Total quantity in a raw `hl_cart` value; anything missing or malformed counts as 0. */
export function countCartItems(raw: string | null): number {
  return parseCart(raw).reduce((sum, l) => sum + l.quantity, 0);
}

// ---- browser store (localStorage + same-tab event + cross-tab `storage` event) ----

const EMPTY: CartLine[] = [];
/** Used only when localStorage is unavailable (private mode, blocked storage): the cart lasts for this page. */
let memory: CartLine[] | null = null;
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY };

function readCart(): CartLine[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(CART_KEY);
  } catch {
    return memory ?? EMPTY;
  }
  if (memory) return memory;
  // useSyncExternalStore needs a stable snapshot: re-parse only when the stored text changes.
  if (raw !== cache.raw) cache = { raw, lines: parseCart(raw) };
  return cache.lines;
}

function writeCart(lines: CartLine[]): void {
  try {
    if (lines.length === 0) localStorage.removeItem(CART_KEY);
    else localStorage.setItem(CART_KEY, JSON.stringify(lines));
    memory = null;
  } catch {
    memory = lines;
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(CART_EVENT));
}

/** Applies an action to the current stored cart (re-read first, so another tab's change is never lost). */
export function dispatchCart(action: CartAction): CartLine[] {
  const prev = readCart();
  const next = cartReducer(prev, action);
  if (next !== prev) writeCart(next);
  return next;
}

/** Adds a variant (capped at `max` when the stock is known) and reports how many were actually added. */
export function addToCart(variantId: string, quantity: number, max?: number): { lines: CartLine[]; added: number } {
  const before = readCart().find((l) => l.variantId === variantId)?.quantity ?? 0;
  const lines = dispatchCart({ type: 'add', variantId, quantity, max });
  const after = lines.find((l) => l.variantId === variantId)?.quantity ?? 0;
  return { lines, added: after - before };
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CART_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CART_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CART_EVENT, onChange);
  };
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true once the browser cart has been read (avoids an empty-cart flash). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export type CartApi = {
  lines: CartLine[];
  /** False until the stored cart has been read in the browser. */
  ready: boolean;
  add(variantId: string, quantity: number, max?: number): void;
  setQuantity(variantId: string, quantity: number, max?: number): void;
  remove(variantId: string): void;
  clear(): void;
};

/** The cart, shared by every component and kept in sync across tabs. No provider needed. */
export function useCart(): CartApi {
  const lines = useSyncExternalStore(subscribe, readCart, () => EMPTY);
  const ready = useHydrated();
  const add = useCallback((variantId: string, quantity: number, max?: number) => void dispatchCart({ type: 'add', variantId, quantity, max }), []);
  const setQuantity = useCallback(
    (variantId: string, quantity: number, max?: number) => void dispatchCart({ type: 'setQuantity', variantId, quantity, max }),
    [],
  );
  const remove = useCallback((variantId: string) => void dispatchCart({ type: 'remove', variantId }), []);
  const clear = useCallback(() => void dispatchCart({ type: 'clear' }), []);
  return useMemo(() => ({ lines, ready, add, setQuantity, remove, clear }), [lines, ready, add, setQuantity, remove, clear]);
}

/** Number of items in the cart (sum of quantities); 0 during SSR. */
export function useCartCount(): number {
  const lines = useSyncExternalStore(subscribe, readCart, () => EMPTY);
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

// ---- resolving lines against the catalog ----

export type CartLineStatus = 'ok' | 'unavailable' | 'sold_out' | 'over_stock';

export type ResolvedLine = CartLine & {
  status: CartLineStatus;
  /** null when the variant is no longer sold (unknown, hidden, or its product hidden). */
  item: { productName: string; slug: string; image: string | null; label: string; priceVnd: number; stock: number } | null;
  /** Price × quantity for purchasable lines, else 0. */
  lineTotalVnd: number;
};

export type ResolvedCart = {
  lines: ResolvedLine[];
  /** Sum over purchasable lines (ok status). */
  subtotalVnd: number;
  itemCount: number;
  /** Lines that must be removed or adjusted before checkout. */
  blocking: number;
  canCheckout: boolean;
};

/**
 * Pure: joins cart lines with `GET /products` (active products with their active variants and stock).
 * A variant missing from the list is no longer sold.
 */
export function resolveCartLines(lines: CartLine[], products: ProductSummary[]): ResolvedCart {
  const byVariant = new Map<string, ResolvedLine['item'] & object>();
  for (const p of products) {
    for (const v of p.variants) {
      byVariant.set(v.id, {
        productName: p.name,
        slug: p.slug,
        image: p.images[0] ?? null,
        label: v.label,
        priceVnd: v.priceVnd,
        stock: Math.max(0, Math.floor(v.stock)),
      });
    }
  }
  const resolved = lines.map<ResolvedLine>((l) => {
    const item = byVariant.get(l.variantId) ?? null;
    const status: CartLineStatus = !item ? 'unavailable' : item.stock <= 0 ? 'sold_out' : l.quantity > item.stock ? 'over_stock' : 'ok';
    return { ...l, status, item, lineTotalVnd: status === 'ok' && item ? item.priceVnd * l.quantity : 0 };
  });
  const blocking = resolved.filter((l) => l.status !== 'ok').length;
  return {
    lines: resolved,
    subtotalVnd: resolved.reduce((s, l) => s + l.lineTotalVnd, 0),
    itemCount: resolved.reduce((s, l) => s + l.quantity, 0),
    blocking,
    canCheckout: resolved.length > 0 && blocking === 0,
  };
}

/** The clamps that bring each over-stock line down to the remaining stock. */
export function overStockFixes(lines: ResolvedLine[]): CartLine[] {
  return lines
    .filter((l) => l.status === 'over_stock' && l.item)
    .map((l) => ({ variantId: l.variantId, quantity: Math.min(MAX_LINE_QUANTITY, l.item!.stock) }));
}
