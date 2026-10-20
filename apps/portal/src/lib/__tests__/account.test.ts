import { describe, expect, it } from 'vitest';
import { ApiError } from '../api';
import {
  DEV_LOGIN_EMAIL_TAKEN,
  firstInvalid,
  LOGIN_INVALID,
  LOGIN_TOO_MANY,
  mapAuthError,
  REGISTER_FIELDS,
  validateDevLogin,
  validateLogin,
  validateRegister,
} from '../account';

const good = { name: '  Nguyễn Thị Lành ', email: ' lanh@example.com ', phone: '0912 345 678', password: 'hatlanh123' };

describe('validateRegister', () => {
  it('accepts a good form, trims, lowercases nothing but normalizes the phone', () => {
    const r = validateRegister(good);
    expect(r).toEqual({
      ok: true,
      data: { name: 'Nguyễn Thị Lành', email: 'lanh@example.com', phone: '0912345678', password: 'hatlanh123' },
    });
  });

  it('accepts +84 numbers (shared normalizePhone)', () => {
    const r = validateRegister({ ...good, phone: '+84 912 345 678' });
    expect(r.ok && r.data.phone).toBe('0912345678');
  });

  it('gives a Vietnamese message per invalid field', () => {
    const r = validateRegister({ name: ' ', email: 'abc', phone: '12345', password: 'short' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual({
        name: 'Vui lòng nhập họ tên',
        email: 'Email không hợp lệ',
        phone: 'Số điện thoại không hợp lệ',
        password: 'Mật khẩu phải có ít nhất 8 ký tự',
      });
      expect(firstInvalid(REGISTER_FIELDS, r.errors)).toBe('name');
    }
  });

  it('requires email and phone', () => {
    const r = validateRegister({ ...good, email: '', phone: '' });
    expect(!r.ok && r.errors).toEqual({ email: 'Vui lòng nhập email', phone: 'Vui lòng nhập số điện thoại' });
  });

  it('caps the password at 72 characters (bcrypt limit) and accepts exactly 8 and 72', () => {
    expect(validateRegister({ ...good, password: 'x'.repeat(73) })).toEqual({ ok: false, errors: { password: 'Mật khẩu tối đa 72 ký tự' } });
    expect(validateRegister({ ...good, password: 'x'.repeat(72) }).ok).toBe(true);
    expect(validateRegister({ ...good, password: '12345678' }).ok).toBe(true);
  });

  it('keeps spaces inside the password as typed', () => {
    const r = validateRegister({ ...good, password: ' mat khau ' });
    expect(r.ok && r.data.password).toBe(' mat khau ');
  });
});

describe('validateLogin', () => {
  it('accepts an email or a phone', () => {
    expect(validateLogin({ identifier: ' lanh@example.com ', password: 'x' })).toEqual({
      ok: true,
      data: { identifier: 'lanh@example.com', password: 'x' },
    });
    expect(validateLogin({ identifier: '0912 345 678', password: 'x' })).toEqual({
      ok: true,
      data: { identifier: '0912345678', password: 'x' },
    });
  });

  it('requires both fields', () => {
    expect(validateLogin({ identifier: '', password: '' })).toEqual({
      ok: false,
      errors: { identifier: 'Vui lòng nhập email hoặc số điện thoại', password: 'Vui lòng nhập mật khẩu' },
    });
  });

  it('rejects something that is neither an email nor a phone', () => {
    expect(validateLogin({ identifier: 'lanh', password: 'x' })).toEqual({
      ok: false,
      errors: { identifier: 'Nhập email hoặc số điện thoại di động (ví dụ 0912 345 678)' },
    });
    expect(validateLogin({ identifier: 'a@b', password: 'x' }).ok).toBe(false);
  });
});

describe('validateDevLogin', () => {
  it('needs a valid email and a name', () => {
    expect(validateDevLogin({ email: 'x', name: '' })).toEqual({
      ok: false,
      errors: { email: 'Email không hợp lệ', name: 'Vui lòng nhập họ tên' },
    });
    expect(validateDevLogin({ email: ' a@b.vn ', name: ' An ' })).toEqual({ ok: true, data: { email: 'a@b.vn', name: 'An' } });
  });
});

describe('mapAuthError', () => {
  it('login 401 is one message whatever the cause', () => {
    const m = mapAuthError(new ApiError(401, 'INVALID_CREDENTIALS', 'Email/số điện thoại hoặc mật khẩu không đúng'), 'login');
    expect(m).toEqual({ message: LOGIN_INVALID, fieldErrors: {} });
    expect(LOGIN_INVALID).toBe('Email/số điện thoại hoặc mật khẩu chưa đúng');
  });

  it('429 asks to wait', () => {
    for (const ctx of ['login', 'register', 'dev'] as const) {
      expect(mapAuthError(new ApiError(429, 'TOO_MANY_REQUESTS', 'x'), ctx).message).toBe(LOGIN_TOO_MANY);
    }
    expect(LOGIN_TOO_MANY).toBe('Bạn thử quá nhiều lần, vui lòng đợi một chút');
  });

  it('register 409 EMAIL_TAKEN / PHONE_TAKEN become field messages', () => {
    const e = mapAuthError(new ApiError(409, 'EMAIL_TAKEN', 'x'), 'register');
    expect(e.fieldErrors).toEqual({ email: 'Email này đã có tài khoản. Bạn đăng nhập, hoặc dùng email khác.' });
    expect(e.message).toBe('Vui lòng kiểm tra lại các ô được đánh dấu.');
    const p = mapAuthError(new ApiError(409, 'PHONE_TAKEN', 'x'), 'register');
    expect(p.fieldErrors).toEqual({ phone: 'Số điện thoại này đã có tài khoản. Bạn đăng nhập, hoặc dùng số khác.' });
  });

  it('server field errors are kept only for known fields', () => {
    const e = mapAuthError(
      new ApiError(400, 'VALIDATION_ERROR', 'x', { phone: 'Số điện thoại không hợp lệ', role: 'x' }),
      'register',
    );
    expect(e.fieldErrors).toEqual({ phone: 'Số điện thoại không hợp lệ' });
  });

  it('dev-login 409 EMAIL_TAKEN explains to use the password', () => {
    const e = mapAuthError(new ApiError(409, 'EMAIL_TAKEN', 'x'), 'dev');
    expect(e.message).toBe(DEV_LOGIN_EMAIL_TAKEN);
    expect(DEV_LOGIN_EMAIL_TAKEN).toBe('Email này đã được dùng cho tài khoản đăng ký bằng mật khẩu. Hãy đăng nhập bằng mật khẩu.');
  });

  it('dev-login 404 means the dev mode is off on the server', () => {
    expect(mapAuthError(new ApiError(404, 'NOT_FOUND', 'x'), 'dev').message).toBe('Máy chủ đang tắt chế độ đăng nhập thử.');
  });

  it('network failures and 5xx never show raw bodies', () => {
    expect(mapAuthError(new TypeError('Failed to fetch'), 'login').message).toBe(
      'Không kết nối được tới cửa hàng. Bạn kiểm tra mạng rồi thử lại nhé.',
    );
    expect(mapAuthError(new ApiError(500, 'ERROR', '{"stack":1}'), 'register').message).toBe(
      'Cửa hàng đang gặp sự cố. Bạn thử lại sau ít phút nhé.',
    );
  });
});
