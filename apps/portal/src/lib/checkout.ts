import { checkoutFormSchema, type CheckoutForm } from '@hatlanh/shared';
import { ApiError } from './api';

/** Form fields in on-screen order (used to focus the first invalid one). */
export const CHECKOUT_FIELDS = ['fullName', 'phone', 'email', 'provinceCode', 'wardCode', 'addressDetail'] as const;
export type CheckoutField = (typeof CHECKOUT_FIELDS)[number];
export type CheckoutValues = Record<CheckoutField, string>;
export type FieldErrors = Partial<Record<CheckoutField, string>>;

export const EMPTY_CHECKOUT: CheckoutValues = {
  fullName: '',
  phone: '',
  email: '',
  provinceCode: '',
  wardCode: '',
  addressDetail: '',
};

export const PAYMENT_NOTE = 'Bạn sẽ không thanh toán trên website. Shop sẽ nhắn lại để xác nhận đơn và cách thanh toán.';

const isField = (k: string): k is CheckoutField => (CHECKOUT_FIELDS as readonly string[]).includes(k);

/** Validates with the shared schema: trimmed values and a normalized phone, or the first Vietnamese message per field. */
export function validateCheckout(values: CheckoutValues): { ok: true; data: CheckoutForm } | { ok: false; errors: FieldErrors } {
  const r = checkoutFormSchema.safeParse(values);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (isField(key) && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

export function firstInvalidField(errors: FieldErrors): CheckoutField | null {
  return CHECKOUT_FIELDS.find((f) => errors[f]) ?? null;
}

/**
 * - `fields`: the server rejected some inputs (no order created).
 * - `cart`: a cart line is out of stock / no longer sold (no order created); the UI links to the cart.
 * - `retry`: rejected before anything was saved (429, other 4xx); safe to try again.
 * - `uncertain`: network drop, timeout or 5xx: the order MAY have been saved, so warn before retrying.
 */
export type OrderErrorKind = 'fields' | 'cart' | 'retry' | 'uncertain';

export type OrderErrorView = {
  kind: OrderErrorKind;
  /** Shown in the alert above the submit button. */
  message: string;
  /** Server-side field errors to show under the matching inputs. */
  fieldErrors: FieldErrors;
  /** True when the cart needs a fresh stock check (and probably an edit). */
  refreshCart: boolean;
};

const KEEP_CART = 'Giỏ hàng vẫn được giữ nguyên.';
/** For failures where the server may already have saved the order (no idempotency key yet). */
const UNSURE =
  'Chưa chắc đơn đã được gửi. Nếu không chắc, bạn hãy nhắn shop hoặc tra cứu đơn trước khi đặt lại để tránh đặt trùng.';

/** A server message that is safe to show: short, plain text (never JSON). */
function plain(message: string | undefined): string | null {
  if (!message) return null;
  const m = message.trim();
  if (!m || m.length > 200 || /[{}[\]<>]/.test(m)) return null;
  return m;
}

/** Turns a failed POST /orders into Vietnamese the customer can act on. Never exposes raw error bodies. */
export function mapOrderError(err: unknown): OrderErrorView {
  if (err instanceof ApiError) {
    if (err.status === 400 && err.error === 'VALIDATION_ERROR') {
      const fieldErrors: FieldErrors = {};
      for (const [k, v] of Object.entries(err.fields ?? {})) if (isField(k) && typeof v === 'string') fieldErrors[k] = v;
      const items = plain(err.fields?.items);
      if (items && Object.keys(fieldErrors).length === 0) {
        return { kind: 'cart', message: `${items}. Bạn xem lại giỏ hàng rồi đặt lại nhé.`, fieldErrors, refreshCart: true };
      }
      return { kind: 'fields', message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors, refreshCart: false };
    }
    if (err.error === 'OUT_OF_STOCK') {
      const what = plain(err.message) ?? 'Một sản phẩm trong giỏ không còn đủ hàng';
      return {
        kind: 'cart',
        message: `${what}. Số lượng còn lại đã được cập nhật bên dưới; bạn chỉnh giỏ hàng rồi đặt lại nhé.`,
        fieldErrors: {},
        refreshCart: true,
      };
    }
    if (err.error === 'VARIANT_UNAVAILABLE' || err.error === 'VARIANT_NOT_FOUND') {
      const what = err.error === 'VARIANT_UNAVAILABLE' ? plain(err.message) : null;
      return {
        kind: 'cart',
        message: `${what ?? 'Một sản phẩm trong giỏ không còn bán'}. Bạn xóa sản phẩm đó khỏi giỏ hàng rồi đặt lại nhé.`,
        fieldErrors: {},
        refreshCart: true,
      };
    }
    if (err.status === 429) {
      return { kind: 'retry', message: `Bạn đặt hơi nhanh nên đơn chưa được tạo. Vui lòng thử lại sau ít phút. ${KEEP_CART}`, fieldErrors: {}, refreshCart: false };
    }
    if (err.status >= 400 && err.status < 500) {
      return { kind: 'retry', message: `Đơn chưa được tạo. Bạn tải lại trang rồi thử lại nhé. ${KEEP_CART}`, fieldErrors: {}, refreshCart: false };
    }
    // 5xx (including a proxy 502/504): the order may have been saved before the failure.
    return { kind: 'uncertain', message: `Cửa hàng đang gặp sự cố khi xử lý đơn. ${UNSURE} ${KEEP_CART}`, fieldErrors: {}, refreshCart: false };
  }
  if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return { kind: 'uncertain', message: `Cửa hàng phản hồi quá lâu. ${UNSURE} ${KEEP_CART}`, fieldErrors: {}, refreshCart: false };
  }
  // Connection dropped: the request may have reached the server.
  return { kind: 'uncertain', message: `Mất kết nối tới cửa hàng. ${UNSURE} ${KEEP_CART}`, fieldErrors: {}, refreshCart: false };
}
