import { describe, expect, it } from 'vitest';
import { compactVnd, defaultRange, formatRate, niceMax, periodLabel, reasonSegments, shopDay, validateRange, type ReturnRow } from '../reports';

describe('shopDay / defaultRange', () => {
  it('uses the Ho Chi Minh calendar day', () => {
    // 18:00 UTC on the 19th is already the 20th in UTC+7
    expect(shopDay(new Date('2026-10-19T18:00:00Z'))).toBe('2026-10-20');
    expect(shopDay(new Date('2026-10-19T16:59:00Z'))).toBe('2026-10-19');
  });
  it('defaults to the last 30 days', () => {
    expect(defaultRange(new Date('2026-10-20T05:00:00Z'))).toEqual({ from: '2026-09-20', to: '2026-10-20' });
  });
});

describe('validateRange', () => {
  it('accepts a normal range and a single day', () => {
    expect(validateRange('2026-10-01', '2026-10-20')).toBeNull();
    expect(validateRange('2026-10-20', '2026-10-20')).toBeNull();
  });
  it('rejects empty, reversed and over-long ranges', () => {
    expect(validateRange('', '2026-10-20')).toMatch(/chọn/);
    expect(validateRange('2026-10-21', '2026-10-20')).toMatch(/trước/);
    expect(validateRange('2025-01-01', '2026-10-20')).toMatch(/tối đa/);
  });
  it('accepts exactly 366 days', () => expect(validateRange('2025-10-20', '2026-10-21')).toBeNull());
});

describe('niceMax', () => {
  it.each([
    [0, 1],
    [1, 1],
    [3, 5],
    [7, 10],
    [120, 200],
    [4_900_000, 5_000_000],
  ])('%d -> %d', (input, out) => expect(niceMax(input)).toBe(out));
});

describe('formatters', () => {
  it('formats rates with a decimal comma', () => {
    expect(formatRate(0)).toBe('0%');
    expect(formatRate(0.0833)).toBe('8,3%');
    expect(formatRate(0.5)).toBe('50%');
  });
  it('compacts VND', () => {
    expect(compactVnd(500)).toBe('500');
    expect(compactVnd(45_000)).toBe('45k');
    expect(compactVnd(1_250_000)).toBe('1,3tr');
  });
  it('labels periods', () => {
    expect(periodLabel('2026-10-19', 'day')).toBe('19/10');
    expect(periodLabel('2026-10-19', 'week')).toBe('Tuần 19/10');
    expect(periodLabel('2026-10-01', 'month')).toBe('10/2026');
  });
});

describe('reasonSegments', () => {
  it('keeps the fixed reason order and drops zeros', () => {
    const row = {
      reasons: { DAMAGED: 0, WRONG_ITEM: 2, CHANGED_MIND: 0, OTHER: 1 },
    } as ReturnRow;
    expect(reasonSegments(row)).toEqual([
      { reason: 'WRONG_ITEM', quantity: 2 },
      { reason: 'OTHER', quantity: 1 },
    ]);
  });
});
