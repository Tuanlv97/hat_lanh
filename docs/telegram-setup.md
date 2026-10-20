# Thông báo Telegram cho chủ shop

Khi có **đơn mới** hoặc **yêu cầu hoàn trả mới**, API gọi `Notifier.notify(...)` (`apps/api/src/notifications/`). Hiện bản dùng là `ConsoleNotifier`: chỉ in dòng `[NOTIFY] {...}` ra terminal đang chạy API, chưa gửi đi đâu. Chủ shop chọn Telegram (Zalo cá nhân không có cách gửi tự động chính thức).

## Bước 1 — Tạo bot (chủ shop làm trên điện thoại)

1. Mở Telegram, tìm **@BotFather**, bấm Start.
2. Gửi `/newbot`, đặt tên hiển thị và tên đăng nhập (phải kết thúc bằng `bot`).
3. BotFather trả về **token** dạng `123456:ABC-...`. Giữ bí mật, không gửi cho ai ngoài người cài đặt.
4. Mở bot vừa tạo, bấm Start và gửi một tin bất kỳ (để bot được phép nhắn lại cho bạn).

## Bước 2 — Lấy chat id

Mở trình duyệt: `https://api.telegram.org/bot<TOKEN>/getUpdates` (thay `<TOKEN>`). Tìm `"chat":{"id": ...}`, số đó là **chat id**.

## Bước 3 — Điền vào `.env`

```
TELEGRAM_BOT_TOKEN=<token>
TELEGRAM_CHAT_ID=<chat id>
```

Hai biến này chưa có trong `.env.example` và `config/env.ts`; người lập trình thêm khi làm bước 4.

## Bước 4 — Đổi `ConsoleNotifier` (người lập trình)

1. Tạo `apps/api/src/notifications/telegram.notifier.ts` implement `Notifier`: gọi `POST https://api.telegram.org/bot<TOKEN>/sendMessage` với `{ chat_id, text }`, có timeout ngắn, soạn nội dung tiếng Việt dễ đọc từ `NotificationEvent` (`ORDER_CREATED`, `RETURN_REQUESTED`).
2. Trong `apps/api/src/notifications/notifications.module.ts` đổi `useClass: ConsoleNotifier` thành `useClass: TelegramNotifier`. Không cần sửa chỗ nào khác.
3. Lỗi gửi tin không được làm hỏng việc đặt đơn.
