import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addToCart, mergeCartLine } from '../cart-add';
import { CART_EVENT, CART_KEY } from '../cart-count';

describe('mergeCartLine', () => {
  it('adds a new line to an empty or missing cart', () => {
    expect(mergeCartLine(null, 'v1', 2)).toEqual([{ variantId: 'v1', quantity: 2 }]);
    expect(mergeCartLine('[]', 'v1', 1)).toEqual([{ variantId: 'v1', quantity: 1 }]);
  });

  it('sums the quantity of an existing line and keeps the others', () => {
    const raw = JSON.stringify([
      { variantId: 'v1', quantity: 2 },
      { variantId: 'v2', quantity: 1 },
    ]);
    expect(mergeCartLine(raw, 'v1', 3)).toEqual([
      { variantId: 'v1', quantity: 5 },
      { variantId: 'v2', quantity: 1 },
    ]);
  });

  it('clamps the added quantity and the line total to 1-99', () => {
    expect(mergeCartLine(null, 'v1', 0)).toEqual([{ variantId: 'v1', quantity: 1 }]);
    expect(mergeCartLine(null, 'v1', -4)).toEqual([{ variantId: 'v1', quantity: 1 }]);
    expect(mergeCartLine(null, 'v1', 250)).toEqual([{ variantId: 'v1', quantity: 99 }]);
    expect(mergeCartLine(null, 'v1', 2.7)).toEqual([{ variantId: 'v1', quantity: 2 }]);
    expect(mergeCartLine(null, 'v1', Number.NaN)).toEqual([{ variantId: 'v1', quantity: 1 }]);
    const raw = JSON.stringify([{ variantId: 'v1', quantity: 95 }]);
    expect(mergeCartLine(raw, 'v1', 10)).toEqual([{ variantId: 'v1', quantity: 99 }]);
  });

  it('tolerates garbage JSON, non-arrays and malformed lines', () => {
    expect(mergeCartLine('{oops', 'v1', 1)).toEqual([{ variantId: 'v1', quantity: 1 }]);
    expect(mergeCartLine('{"variantId":"x","quantity":1}', 'v1', 1)).toEqual([{ variantId: 'v1', quantity: 1 }]);
    const raw = JSON.stringify([
      null,
      'x',
      { variantId: 5, quantity: 1 },
      { variantId: 'v2', quantity: 'many' },
      { variantId: 'v3', quantity: 500 },
      { variantId: 'v4', quantity: 2 },
    ]);
    expect(mergeCartLine(raw, 'v1', 1)).toEqual([
      { variantId: 'v3', quantity: 99 },
      { variantId: 'v4', quantity: 2 },
      { variantId: 'v1', quantity: 1 },
    ]);
  });
});

describe('addToCart', () => {
  let store: Map<string, string>;
  let dispatched: string[];

  beforeEach(() => {
    store = new Map();
    dispatched = [];
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    });
    vi.stubGlobal('window', { dispatchEvent: (e: Event) => (dispatched.push(e.type), true) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes the merged cart to hl_cart and dispatches hl:cart', () => {
    store.set(CART_KEY, JSON.stringify([{ variantId: 'v1', quantity: 1 }]));
    const lines = addToCart('v1', 2);
    expect(lines).toEqual([{ variantId: 'v1', quantity: 3 }]);
    expect(JSON.parse(store.get(CART_KEY)!)).toEqual([{ variantId: 'v1', quantity: 3 }]);
    expect(dispatched).toEqual([CART_EVENT]);
  });

  it('replaces a garbage cart instead of throwing', () => {
    store.set(CART_KEY, 'not json');
    expect(addToCart('v9', 1)).toEqual([{ variantId: 'v9', quantity: 1 }]);
    expect(JSON.parse(store.get(CART_KEY)!)).toEqual([{ variantId: 'v9', quantity: 1 }]);
  });

  it('still returns the lines when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(addToCart('v1', 1)).toEqual([{ variantId: 'v1', quantity: 1 }]);
    expect(dispatched).toEqual([CART_EVENT]);
  });
});
