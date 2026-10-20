# Thanh toán online VietQR — ghi chú

Hiện website **chưa có thanh toán online**. Module `payments` (`apps/api/src/payments/payments.module.ts`) được để trống, kèm comment `TODO(VietQR)` ghi lại các lưu ý dưới đây.

## Bốn lưu ý

1. **Cần liên kết VietQR / ngân hàng.** Hiện shop chưa có liên kết này — đây là lý do thanh toán online chưa được làm.
2. **Cần cơ chế đối soát thanh toán** (webhook từ ngân hàng/đơn vị thanh toán, hoặc kiểm tra giao dịch định kỳ) để biết khách đã thực sự trả tiền, và khớp khoản chuyển với mã đơn.
3. **Khi nhận được thanh toán thì phải chuyển trạng thái đơn tương ứng** (ví dụ sang "đã xác nhận"), dùng cùng cách chuyển trạng thái an toàn mà admin đang dùng (`PATCH /admin/orders/:id/status`).
4. **Luồng hiện tại phải vẫn dùng được song song:** chủ shop nhắn tin cho khách để xác nhận đơn và hình thức thanh toán.

## Luồng hiện tại

Khách đặt đơn (trạng thái `PENDING`), chủ shop nhận thông báo (hiện in ra terminal của API, xem `docs/telegram-setup.md`), tự nhắn khách xác nhận đơn và cách thanh toán, rồi cập nhật trạng thái trong trang admin. Hệ thống không gửi email hay SMS cho khách. Phí vận chuyển không tính trên website, chủ shop báo riêng.
