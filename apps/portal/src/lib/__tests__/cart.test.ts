import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToCart,
  CART_EVENT,
  CART_KEY,
  cartReducer,
  countCartItems,
  overStockFixes,
  parseCart,
  resolveCartLines,
  type CartLine,
} from '../cart';
import type { ProductSummary } from '../catalog';

const line = (variantId: string, quantity: number): CartLine => ({ variantId, quantity });

describe('cartReducer', () => {
  it('adding the same variant twice sums the quantities', () => {
    let s = cartReducer([], { type: 'add', variantId: 'v1', quantity: 2 });
    s = cartReducer(s, { type: 'add', variantId: 'v1', quantity: 3 });
    expect(s).toEqual([line('v1', 5)]);
  });

  it('adds distinct variants as separate lines, in order', () => {
    let s = cartReducer([], { type: 'add', variantId: 'v1', quantity: 1 });
    s = cartReducer(s, { type: 'add', variantId: 'v2', quantity: 1 });
    expect(s).toEqual([line('v1', 1), line('v2', 1)]);
  });

  it('clamps 150 to 99 (add and setQuantity)', () => {
    expect(cartReducer([], { type: 'add', variantId: 'v1', quantity: 150 })).toEqual([line('v1', 99)]);
    expect(cartReducer([line('v1', 95)], { type: 'add', variantId: 'v1', quantity: 10 })).toEqual([line('v1', 99)]);
    expect(cartReducer([line('v1', 1)], { type: 'setQuantity', variantId: 'v1', quantity: 150 })).toEqual([line('v1', 99)]);
  });

  it('add clamps a bad quantity to at least 1 and floors fractions', () => {
    expect(cartReducer([], { type: 'add', variantId: 'v1', quantity: 0 })).toEqual([line('v1', 1)]);
    expect(cartReducer([], { type: 'add', variantId: 'v1', quantity: Number.NaN })).toEqual([line('v1', 1)]);
    expect(cartReducer([], { type: 'add', variantId: 'v1', quantity: 2.7 })).toEqual([line('v1', 2)]);
  });

  it('add never exceeds a provided max (known stock)', () => {
    expect(cartReducer([line('v1', 3)], { type: 'add', variantId: 'v1', quantity: 5, max: 6 })).toEqual([line('v1', 6)]);
    expect(cartReducer([], { type: 'add', variantId: 'v1', quantity: 5, max: 2 })).toEqual([line('v1', 2)]);
    // Nothing in stock: the cart is unchanged.
    const s = [line('v2', 1)];
    expect(cartReducer(s, { type: 'add', variantId: 'v1', quantity: 1, max: 0 })).toBe(s);
  });

  it('setQuantity to 0 (or below) removes the line', () => {
    const s = [line('v1', 2), line('v2', 1)];
    expect(cartReducer(s, { type: 'setQuantity', variantId: 'v1', quantity: 0 })).toEqual([line('v2', 1)]);
    expect(cartReducer(s, { type: 'setQuantity', variantId: 'v1', quantity: -3 })).toEqual([line('v2', 1)]);
  });

  it('setQuantity respects a max and ignores unknown variants', () => {
    expect(cartReducer([line('v1', 2)], { type: 'setQuantity', variantId: 'v1', quantity: 9, max: 4 })).toEqual([line('v1', 4)]);
    const s = [line('v1', 2)];
    expect(cartReducer(s, { type: 'setQuantity', variantId: 'zz', quantity: 3 })).toBe(s);
  });

  it('remove and clear', () => {
    const s = [line('v1', 2), line('v2', 1)];
    expect(cartReducer(s, { type: 'remove', variantId: 'v1' })).toEqual([line('v2', 1)]);
    expect(cartReducer(s, { type: 'clear' })).toEqual([]);
  });

  it('merge sums overlapping lines (then clamps) and keeps distinct ones', () => {
    const mine = [line('a', 2), line('b', 60)];
    const theirs = [line('b', 50), line('c', 1)];
    expect(cartReducer(mine, { type: 'merge', lines: theirs })).toEqual([line('a', 2), line('b', 99), line('c', 1)]);
    expect(cartReducer(mine, { type: 'merge', lines: [line('a', 3)] })).toEqual([line('a', 5), line('b', 60)]);
  });

  it('never mutates the previous state', () => {
    const s = Object.freeze([Object.freeze(line('v1', 1))]) as CartLine[];
    expect(() => cartReducer(s, { type: 'add', variantId: 'v1', quantity: 1 })).not.toThrow();
    expect(s).toEqual([line('v1', 1)]);
  });
});

describe('parseCart / countCartItems', () => {
  it('garbage persisted JSON gives an empty cart', () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart('')).toEqual([]);
    expect(parseCart('{oops')).toEqual([]);
    expect(parseCart('{"variantId":"a","quantity":2}')).toEqual([]);
    expect(parseCart('42')).toEqual([]);
  });

  it('keeps well-formed lines, clamps big quantities, drops malformed ones and merges duplicates', () => {
    const raw = JSON.stringify([
      null,
      'x',
      { variantId: 5, quantity: 1 },
      { variantId: '', quantity: 1 },
      { variantId: 'b', quantity: 'many' },
      { variantId: 'c', quantity: -1 },
      { variantId: 'd', quantity: 0 },
      { variantId: 'e', quantity: 500 },
      { variantId: 'f', quantity: 2.9 },
      { variantId: 'f', quantity: 1 },
    ]);
    expect(parseCart(raw)).toEqual([line('e', 99), line('f', 3)]);
  });

  it('countCartItems sums the parsed quantities', () => {
    expect(countCartItems(null)).toBe(0);
    expect(countCartItems('{oops')).toBe(0);
    const raw = JSON.stringify([
      { variantId: 'a', quantity: 2 },
      { variantId: 'b', quantity: 3 },
      { variantId: 'c', quantity: 'x' },
      { variantId: 'd', quantity: -1 },
      null,
    ]);
    expect(countCartItems(raw)).toBe(5);
  });
});

describe('addToCart (localStorage hl_cart + hl:cart event)', () => {
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
    vi.stubGlobal('window', {
      dispatchEvent: (e: Event) => (dispatched.push(e.type), true),
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('writes the merged cart and dispatches hl:cart; reports how many were added', () => {
    store.set(CART_KEY, JSON.stringify([line('v1', 1)]));
    expect(addToCart('v1', 2)).toEqual({ lines: [line('v1', 3)], added: 2 });
    expect(JSON.parse(store.get(CART_KEY)!)).toEqual([line('v1', 3)]);
    expect(dispatched).toEqual([CART_EVENT]);
  });

  it('caps at the known stock', () => {
    store.set(CART_KEY, JSON.stringify([line('v1', 4)]));
    expect(addToCart('v1', 5, 6)).toEqual({ lines: [line('v1', 6)], added: 2 });
    expect(addToCart('v1', 1, 6)).toEqual({ lines: [line('v1', 6)], added: 0 });
  });

  it('replaces a garbage cart instead of throwing', () => {
    store.set(CART_KEY, 'not json');
    expect(addToCart('v9', 1).lines).toEqual([line('v9', 1)]);
  });

  it('still works when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(addToCart('v1', 1).lines).toEqual([line('v1', 1)]);
    expect(dispatched).toEqual([CART_EVENT]);
  });
});

describe('resolveCartLines', () => {
  const products: ProductSummary[] = [
    {
      id: 'p1',
      slug: 'gao-lut-do',
      name: 'Gạo lứt đỏ',
      category: { slug: 'gao', name: 'Gạo' },
      images: ['/uploads/a.webp'],
      minPriceVnd: 40000,
      variants: [
        { id: 'v1', label: '500g', priceVnd: 40000, stock: 20 },
        { id: 'v2', label: '1kg', priceVnd: 75000, stock: 3 },
        { id: 'v3', label: '2kg', priceVnd: 140000, stock: 0 },
      ],
    },
    {
      id: 'p2',
      slug: 'me-rang',
      name: 'Mè rang',
      category: { slug: 'hat', name: 'Hạt' },
      images: [],
      minPriceVnd: 30000,
      variants: [{ id: 'v4', label: '200g', priceVnd: 30000, stock: 50 }],
    },
  ];

  it('joins lines with product data, computes line totals and the subtotal', () => {
    const r = resolveCartLines([line('v1', 2), line('v4', 1)], products);
    expect(r.lines).toEqual([
      {
        variantId: 'v1',
        quantity: 2,
        status: 'ok',
        item: { productName: 'Gạo lứt đỏ', slug: 'gao-lut-do', image: '/uploads/a.webp', label: '500g', priceVnd: 40000, stock: 20 },
        lineTotalVnd: 80000,
      },
      {
        variantId: 'v4',
        quantity: 1,
        status: 'ok',
        item: { productName: 'Mè rang', slug: 'me-rang', image: null, label: '200g', priceVnd: 30000, stock: 50 },
        lineTotalVnd: 30000,
      },
    ]);
    expect(r.subtotalVnd).toBe(110000);
    expect(r.itemCount).toBe(3);
    expect(r.canCheckout).toBe(true);
  });

  it('flags unavailable, sold-out and over-stock lines and blocks checkout', () => {
    const r = resolveCartLines([line('gone', 1), line('v3', 1), line('v2', 5), line('v1', 1)], products);
    expect(r.lines.map((l) => l.status)).toEqual(['unavailable', 'sold_out', 'over_stock', 'ok']);
    expect(r.lines[0].item).toBeNull();
    expect(r.lines[0].lineTotalVnd).toBe(0);
    // Only purchasable lines count toward the subtotal.
    expect(r.subtotalVnd).toBe(40000);
    expect(r.canCheckout).toBe(false);
    expect(r.blocking).toBe(3);
  });

  it('an empty cart cannot check out', () => {
    expect(resolveCartLines([], products)).toMatchObject({ lines: [], subtotalVnd: 0, canCheckout: false });
  });

  it('overStockFixes lists the clamp to the remaining stock for each over-stock line', () => {
    const r = resolveCartLines([line('v2', 5), line('v1', 1), line('v3', 2)], products);
    expect(overStockFixes(r.lines)).toEqual([{ variantId: 'v2', quantity: 3 }]);
  });
});
