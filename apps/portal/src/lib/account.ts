import { checkoutFormSchema, normalizePhone } from '@hatlanh/shared';
import { ApiError } from './api';

/** Same limits as the API (`apps/api/src/auth/auth.service.ts`): bcrypt only reads 72 bytes. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const NAME_MAX = 100;

export const REGISTER_FIELDS = ['name', 'email', 'phone', 'password'] as const;
export const LOGIN_FIELDS = ['identifier', 'password'] as const;
export const DEV_LOGIN_FIELDS = ['email', 'name'] as const;

export type RegisterField = (typeof REGISTER_FIELDS)[number];
export type LoginField = (typeof LOGIN_FIELDS)[number];
export type DevLoginField = (typeof DEV_LOGIN_FIELDS)[number];
export type Errors<F extends string> = Partial<Record<F, string>>;
type Result<T, F extends string> = { ok: true; data: T } | { ok: false; errors: Errors<F> };

export const LOGIN_INVALID = 'Email/số điện thoại hoặc mật khẩu chưa đúng';
export const LOGIN_TOO_MANY = 'Bạn thử quá nhiều lần, vui lòng đợi một chút';
export const DEV_LOGIN_EMAIL_TAKEN =
  'Email này đã được dùng cho tài khoản đăng ký bằng mật khẩu. Hãy đăng nhập bằng mật khẩu.';
export const FORGOT_PASSWORD_NOTE = 'Quên mật khẩu? Nhắn cho shop để được đặt lại';
const OFFLINE = 'Không kết nối được tới cửa hàng. Bạn kiểm tra mạng rồi thử lại nhé.';
const SERVER = 'Cửa hàng đang gặp sự cố. Bạn thử lại sau ít phút nhé.';
const CHECK_FIELDS = 'Vui lòng kiểm tra lại các ô được đánh dấu.';

// Name, phone and email reuse the checkout schema pieces from @hatlanh/shared (same rules and messages as the API).
const contactSchema = checkoutFormSchema.pick({ fullName: true, email: true, phone: true });
const devSchema = checkoutFormSchema.pick({ fullName: true, email: true });
type Issue = { path: (string | number)[]; message: string };

function passwordError(pw: string): string | undefined {
  if (pw.length < PASSWORD_MIN) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN} ký tự`;
  if (pw.length > PASSWORD_MAX) return `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`;
  return undefined;
}

/** Maps schema issues to our field names (`fullName` is shown as `name`), first message per field. */
function collect<F extends string>(fields: readonly F[], issues: Issue[]): Errors<F> {
  const out: Errors<F> = {};
  for (const issue of issues) {
    const raw = String(issue.path[0] ?? '');
    const key = (raw === 'fullName' ? 'name' : raw) as F;
    if (fields.includes(key) && !out[key]) out[key] = issue.message;
  }
  return out;
}

export type RegisterValues = Record<RegisterField, string>;
export type RegisterData = { name: string; email: string; phone: string; password: string };

export function validateRegister(values: RegisterValues): Result<RegisterData, RegisterField> {
  const r = contactSchema.safeParse({ fullName: values.name, email: values.email, phone: values.phone });
  const errors: Errors<RegisterField> = r.success ? {} : collect(REGISTER_FIELDS, r.error.issues);
  const pw = passwordError(values.password);
  if (pw) errors.password = pw;
  if (!r.success || pw) return { ok: false, errors };
  return { ok: true, data: { name: r.data.fullName, email: r.data.email, phone: r.data.phone, password: values.password } };
}

export type LoginValues = Record<LoginField, string>;

/** Accepts an email (kept as typed, trimmed) or a Vietnamese mobile number (normalized). */
export function validateLogin(values: LoginValues): Result<LoginValues, LoginField> {
  const errors: Errors<LoginField> = {};
  const id = values.identifier.trim();
  let identifier = id;
  if (!id) errors.identifier = 'Vui lòng nhập email hoặc số điện thoại';
  else if (id.includes('@')) {
    if (!devSchema.shape.email.safeParse(id).success) errors.identifier = 'Email không hợp lệ';
  } else {
    const phone = normalizePhone(id);
    if (phone) identifier = phone;
    else errors.identifier = 'Nhập email hoặc số điện thoại di động (ví dụ 0912 345 678)';
  }
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { identifier, password: values.password } };
}

export type DevLoginValues = Record<DevLoginField, string>;

export function validateDevLogin(values: DevLoginValues): Result<DevLoginValues, DevLoginField> {
  const r = devSchema.safeParse({ fullName: values.name, email: values.email });
  if (r.success) return { ok: true, data: { email: r.data.email, name: r.data.fullName } };
  return { ok: false, errors: collect(DEV_LOGIN_FIELDS, r.error.issues) };
}

export function firstInvalid<F extends string>(order: readonly F[], errors: Errors<F>): F | null {
  return order.find((f) => errors[f]) ?? null;
}

export type AuthContext = 'login' | 'register' | 'dev';
export type AuthErrorView = { message: string; fieldErrors: Record<string, string> };

const KNOWN_FIELDS: Record<AuthContext, readonly string[]> = {
  login: LOGIN_FIELDS,
  register: REGISTER_FIELDS,
  dev: DEV_LOGIN_FIELDS,
};

/** Turns a failed auth call into Vietnamese. Login failures never say which part was wrong. */
export function mapAuthError(err: unknown, ctx: AuthContext): AuthErrorView {
  if (!(err instanceof ApiError)) return { message: OFFLINE, fieldErrors: {} };
  if (err.status === 429) return { message: LOGIN_TOO_MANY, fieldErrors: {} };
  if (ctx === 'login' && err.status === 401) return { message: LOGIN_INVALID, fieldErrors: {} };
  if (ctx === 'register' && err.error === 'EMAIL_TAKEN') {
    return { message: CHECK_FIELDS, fieldErrors: { email: 'Email này đã có tài khoản. Bạn đăng nhập, hoặc dùng email khác.' } };
  }
  if (ctx === 'register' && err.error === 'PHONE_TAKEN') {
    return { message: CHECK_FIELDS, fieldErrors: { phone: 'Số điện thoại này đã có tài khoản. Bạn đăng nhập, hoặc dùng số khác.' } };
  }
  if (ctx === 'dev' && err.error === 'EMAIL_TAKEN') return { message: DEV_LOGIN_EMAIL_TAKEN, fieldErrors: {} };
  if (ctx === 'dev' && err.status === 404) return { message: 'Máy chủ đang tắt chế độ đăng nhập thử.', fieldErrors: {} };
  if (err.status === 400 && err.error === 'VALIDATION_ERROR') {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(err.fields ?? {})) {
      if (KNOWN_FIELDS[ctx].includes(k) && typeof v === 'string') fieldErrors[k] = v;
    }
    return { message: CHECK_FIELDS, fieldErrors };
  }
  if (err.status >= 500) return { message: SERVER, fieldErrors: {} };
  return { message: 'Chưa thực hiện được. Bạn tải lại trang rồi thử lại nhé.', fieldErrors: {} };
}

/** `NEXT_PUBLIC_OAUTH_MODE=dev` shows the fake Google/Facebook sign-in; anything else shows "Sắp có". */
export function oauthDevMode(): boolean {
  return process.env.NEXT_PUBLIC_OAUTH_MODE === 'dev';
}
