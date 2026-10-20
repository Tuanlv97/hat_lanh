import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidVnMobile } from '../phone';

describe('normalizePhone', () => {
  it.each(['0912 345 678', '+84912345678', '84912345678', '091-234-5678'])('normalizes %s', (i) => {
    expect(normalizePhone(i)).toBe('0912345678');
  });
  it.each(['0123456789', '091234567', '09123456789', 'abc', ''])('rejects %s', (i) => {
    expect(normalizePhone(i)).toBeNull();
    expect(isValidVnMobile(i)).toBe(false);
  });
  it('isValidVnMobile accepts valid', () => {
    expect(isValidVnMobile('0912345678')).toBe(true);
  });
});
