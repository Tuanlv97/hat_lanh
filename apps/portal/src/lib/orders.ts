import { normalizePhone, RETURN_REASONS, type ModerationStatus, type ReturnReason } from '@hatlanh/shared';
import { ApiError } from './api';

/** Order shapes as returned by `GET /me/orders` and `GET /orders/lookup` (`apps/api/src/orders/orders.service.ts`). */
export type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPriceVnd: number;
  quantity: number;
};

export type CustomerOrder = {
  id: string;
  code: string;
  status: string;
  totalVnd: number;
  createdAt: string;
  completedAt: string | null;
  items: OrderItem[];
};

/** `GET /products/:id/reviews` row; `mine` marks the signed-in viewer's own review. */
export type ProductReview = {
  id: string;
  rating: number;
  content: string;
  status: ModerationStatus;
  createdAt: string;
  authorName: string;
  mine?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? 'Đang xử lý';
}

/** "Gạo lứt 1kg × 2 và 2 sản phẩm khác" for the orders list. */
export function itemSummary(order: Pick<CustomerOrder, 'items'>): string {
  const [first, ...rest] = order.items;
  if (!first) return '';
  const head = `${first.productName} ${first.variantLabel} × ${first.quantity}`;
  return rest.length > 0 ? `${head} và ${rest.length} sản phẩm khác` : head;
}

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  DAMAGED: 'Hàng bị hỏng hoặc vỡ',
  WRONG_ITEM: 'Giao sai sản phẩm',
  CHANGED_MIND: 'Đổi ý, không dùng nữa',
  OTHER: 'Lý do khác',
};
export { RETURN_REASONS };

export const RETURN_NOTE_MAX = 500;
export const REVIEW_CONTENT_MAX = 1000;
export const RETURN_SENT = 'Đã gửi yêu cầu hoàn trả. Shop sẽ liên hệ với bạn.';

const OFFLINE = 'Không kết nối được tới cửa hàng. Bạn kiểm tra mạng rồi thử lại nhé.';
const TOO_FAST = 'Bạn gửi hơi nhanh, vui lòng đợi một chút rồi thử lại.';
const SERVER = 'Cửa hàng đang gặp sự cố. Bạn thử lại sau ít phút nhé.';

/* ---------- returns ---------- */

/** One order line in the return form. `quantity` is the raw input; `max` is what can still be returned. */
export type ReturnLineDraft = {
  orderItemId: string;
  selected: boolean;
  quantity: string;
  reason: ReturnReason | '';
  max: number;
};

export type ReturnBody = { items: { orderItemId: string; quantity: number; reason: ReturnReason }[]; note?: string };

/** Errors keyed `items`, `note`, `qty-<orderItemId>`, `reason-<orderItemId>`. */
export function validateReturn(
  lines: ReturnLineDraft[],
  note: string,
): { ok: true; data: ReturnBody } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const items: ReturnBody['items'] = [];
  const chosen = lines.filter((l) => l.selected);
  if (chosen.length === 0) errors.items = 'Chọn ít nhất 1 sản phẩm cần hoàn trả';
  for (const l of chosen) {
    const q = Number(l.quantity);
    if (l.max <= 0) errors[`qty-${l.orderItemId}`] = 'Sản phẩm này không còn số lượng để hoàn trả';
    else if (!/^\d+$/.test(l.quantity.trim()) || q < 1) errors[`qty-${l.orderItemId}`] = `Số lượng từ 1 đến ${l.max}`;
    else if (q > l.max) errors[`qty-${l.orderItemId}`] = `Tối đa ${l.max}`;
    if (!l.reason) errors[`reason-${l.orderItemId}`] = 'Vui lòng chọn lý do';
    if (l.reason && /^\d+$/.test(l.quantity.trim()) && q >= 1 && q <= l.max) {
      items.push({ orderItemId: l.orderItemId, quantity: q, reason: l.reason });
    }
  }
  const trimmed = note.trim();
  if (trimmed.length > RETURN_NOTE_MAX) errors.note = `Ghi chú tối đa ${RETURN_NOTE_MAX} ký tự`;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: trimmed ? { items, note: trimmed } : { items } };
}

export type ReturnErrorView = { message: string; cap?: { orderItemId: string; remaining: number } };

export function mapReturnError(err: unknown): ReturnErrorView {
  if (!(err instanceof ApiError)) return { message: OFFLINE };
  if (err.error === 'RETURN_QUANTITY_EXCEEDED') {
    const id = err.details?.orderItemId;
    const remaining = err.details?.remaining;
    const view: ReturnErrorView = {
      message: 'Số lượng hoàn trả vượt quá số còn có thể hoàn. Đã chỉnh lại số tối đa bên dưới, bạn xem lại rồi gửi nhé.',
    };
    if (typeof id === 'string' && typeof remaining === 'number') view.cap = { orderItemId: id, remaining };
    return view;
  }
  if (err.error === 'ORDER_NOT_COMPLETED') return { message: 'Chỉ hoàn trả được đơn đã hoàn thành.' };
  if (err.status === 404) return { message: 'Không tìm thấy đơn hàng này trong tài khoản của bạn.' };
  if (err.status === 429) return { message: TOO_FAST };
  if (err.status >= 500) return { message: SERVER };
  return { message: 'Yêu cầu chưa được gửi. Bạn kiểm tra lại các sản phẩm đã chọn rồi thử lại nhé.' };
}

/* ---------- reviews ---------- */

export type ReviewValues = { rating: number; content: string };

export function validateReview(
  v: ReviewValues,
): { ok: true; data: ReviewValues } | { ok: false; errors: Partial<Record<'rating' | 'content', string>> } {
  const errors: Partial<Record<'rating' | 'content', string>> = {};
  if (!Number.isInteger(v.rating) || v.rating < 1 || v.rating > 5) errors.rating = 'Vui lòng chọn số sao';
  const content = v.content.trim();
  if (!content) errors.content = 'Vui lòng nhập nội dung đánh giá';
  else if (content.length > REVIEW_CONTENT_MAX) errors.content = `Nội dung tối đa ${REVIEW_CONTENT_MAX} ký tự`;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { rating: v.rating, content } };
}

/** What the customer sees after posting. Never says why a review is held back. */
export function reviewResultMessage(status: string): string {
  return status === 'VISIBLE' ? 'Cảm ơn bạn đã đánh giá' : 'Đánh giá của bạn đang chờ duyệt';
}

export type ReviewErrorView = { message: string; alreadyReviewed: boolean; fieldErrors: Partial<Record<'rating' | 'content', string>> };

export function mapReviewError(err: unknown): ReviewErrorView {
  const view = (message: string): ReviewErrorView => ({ message, alreadyReviewed: false, fieldErrors: {} });
  if (!(err instanceof ApiError)) return view(OFFLINE);
  if (err.error === 'ALREADY_REVIEWED') return { message: 'Bạn đã đánh giá sản phẩm này', alreadyReviewed: true, fieldErrors: {} };
  if (err.error === 'NOT_PURCHASED') return view('Bạn chỉ đánh giá được sản phẩm đã mua trong đơn đã hoàn thành.');
  if (err.status === 400 && err.error === 'VALIDATION_ERROR') {
    const out = view('Vui lòng kiểm tra lại đánh giá.');
    for (const k of ['rating', 'content'] as const) if (typeof err.fields?.[k] === 'string') out.fieldErrors[k] = err.fields[k];
    return out;
  }
  if (err.status === 404) return view('Sản phẩm này không còn trên cửa hàng.');
  if (err.status === 429) return view(TOO_FAST);
  if (err.status >= 500) return view(SERVER);
  return view('Đánh giá chưa được gửi. Bạn tải lại trang rồi thử lại nhé.');
}

/* ---------- guest lookup ---------- */

export const LOOKUP_NOT_FOUND =
  'Không tìm thấy đơn hàng khớp với mã và số điện thoại này. Bạn kiểm tra lại mã đơn và số điện thoại đã dùng khi đặt hàng nhé.';

export type LookupValues = { code: string; phone: string };

export function validateLookup(
  v: LookupValues,
): { ok: true; data: LookupValues } | { ok: false; errors: Partial<Record<keyof LookupValues, string>> } {
  const errors: Partial<Record<keyof LookupValues, string>> = {};
  const code = v.code.trim().toUpperCase();
  if (!code) errors.code = 'Vui lòng nhập mã đơn';
  else if (code.length > 20) errors.code = 'Mã đơn không hợp lệ';
  const phoneRaw = v.phone.trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (!phoneRaw) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!phone) errors.phone = 'Số điện thoại không hợp lệ';
  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  return { ok: true, data: { code, phone } };
}

/** Unknown code and wrong phone read the same, so the page never reveals whether a code exists. */
export function mapLookupError(err: unknown): string {
  if (!(err instanceof ApiError)) return OFFLINE;
  if (err.status === 404 || err.status === 400) return LOOKUP_NOT_FOUND;
  if (err.status === 429) return 'Bạn tra cứu hơi nhiều lần. Vui lòng đợi khoảng một phút rồi thử lại.';
  return SERVER;
}
