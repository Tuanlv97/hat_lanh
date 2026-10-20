import { describe, expect, it } from 'vitest';
import { countCartItems } from '../cart-count';

describe('countCartItems', () => {
  it('returns 0 for a missing value', () => {
    expect(countCartItems(null)).toBe(0);
  });

  it('returns 0 for garbled JSON or a non-array', () => {
    expect(countCartItems('{oops')).toBe(0);
    expect(countCartItems('{"variantId":"a","quantity":2}')).toBe(0);
  });

  it('sums quantities and ignores malformed lines', () => {
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
