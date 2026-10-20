import { describe, expect, it } from 'vitest';
import { parseIntField, slugify, telHref } from '../format';

describe('telHref', () => {
  it('keeps digits only', () => expect(telHref('0912 345 678')).toBe('tel:0912345678'));
  it('keeps a leading plus', () => expect(telHref('+84 912-345-678')).toBe('tel:+84912345678'));
});

describe('parseIntField', () => {
  it('parses whole numbers', () => expect(parseIntField(' 45000 ')).toBe(45000));
  it.each(['', 'abc', '1.5', '-3', '1e3'])('rejects %j', (v) => expect(parseIntField(v)).toBeNaN());
});

describe('slugify', () => {
  it('removes diacritics and joins words', () => expect(slugify('Gạo lứt đỏ')).toBe('gao-lut-do'));
  it('trims separators', () => expect(slugify('  Mè (rang)!  ')).toBe('me-rang'));
});
