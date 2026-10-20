import { describe, expect, it } from 'vitest';
import { ApiError } from '../api';
import { EMPTY_CHECKOUT, firstInvalidField, mapOrderError, validateCheckout, type CheckoutValues } from '../checkout';

const good: CheckoutValues = {
  fullName: '  Nguyễn Thị Lành ',
  phone: '0912 345 678',
  email: 'lanh@example.com',
  provinceCode: '01',
  wardCode: '00004',
  addressDetail: '12 ngõ Trúc Lạc',
};

describe('validateCheckout', () => {
  it('accepts a good form, trims, and normalizes the phone', () => {
    const r = validateCheckout(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ ...good, fullName: 'Nguyễn Thị Lành', phone: '0912345678' });
  });

  it('accepts +84 numbers', () => {
    const r = validateCheckout({ ...good, phone: '+84 912 345 678' });
    expect(r.ok && r.data.phone).toBe('0912345678');
  });

  it('returns the schema Vietnamese message per field', () => {
    const r = validateCheckout({ ...good, phone: '12345', email: 'abc', wardCode: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual({
        phone: 'Số điện thoại không hợp lệ',
        email: 'Email không hợp lệ',
        wardCode: 'Vui lòng chọn Phường/Xã',
      });
    }
  });

  it('an empty form reports every field', () => {
    const r = validateCheckout(EMPTY_CHECKOUT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['addressDetail', 'email', 'fullName', 'phone', 'provinceCode', 'wardCode']);
  });
});

describe('firstInvalidField', () => {
  it('follows the on-screen order of the form', () => {
    expect(firstInvalidField({ wardCode: 'x', phone: 'y' })).toBe('phone');
    expect(firstInvalidField({ addressDetail: 'x' })).toBe('addressDetail');
    expect(firstInvalidField({})).toBeNull();
  });
});

describe('mapOrderError', () => {
  it('maps 400 VALIDATION_ERROR fields onto the inputs', () => {
    const r = mapOrderError(new ApiError(400, 'VALIDATION_ERROR', 'Bad Request', { wardCode: 'Phường/Xã không hợp lệ', foo: 'x' }));
    expect(r.fieldErrors).toEqual({ wardCode: 'Phường/Xã không hợp lệ' });
    expect(r.message).toMatch(/kiểm tra lại/);
    expect(r.refreshCart).toBe(false);
  });

  it('a VALIDATION_ERROR on items points at the cart', () => {
    const r = mapOrderError(new ApiError(400, 'VALIDATION_ERROR', 'Bad Request', { items: 'Giỏ hàng trống' }));
    expect(r.fieldErrors).toEqual({});
    expect(r.message).toContain('Giỏ hàng trống');
    expect(r.refreshCart).toBe(true);
  });

  it('OUT_OF_STOCK names the product and asks to fix the cart', () => {
    const r = mapOrderError(new ApiError(409, 'OUT_OF_STOCK', '"Gạo lứt đỏ - 1kg" không đủ hàng'));
    expect(r.message).toContain('"Gạo lứt đỏ - 1kg" không đủ hàng');
    expect(r.message).toMatch(/giỏ hàng/i);
    expect(r.refreshCart).toBe(true);
  });

  it('VARIANT_UNAVAILABLE and VARIANT_NOT_FOUND ask to remove the item', () => {
    const a = mapOrderError(new ApiError(409, 'VARIANT_UNAVAILABLE', '"Mè rang - 200g" hiện không còn bán'));
    expect(a.message).toContain('Mè rang');
    expect(a.refreshCart).toBe(true);
    const b = mapOrderError(new ApiError(404, 'VARIANT_NOT_FOUND', 'Sản phẩm không tồn tại'));
    expect(b.message).toMatch(/không còn bán/);
    expect(b.refreshCart).toBe(true);
  });

  it('429 and other 4xx say the order was NOT created (safe to retry)', () => {
    const r = mapOrderError(new ApiError(429, 'TOO_MANY_REQUESTS', 'ThrottlerException'));
    expect(r.kind).toBe('retry');
    expect(r.message).toMatch(/chưa được tạo/);
    expect(r.message).toMatch(/ít phút/);
    expect(r.message).not.toMatch(/Chưa chắc/);
    const f = mapOrderError(new ApiError(403, 'FORBIDDEN', 'Forbidden'));
    expect(f.kind).toBe('retry');
    expect(f.message).toMatch(/chưa được tạo/);
    expect(f.message).not.toMatch(/Chưa chắc/);
  });

  it('5xx never claims the order was not received and warns before retrying', () => {
    for (const status of [500, 502, 504]) {
      const s = mapOrderError(new ApiError(status, 'INTERNAL', '{"statusCode":500}'));
      expect(s.kind).toBe('uncertain');
      expect(s.message).not.toContain('{');
      expect(s.message).not.toMatch(/chưa nhận được đơn|chưa được tạo/);
      expect(s.message).toMatch(/Chưa chắc đơn đã được gửi/);
      expect(s.message).toMatch(/nhắn shop hoặc tra cứu đơn trước khi đặt lại/);
      expect(s.message).toMatch(/giỏ hàng vẫn được giữ/i);
    }
  });

  it('network failure and timeout are uncertain too, and keep the cart', () => {
    const n = mapOrderError(new TypeError('Failed to fetch'));
    expect(n.kind).toBe('uncertain');
    expect(n.message).toMatch(/kết nối/);
    expect(n.message).toMatch(/Chưa chắc đơn đã được gửi/);
    expect(n.message).toMatch(/giỏ hàng vẫn được giữ/i);
    const t = mapOrderError(new DOMException('timeout', 'AbortError'));
    expect(t.kind).toBe('uncertain');
    expect(t.message).toMatch(/Chưa chắc đơn đã được gửi/);
  });

  it('only cart problems are of kind "cart"', () => {
    expect(mapOrderError(new ApiError(409, 'OUT_OF_STOCK', 'x')).kind).toBe('cart');
    expect(mapOrderError(new ApiError(404, 'VARIANT_NOT_FOUND', 'x')).kind).toBe('cart');
    expect(mapOrderError(new ApiError(400, 'VALIDATION_ERROR', 'x', { phone: 'Số điện thoại không hợp lệ' })).kind).toBe('fields');
    expect(mapOrderError(new TypeError('x')).kind).not.toBe('cart');
  });

  it('never shows a raw JSON-looking server message', () => {
    const r = mapOrderError(new ApiError(409, 'OUT_OF_STOCK', '{"error":"OUT_OF_STOCK"}'));
    expect(r.message).not.toContain('{');
  });
});
