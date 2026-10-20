# Hạt Lành

Cửa hàng thực phẩm chay: NestJS API + Next.js portal + React/Vite admin + gói `@hatlanh/shared`, trên PostgreSQL.

## Trạng thái

Đã đủ ba phần:
- **API**: sản phẩm, đơn hàng, hoàn trả, đánh giá, blog, bình luận, kiểm duyệt, báo cáo, tài khoản.
- **Portal** (khách, http://localhost:3001): sản phẩm, giỏ hàng, đặt hàng, tài khoản, đơn hàng, hoàn trả, đánh giá, tra cứu đơn, blog, giới thiệu.
- **Admin** (http://localhost:3002): sản phẩm, đơn hàng, hoàn trả, blog và chủ đề, kiểm duyệt bình luận/đánh giá, từ khóa nhạy cảm, người dùng, báo cáo.

Trang "Về chúng tôi" (`apps/portal/src/app/ve-chung-toi/page.tsx`) còn các chỗ `[Điền …]` để chủ shop điền trước khi dùng thật.

## Cổng (ports)
- API: 3000
- Portal: 3001
- Admin: 3002
- Postgres: 5432 (database `hat_lanh` và `hat_lanh_test`)

## Chạy trên máy

Cần Node.js và **Docker** (Postgres chạy bằng docker compose).

```
cp .env.example .env
npm install
npm run build:shared      # bắt buộc trước khi chạy hoặc test api/portal/admin
npm run db:up             # khởi động Postgres
npm run db:migrate        # tạo bảng
npm run db:seed           # dữ liệu mẫu
npm run dev               # API 3000 + portal 3001 + admin 3002
```

Sau đó mở portal tại http://localhost:3001 và admin tại http://localhost:3002/login.

- `@hatlanh/shared` được dùng từ thư mục `dist`, nên phải `npm run build:shared` (và chạy lại khi sửa `packages/shared`).
- `npm run db:seed` nạp 10 sản phẩm mẫu (kèm quy cách), bài blog mẫu và tài khoản admin. Chạy lại nhiều lần vẫn an toàn.
- Script tạo database `hat_lanh_test` chỉ chạy khi volume còn mới. Nếu thiếu, chạy `docker compose down -v` (**xóa sạch dữ liệu**) rồi `npm run db:up` và migrate/seed lại.
- `npm run dev` ở thư mục gốc chạy song song API (3000), portal (3001) và admin (3002) bằng `concurrently`. Cũng có thể chạy riêng, ví dụ `npm run dev -w @hatlanh/portal`.
- Không chạy `npm run build -w @hatlanh/portal` khi portal dev đang chạy: hai lệnh dùng chung thư mục `.next` và trang sẽ lỗi 500 (xóa `apps/portal/.next` rồi chạy lại dev để sửa).

## Tài khoản
- Admin: `admin@hatlanh.local`, mật khẩu lấy từ `ADMIN_PASSWORD` (mặc định `ChangeMe123!`). Đăng nhập tại http://localhost:3002/login; tài khoản khách không vào được admin. **Đổi mật khẩu này** trước khi dùng thật.
- Đăng nhập Google/Facebook giả lập: cần `OAUTH_MODE=dev` trong `.env` (đã có trong `.env.example`). Mặc định khi không đặt là tắt. Xem `docs/oauth-setup.md`.
- Khách quên mật khẩu: admin đặt lại (`PATCH /admin/users/:id/password`). Hệ thống không gửi email hay SMS cho ai.
- Phí vận chuyển không tính trên website; chủ shop báo riêng cho khách.

## Biến môi trường (`.env`)

| Biến | Ý nghĩa |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Cấu hình container Postgres |
| `DATABASE_URL` | Database chính |
| `TEST_DATABASE_URL` | Database cho test API (`hat_lanh_test`) |
| `ADMIN_PASSWORD` | Mật khẩu admin do seed tạo |
| `PORT` | Cổng API (mặc định 3000) |
| `JWT_SECRET` | Khóa ký đăng nhập; bắt buộc đổi ở production |
| `OAUTH_MODE` | `dev` bật đăng nhập giả lập; không đặt hoặc `live` là tắt |
| `AUTH_RATE_LIMIT` | Số lần đăng nhập/đăng ký tối đa mỗi IP mỗi phút (mặc định 10) |
| `CORS_ORIGINS` | Các địa chỉ web được gọi API, cách nhau bằng dấu phẩy |
| `API_URL` | Địa chỉ API mà portal gọi khi render phía server (mặc định `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Địa chỉ API mà trình duyệt gọi (mặc định `http://localhost:3000`; được gắn vào lúc build portal) |
| `VITE_API_URL` | Địa chỉ API mà admin gọi (mặc định `http://localhost:3000`; gắn vào lúc build admin) |
| `NEXT_PUBLIC_OAUTH_MODE` | `dev`: nút Google/Facebook ở portal mở form đăng nhập thử (gọi `/auth/dev-login`, cần `OAUTH_MODE=dev`); không đặt: nút hiện "Sắp có". Gắn vào lúc build; production không đặt `dev` |

## Lệnh

Thư mục gốc: `npm run db:up`, `db:down`, `db:migrate`, `db:seed`, `build:shared`, `dev`, `test` (build shared rồi test mọi workspace), `smoke`, `verify:reports`, `address:fetch` (tải lại dữ liệu tỉnh/phường).

API (`-w @hatlanh/api`): `dev`, `build`, `start`, `test`, `db:migrate`, `db:deploy`, `db:seed`, `db:generate`.

Portal (`-w @hatlanh/portal`): `dev` (cổng 3001), `build`, `start`, `test` (Vitest), `typecheck`. Portal đọc file `.env` ở thư mục gốc.

Admin (`-w @hatlanh/admin`): `dev` (cổng 3002), `build`, `preview`, `test` (Vitest), `typecheck`.

## Test

```
npm run db:up
npm test                  # build shared, rồi test api (Jest), portal, admin, shared (Vitest)
```

Jest chạy với `--runInBand` và dùng database `hat_lanh_test`, không đụng dữ liệu dev.

**Kiểm thử toàn luồng** (cần `npm run dev` đang chạy và `OAUTH_MODE=dev`):

```
npm run smoke             # seed, đăng nhập Google giả lập, đặt đơn, admin hoàn tất, khách trả hàng, admin duyệt, kiểm tra tồn kho và doanh thu
npm run verify:reports    # so số liệu báo cáo với tính lại từ đơn/hoàn trả thô
```

Hai script này ghi thêm đơn hàng và hoàn trả thử vào database dev, và `smoke` chạy lại seed (đặt lại tồn kho sản phẩm mẫu về 50). Thêm `-- --no-seed` để bỏ bước seed.

## Cấu trúc thư mục
- `apps/api` — NestJS API (`src/<module>`, `prisma/` gồm schema, migration, seed)
- `apps/portal` — website cho khách (Next.js)
- `apps/admin` — trang quản trị (React/Vite)
- `packages/shared` — kiểu dữ liệu và hàm dùng chung
- `docker/` — script khởi tạo database test
- `scripts/` — `smoke.ts` (kiểm thử toàn luồng), `verify-reports.mjs` (kiểm thử báo cáo), `fetch-address.ts`
- `docs/` — tài liệu; `docs/superpowers/specs` là bản thiết kế

## API (tổng quan)

Các đường dẫn `/admin/*` yêu cầu đăng nhập admin. "Đăng nhập" nghĩa là gửi token của tài khoản. Ảnh upload được phục vụ tại `/uploads/...`.

- **health**: `GET /health`
- **auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (đăng nhập), `POST /auth/dev-login` (chỉ khi `OAUTH_MODE=dev`)
- **address**: `GET /address/provinces`, `GET /address/provinces/:code/wards`
- **catalog**: `GET /categories`, `GET /products`, `GET /products/:slug`; admin: `GET|POST /admin/products`, `PATCH /admin/products/:id`, `PATCH /admin/products/:id/hide`, `POST /admin/products/:id/variants`, `PATCH|DELETE /admin/variants/:id`
- **orders**: `POST /orders` (khách vãng lai hoặc đã đăng nhập), `GET /orders/lookup` (mã đơn + số điện thoại, 5 lần/phút), `GET /me/orders` (đăng nhập); admin: `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`
- **returns**: `POST /me/orders/:code/returns` (đăng nhập); admin: `GET|POST /admin/returns`, `PATCH /admin/returns/:id/decision`
- **reviews**: `GET|POST /products/:id/reviews` (đăng bài cần đăng nhập; danh sách có cờ `mine` cho đánh giá của chính người xem)
- **posts / topics**: `GET /posts`, `GET /posts/:slug`, `GET /topics`; admin: `GET|POST /admin/posts`, `GET|PATCH|DELETE /admin/posts/:id`, `GET|POST /admin/topics`, `PATCH|DELETE /admin/topics/:id`
- **comments**: `GET|POST /posts/:slug/comments` (đăng bình luận cần đăng nhập)
- **moderation**: admin `GET /admin/moderation`, `PATCH|DELETE /admin/moderation/:kind/:id`, `GET|POST /admin/sensitive-words`, `DELETE /admin/sensitive-words/:id`
- **reports**: admin `GET /admin/reports/best-sellers`, `/returns`, `/revenue`
- **users**: admin `GET /admin/users`, `PATCH /admin/users/:id/password`
- **uploads**: admin `POST /admin/uploads`

## Các phần "cắm sau" (TODO trong code)

| Phần | Vị trí | Tài liệu |
|---|---|---|
| Thông báo Telegram (hiện in ra terminal) | `apps/api/src/notifications/console.notifier.ts`, `TODO(Telegram)` | `docs/telegram-setup.md` |
| Đăng nhập Google/Facebook thật | `apps/api/src/auth/dev-oauth.controller.ts`, `TODO(OAuth)` | `docs/oauth-setup.md` |
| Thanh toán VietQR | `apps/api/src/payments/payments.module.ts`, `TODO(VietQR)` | `docs/vietqr-notes.md` |
