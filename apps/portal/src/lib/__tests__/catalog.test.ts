import { describe, expect, it } from 'vitest';
import {
  clampQuantity,
  defaultVariant,
  formatDateVi,
  hasPriceRange,
  isOriginPlaceholder,
  isSoldOut,
  maxQuantity,
  priceFrom,
  ratingSummary,
  type Variant,
} from '../catalog';

const v = (id: string, priceVnd: number, stock: number): Variant => ({ id, label: id, priceVnd, stock });

describe('priceFrom', () => {
  it('returns the lowest variant price', () => {
    expect(priceFrom([v('a', 88000, 1), v('b', 45000, 0), v('c', 210000, 3)])).toBe(45000);
  });
  it('returns null without variants', () => {
    expect(priceFrom([])).toBeNull();
  });
});

describe('hasPriceRange', () => {
  it('is true only when variants carry different prices', () => {
    expect(hasPriceRange([v('a', 1, 1), v('b', 2, 1)])).toBe(true);
    expect(hasPriceRange([v('a', 5, 1), v('b', 5, 1)])).toBe(false);
    expect(hasPriceRange([v('a', 5, 1)])).toBe(false);
    expect(hasPriceRange([])).toBe(false);
  });
});

describe('isSoldOut', () => {
  it('is true when every variant has no stock (or there are none)', () => {
    expect(isSoldOut([v('a', 1, 0), v('b', 2, 0)])).toBe(true);
    expect(isSoldOut([])).toBe(true);
  });
  it('is false when any variant has stock', () => {
    expect(isSoldOut([v('a', 1, 0), v('b', 2, 4)])).toBe(false);
  });
});

describe('defaultVariant', () => {
  it('picks the first in-stock variant, else the first', () => {
    expect(defaultVariant([v('a', 1, 0), v('b', 2, 4)])?.id).toBe('b');
    expect(defaultVariant([v('a', 1, 0), v('b', 2, 0)])?.id).toBe('a');
    expect(defaultVariant([])).toBeUndefined();
  });
});

describe('maxQuantity / clampQuantity', () => {
  it('caps at 99 and at available stock', () => {
    expect(maxQuantity(v('a', 1, 500))).toBe(99);
    expect(maxQuantity(v('a', 1, 7))).toBe(7);
    expect(maxQuantity(v('a', 1, 0))).toBe(0);
    expect(maxQuantity(undefined)).toBe(0);
  });
  it('clamps to 1..max and floors fractions', () => {
    expect(clampQuantity(0, 7)).toBe(1);
    expect(clampQuantity(12, 7)).toBe(7);
    expect(clampQuantity(3.9, 7)).toBe(3);
    expect(clampQuantity(Number.NaN, 7)).toBe(1);
    expect(clampQuantity(5, 0)).toBe(1);
  });
});

describe('ratingSummary', () => {
  it('formats the average with a Vietnamese decimal comma and the count', () => {
    expect(ratingSummary(4.5, 3)).toBe('4,5/5 · 3 đánh giá');
    expect(ratingSummary(4, 1)).toBe('4/5 · 1 đánh giá');
  });
  it('says there are no reviews yet', () => {
    expect(ratingSummary(0, 0)).toBe('Chưa có đánh giá');
  });
});

describe('isOriginPlaceholder', () => {
  it('detects the bracketed seed placeholder', () => {
    expect(isOriginPlaceholder('[Điền vùng trồng / nhà cung cấp]')).toBe(true);
    expect(isOriginPlaceholder('  [Điền vùng trồng / nhà cung cấp] ')).toBe(true);
    expect(isOriginPlaceholder('Hợp tác xã ở Đồng Tháp')).toBe(false);
    expect(isOriginPlaceholder('')).toBe(false);
  });
});

describe('formatDateVi', () => {
  it('formats an ISO date as dd/mm/yyyy in Vietnam time', () => {
    expect(formatDateVi('2026-10-19T18:30:00.000Z')).toBe('20/10/2026');
    expect(formatDateVi('2026-01-05T03:00:00.000Z')).toBe('05/01/2026');
  });
  it('returns an empty string for an invalid date', () => {
    expect(formatDateVi('nope')).toBe('');
  });
});
