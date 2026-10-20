'use client';

import { useSyncExternalStore } from 'react';

/** localStorage key holding the guest cart: JSON array of `{ variantId, quantity }`. */
export const CART_KEY = 'hl_cart';
/** Same-tab change signal; `storage` events only fire in other tabs. */
export const CART_EVENT = 'hl:cart';

/** Total quantity in a raw `hl_cart` value; anything missing or malformed counts as 0. */
export function countCartItems(raw: string | null): number {
  if (!raw) return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!Array.isArray(parsed)) return 0;
  return parsed.reduce<number>((sum, line) => {
    const q = (line as { quantity?: unknown } | null)?.quantity;
    return typeof q === 'number' && Number.isFinite(q) && q > 0 ? sum + Math.floor(q) : sum;
  }, 0);
}

function read(): number {
  try {
    return countCartItems(localStorage.getItem(CART_KEY));
  } catch {
    return 0;
  }
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

/** Number of items in the cart; 0 during SSR. Task 15 re-points this at the real cart state. */
export function useCartCount(): number {
  return useSyncExternalStore(subscribe, read, () => 0);
}
