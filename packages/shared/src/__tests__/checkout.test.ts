import { describe, it, expect } from 'vitest';
import { CHECKOUT_LIMITS, checkoutFormSchema } from '../checkout';

const valid = {
  fullName: 'Nguyễn Văn A',
  phone: '+84 912 345 678',
  email: 'a@example.com',
  provinceCode: '79',
  wardCode: '26734',
  addressDetail: '12 Lê Lợi',
};

describe('checkoutFormSchema', () => {
  it('passes valid input with normalized phone', () => {
    const r = checkoutFormSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('0912345678');
  });
  it('fails without wardCode', () => {
    const { wardCode, ...rest } = valid;
    expect(checkoutFormSchema.safeParse(rest).success).toBe(false);
  });
  it('fails on bad email', () => {
    expect(checkoutFormSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });

  describe('length limits (after trim)', () => {
    // 64 + 1 + 189 = 254 chars, a syntactically valid address.
    const email254 = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
    const fieldError = (input: Record<string, unknown>, field: string) => {
      const r = checkoutFormSchema.safeParse(input);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toContain(field);
    };

    it('limits are 100 / 254 / 300 / 10', () => {
      expect(CHECKOUT_LIMITS).toEqual({ fullName: 100, email: 254, addressDetail: 300, code: 10 });
      expect(email254).toHaveLength(254);
    });
    it('accepts fields exactly at the limit (and surrounding spaces do not count)', () => {
      const r = checkoutFormSchema.safeParse({
        ...valid,
        fullName: `  ${'A'.repeat(100)}  `,
        email: email254,
        addressDetail: ` ${'đ'.repeat(300)} `,
        provinceCode: ' 79 ',
        wardCode: '1234567890',
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.fullName).toHaveLength(100);
        expect(r.data.addressDetail).toHaveLength(300);
        expect(r.data.provinceCode).toBe('79');
      }
    });
    it('rejects over-length fullName with a Vietnamese message', () => {
      const r = checkoutFormSchema.safeParse({ ...valid, fullName: 'A'.repeat(101) });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]).toMatchObject({ path: ['fullName'], message: 'Họ tên tối đa 100 ký tự' });
    });
    it('rejects over-length email', () => {
      fieldError({ ...valid, email: `a${email254}` }, 'email');
    });
    it('rejects over-length addressDetail', () => {
      fieldError({ ...valid, addressDetail: 'x'.repeat(301) }, 'addressDetail');
    });
    it('rejects whitespace-only and over-long province/ward codes', () => {
      fieldError({ ...valid, wardCode: '   ' }, 'wardCode');
      fieldError({ ...valid, provinceCode: ' ' }, 'provinceCode');
      fieldError({ ...valid, wardCode: '12345678901' }, 'wardCode');
      fieldError({ ...valid, provinceCode: '12345678901' }, 'provinceCode');
    });
  });
});
