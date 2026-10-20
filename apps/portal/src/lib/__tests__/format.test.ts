import { describe, expect, it } from 'vitest';
import { formatVnd } from '../format';

describe('formatVnd', () => {
  it('formats zero', () => {
    expect(formatVnd(0)).toBe('0 ₫');
  });

  it('groups thousands with dots', () => {
    expect(formatVnd(1250000)).toBe('1.250.000 ₫');
    expect(formatVnd(125000)).toBe('125.000 ₫');
  });
});
