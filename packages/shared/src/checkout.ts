import { z } from 'zod';
import { normalizePhone } from './phone';

/** Max lengths (after trim) of the checkout text fields. */
export const CHECKOUT_LIMITS = { fullName: 100, email: 254, addressDetail: 300, code: 10 } as const;

export const checkoutFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập họ tên')
    .max(CHECKOUT_LIMITS.fullName, `Họ tên tối đa ${CHECKOUT_LIMITS.fullName} ký tự`),
  phone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại')
    .transform((v, ctx) => {
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Số điện thoại không hợp lệ' });
        return z.NEVER;
      }
      return n;
    }),
  email: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email')
    .max(CHECKOUT_LIMITS.email, `Email tối đa ${CHECKOUT_LIMITS.email} ký tự`)
    .email('Email không hợp lệ'),
  provinceCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn Tỉnh/Thành')
    .max(CHECKOUT_LIMITS.code, 'Tỉnh/Thành không hợp lệ'),
  wardCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn Phường/Xã')
    .max(CHECKOUT_LIMITS.code, 'Phường/Xã không hợp lệ'),
  addressDetail: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ chi tiết')
    .max(CHECKOUT_LIMITS.addressDetail, `Địa chỉ chi tiết tối đa ${CHECKOUT_LIMITS.addressDetail} ký tự`),
});

export type CheckoutForm = z.output<typeof checkoutFormSchema>;
