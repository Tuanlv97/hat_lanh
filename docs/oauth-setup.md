# Đăng nhập Google / Facebook

## Hiện tại: đăng nhập giả lập (chỉ để dev)

API có `POST /auth/dev-login` nhận `{ provider: "google" | "facebook", email, name }` và tạo/đăng nhập tài khoản, không qua Google/Facebook thật. Endpoint này **chỉ bật khi `OAUTH_MODE=dev`** trong `.env`. Nếu không đặt biến này (hoặc đặt `live`) thì endpoint trả 404.

- Máy local: `.env.example` đã có `OAUTH_MODE=dev`.
- Portal: `NEXT_PUBLIC_OAUTH_MODE=dev` làm nút Google/Facebook ở trang đăng nhập mở form "Đăng nhập thử (chế độ phát triển)" gọi endpoint này; không đặt thì nút hiện "Sắp có" và bị vô hiệu. Biến này gắn vào lúc build portal.
- **Production: phải tắt** cả hai (`OAUTH_MODE` và `NEXT_PUBLIC_OAUTH_MODE`) (xóa dòng `OAUTH_MODE` hoặc đặt `OAUTH_MODE=live`). Nếu để `dev`, ai cũng đăng nhập được bằng bất kỳ email nào.

## Sau này: đăng nhập thật

Cần thay `DevOAuthController` (`apps/api/src/auth/dev-oauth.controller.ts`, comment `TODO(OAuth)`) bằng luồng thật (ví dụ `/auth/google` + `/auth/google/callback`, tương tự cho Facebook), kết thúc bằng `AuthService.socialLogin()`, dùng id người dùng do nhà cung cấp trả về và chỉ tin email đã được nhà cung cấp xác minh.

### Google
1. Vào Google Cloud Console, tạo project, mở "APIs & Services" > "OAuth consent screen" và điền thông tin ứng dụng.
2. "Credentials" > "Create credentials" > "OAuth client ID" (loại Web application), thêm địa chỉ callback của website.
3. Lấy Client ID và Client secret.

### Facebook
1. Vào Facebook Developers, tạo app, thêm sản phẩm "Facebook Login".
2. Thêm địa chỉ callback vào "Valid OAuth Redirect URIs".
3. Lấy App ID và App Secret.
4. **Lưu ý:** app ở chế độ Development chỉ cho admin/tester của app đăng nhập. Muốn khách bên ngoài dùng phải qua **App Review** của Facebook (thường cần xác minh doanh nghiệp, đường dẫn chính sách quyền riêng tư và quyền `email`). Việc này mất thời gian, nên bắt đầu sớm.

### Biến môi trường dự kiến (chưa có trong code)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

Không đưa các giá trị này vào git; chỉ để trong `.env`.
