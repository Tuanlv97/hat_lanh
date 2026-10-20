import { describe, expect, it } from 'vitest';
import { ApiError } from '../api';
import {
  itemSummary,
  LOOKUP_NOT_FOUND,
  mapLookupError,
  mapReturnError,
  mapReviewError,
  orderStatusLabel,
  reviewResultMessage,
  validateLookup,
  validateReturn,
  validateReview,
  type ReturnLineDraft,
} from '../orders';

describe('orderStatusLabel', () => {
  it.each([
    ['PENDING', 'Chờ xác nhận'],
    ['CONFIRMED', 'Đã xác nhận'],
    ['SHIPPING', 'Đang giao'],
    ['COMPLETED', 'Hoàn thành'],
    ['CANCELLED', 'Đã hủy'],
  ])('%s -> %s', (s, label) => {
    expect(orderStatusLabel(s)).toBe(label);
  });
  it('falls back for an unknown status', () => {
    expect(orderStatusLabel('WHATEVER')).toBe('Đang xử lý');
  });
});

const line = (patch: Partial<ReturnLineDraft> = {}): ReturnLineDraft => ({
  orderItemId: 'oi1',
  selected: true,
  quantity: '1',
  reason: 'DAMAGED',
  max: 2,
  ...patch,
});

describe('validateReturn', () => {
  it('builds the API body from selected lines only', () => {
    const r = validateReturn([line(), line({ orderItemId: 'oi2', selected: false })], '  vỡ hộp  ');
    expect(r).toEqual({ ok: true, data: { items: [{ orderItemId: 'oi1', quantity: 1, reason: 'DAMAGED' }], note: 'vỡ hộp' } });
  });

  it('omits an empty note', () => {
    const r = validateReturn([line()], '   ');
    expect(r.ok && r.data).toEqual({ items: [{ orderItemId: 'oi1', quantity: 1, reason: 'DAMAGED' }] });
  });

  it('needs at least one selected line', () => {
    expect(validateReturn([line({ selected: false })], '')).toEqual({ ok: false, errors: { items: 'Chọn ít nhất 1 sản phẩm cần hoàn trả' } });
  });

  it('caps quantity between 1 and the returnable amount, and needs a reason', () => {
    const r = validateReturn([line({ quantity: '3' }), line({ orderItemId: 'oi2', quantity: '0', reason: '' })], '');
    expect(r).toEqual({
      ok: false,
      errors: {
        'qty-oi1': 'Tối đa 2',
        'qty-oi2': 'Số lượng từ 1 đến 2',
        'reason-oi2': 'Vui lòng chọn lý do',
      },
    });
    expect(validateReturn([line({ quantity: '1.5' })], '').ok).toBe(false);
  });

  it('a line with nothing left to return cannot be selected', () => {
    expect(validateReturn([line({ max: 0 })], '')).toEqual({ ok: false, errors: { 'qty-oi1': 'Sản phẩm này không còn số lượng để hoàn trả' } });
  });

  it('limits the note to 500 characters', () => {
    expect(validateReturn([line()], 'x'.repeat(501))).toEqual({ ok: false, errors: { note: 'Ghi chú tối đa 500 ký tự' } });
    expect(validateReturn([line()], 'x'.repeat(500)).ok).toBe(true);
  });
});

describe('mapReturnError', () => {
  it('RETURN_QUANTITY_EXCEEDED gives the new cap for that line', () => {
    const err = new ApiError(400, 'RETURN_QUANTITY_EXCEEDED', '"Gạo - 1kg" chỉ còn có thể hoàn tối đa 1', undefined, {
      orderItemId: 'oi1',
      remaining: 1,
    });
    expect(mapReturnError(err)).toEqual({
      message: 'Số lượng hoàn trả vượt quá số còn có thể hoàn. Đã chỉnh lại số tối đa bên dưới, bạn xem lại rồi gửi nhé.',
      cap: { orderItemId: 'oi1', remaining: 1 },
    });
  });

  it('ORDER_NOT_COMPLETED / ORDER_NOT_FOUND / 429 / network', () => {
    expect(mapReturnError(new ApiError(400, 'ORDER_NOT_COMPLETED', 'x')).message).toBe('Chỉ hoàn trả được đơn đã hoàn thành.');
    expect(mapReturnError(new ApiError(404, 'ORDER_NOT_FOUND', 'x')).message).toBe('Không tìm thấy đơn hàng này trong tài khoản của bạn.');
    expect(mapReturnError(new ApiError(429, 'X', 'x')).message).toBe('Bạn gửi hơi nhanh, vui lòng đợi một chút rồi thử lại.');
    expect(mapReturnError(new TypeError('x')).message).toBe('Không kết nối được tới cửa hàng. Bạn kiểm tra mạng rồi thử lại nhé.');
  });
});

describe('validateReview', () => {
  it('needs a rating 1-5 and content 1-1000 (trimmed)', () => {
    expect(validateReview({ rating: 0, content: '  ' })).toEqual({
      ok: false,
      errors: { rating: 'Vui lòng chọn số sao', content: 'Vui lòng nhập nội dung đánh giá' },
    });
    expect(validateReview({ rating: 6, content: 'x'.repeat(1001) })).toEqual({
      ok: false,
      errors: { rating: 'Vui lòng chọn số sao', content: 'Nội dung tối đa 1000 ký tự' },
    });
    expect(validateReview({ rating: 5, content: '  Ngon  ' })).toEqual({ ok: true, data: { rating: 5, content: 'Ngon' } });
  });
});

describe('reviewResultMessage', () => {
  it('never says why a review is held', () => {
    expect(reviewResultMessage('VISIBLE')).toBe('Cảm ơn bạn đã đánh giá');
    expect(reviewResultMessage('PENDING')).toBe('Đánh giá của bạn đang chờ duyệt');
    expect(reviewResultMessage('HIDDEN')).toBe('Đánh giá của bạn đang chờ duyệt');
  });
});

describe('mapReviewError', () => {
  it('409 ALREADY_REVIEWED marks the product as reviewed', () => {
    expect(mapReviewError(new ApiError(409, 'ALREADY_REVIEWED', 'x'))).toEqual({
      message: 'Bạn đã đánh giá sản phẩm này',
      alreadyReviewed: true,
      fieldErrors: {},
    });
  });
  it('403 NOT_PURCHASED, 400 fields, 429', () => {
    expect(mapReviewError(new ApiError(403, 'NOT_PURCHASED', 'x')).message).toBe(
      'Bạn chỉ đánh giá được sản phẩm đã mua trong đơn đã hoàn thành.',
    );
    expect(mapReviewError(new ApiError(400, 'VALIDATION_ERROR', 'x', { content: 'Nội dung tối đa 1000 ký tự' })).fieldErrors).toEqual({
      content: 'Nội dung tối đa 1000 ký tự',
    });
    expect(mapReviewError(new ApiError(429, 'X', 'x')).message).toBe('Bạn gửi hơi nhanh, vui lòng đợi một chút rồi thử lại.');
  });
});

describe('validateLookup / mapLookupError', () => {
  it('needs a code and a phone', () => {
    expect(validateLookup({ code: ' ', phone: '' })).toEqual({
      ok: false,
      errors: { code: 'Vui lòng nhập mã đơn', phone: 'Vui lòng nhập số điện thoại' },
    });
    expect(validateLookup({ code: ' hl12ab ', phone: '0912 345 678' })).toEqual({ ok: true, data: { code: 'HL12AB', phone: '0912345678' } });
  });

  it('an invalid phone reads like "not found" (no format hint that could probe codes)', () => {
    expect(validateLookup({ code: 'HL1', phone: '123' })).toEqual({ ok: false, errors: { phone: 'Số điện thoại không hợp lệ' } });
  });

  it('404 and 400 give the same message', () => {
    expect(mapLookupError(new ApiError(404, 'ORDER_NOT_FOUND', 'x'))).toBe(LOOKUP_NOT_FOUND);
    expect(mapLookupError(new ApiError(400, 'VALIDATION_ERROR', 'x'))).toBe(LOOKUP_NOT_FOUND);
    expect(LOOKUP_NOT_FOUND).toBe(
      'Không tìm thấy đơn hàng khớp với mã và số điện thoại này. Bạn kiểm tra lại mã đơn và số điện thoại đã dùng khi đặt hàng nhé.',
    );
  });

  it('429 and network failures', () => {
    expect(mapLookupError(new ApiError(429, 'X', 'x'))).toBe('Bạn tra cứu hơi nhiều lần. Vui lòng đợi khoảng một phút rồi thử lại.');
    expect(mapLookupError(new TypeError('x'))).toBe('Không kết nối được tới cửa hàng. Bạn kiểm tra mạng rồi thử lại nhé.');
  });
});

describe('itemSummary', () => {
  const it1 = { id: 'a', productId: 'p', variantId: 'v', productName: 'Gạo lứt', variantLabel: '1kg', unitPriceVnd: 1, quantity: 2 };
  it('names the first line and counts the rest', () => {
    expect(itemSummary({ items: [it1] })).toBe('Gạo lứt 1kg × 2');
    expect(itemSummary({ items: [it1, { ...it1, id: 'b' }, { ...it1, id: 'c' }] })).toBe('Gạo lứt 1kg × 2 và 2 sản phẩm khác');
    expect(itemSummary({ items: [] })).toBe('');
  });
});
