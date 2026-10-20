import { describe, it, expect } from 'vitest';
import { checkoutFormSchema } from '../checkout';

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
});
