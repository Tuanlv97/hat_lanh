import { z } from 'zod';
import { normalizePhone } from './phone';

export const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
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
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  provinceCode: z.string().min(1, 'Vui lòng chọn Tỉnh/Thành'),
  wardCode: z.string().min(1, 'Vui lòng chọn Phường/Xã'),
  addressDetail: z.string().trim().min(1, 'Vui lòng nhập địa chỉ chi tiết'),
});

export type CheckoutForm = z.output<typeof checkoutFormSchema>;
