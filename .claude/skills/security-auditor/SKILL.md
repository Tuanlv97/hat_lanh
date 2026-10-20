---
name: security-auditor
description: Quét nhanh lỗ hổng bảo mật - XSS, SQL/NoSQL Injection, thiếu RLS / middleware auth / kiểm tra quyền, lọt secret key - trong code vừa viết hoặc phạm vi được chỉ định, rồi báo cáo theo mức độ nghiêm trọng. Dùng khi người dùng gọi /security-auditor, "audit bảo mật", "quét lỗ hổng", "check security".
disable-model-invocation: true
argument-hint: "[file/thư mục | all] - bỏ trống = code vừa viết"
---

# Security Auditor

Nhiệm vụ: quét nhanh các lỗ hổng **XSS, Injection, thiếu RLS / Auth middleware, lọt Secret**. Mặc định **chỉ đọc và báo cáo**, không tự sửa code.

## 1. Xác định phạm vi

- `$ARGUMENTS` là file/thư mục → chỉ quét phạm vi đó.
- `all` → quét toàn bộ dự án (bỏ qua `node_modules`, `dist`, `build`, `.next`, `coverage`, `vendor`, file lock).
- Không có tham số → code vừa viết/sửa: ưu tiên `git diff` + `git diff --cached` + file mới chưa track; nếu không phải git repo thì dùng các file đã tạo/sửa trong cuộc hội thoại này.
- Đọc nhanh stack (`package.json`, framework, ORM, DB, nơi định nghĩa route/middleware) để biết nên tìm ở đâu.

## 2. Các hạng mục cần quét

Dùng Grep để khoanh vùng, sau đó **đọc code xung quanh để xác nhận** dữ liệu có thật sự đến từ người dùng và có được làm sạch hay không. Không báo cáo chỉ vì grep trúng.

### A. XSS
- Render HTML thô: `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `[innerHTML]`, `innerHTML =`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `$().html()`.
- Template không escape: `<%- %>` (EJS), `{{{ }}}` (Handlebars), `| safe` / `|raw`, `Html.Raw`, `mark_safe`.
- URL do người dùng nhập vào `href`/`src` (cho phép `javascript:`), `window.location = input`, open redirect.
- `eval`, `new Function`, `setTimeout(string)` với dữ liệu từ ngoài.
- Thiếu sanitize (DOMPurify...) khi buộc phải render HTML; thiếu header CSP nếu dễ kiểm tra.

### B. Injection
- SQL ghép chuỗi / template literal: `` `SELECT ... ${x}` ``, `"... WHERE id = " + id`, `.raw(` / `$queryRawUnsafe` / `sequelize.query` / `knex.raw` / `db.execute` có nội suy biến, f-string SQL trong Python.
- NoSQL: truyền thẳng `req.body`/`req.query` vào `find`/`where` (cho phép `$ne`, `$gt`...), `$where`.
- Command injection: `exec`, `execSync`, `spawn(..., { shell: true })`, `child_process`, `os.system`, `subprocess(..., shell=True)` với input người dùng.
- Path traversal: `fs.readFile`/`sendFile`/`path.join` với tên file từ request mà không chuẩn hoá và chặn `..`.
- SSRF: `fetch`/`axios` tới URL lấy từ request.

### C. Thiếu Auth / RLS / phân quyền
- **Route/API**: liệt kê các route (API routes, server actions, controller, tRPC procedure, GraphQL resolver) và kiểm tra từng cái có qua middleware auth/session không. Đặc biệt chú ý route ghi/xoá dữ liệu, route admin, webhook (phải verify chữ ký).
- **Middleware**: matcher của `middleware.ts` (Next.js) có bỏ sót path không; middleware có bị đặt sau route cần bảo vệ không.
- **IDOR / phân quyền theo bản ghi**: truy vấn theo `id` từ request mà không lọc theo `userId`/`orgId` của người đang đăng nhập; tin `userId`/`role` gửi từ client.
- **Supabase / Postgres RLS**: bảng không có `ENABLE ROW LEVEL SECURITY`; policy `USING (true)` hoặc quá rộng; thiếu policy cho INSERT/UPDATE/DELETE (`WITH CHECK`); dùng `service_role` key ở client; dùng `user_metadata` để phân quyền.
- **Firebase**: rules `allow read, write: if true`.
- Kiểm tra quyền chỉ ở frontend (ẩn nút) mà backend không kiểm.
- JWT: không verify chữ ký, chấp nhận `alg: none`, secret yếu/hardcode, không kiểm hạn.
- CORS `origin: '*'` kèm `credentials: true`.

### D. Lọt Secret
- Hardcode trong code: các pattern như `sk_live_`, `sk_test_`, `sk-` (OpenAI/Anthropic), `AKIA` (AWS), `ghp_`/`github_pat_`, `xox[bp]-` (Slack), `AIza` (Google), `-----BEGIN ... PRIVATE KEY-----`, connection string có mật khẩu (`postgres://user:pass@`, `mongodb+srv://`), biến tên `password`/`secret`/`token`/`api_key` gán chuỗi cố định.
- Secret lộ ra client: biến môi trường `NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*`, `EXPO_PUBLIC_*` chứa key bí mật (service role, secret key, private key); import file server-only vào component client.
- File `.env*` không nằm trong `.gitignore` hoặc đã bị commit (`git ls-files | grep .env`); `.env.example` chứa giá trị thật.
- Secret bị log ra (`console.log(process.env...)`, log cả request header `Authorization`), hoặc trả về trong response/error message.
- **Khi báo cáo secret: chỉ hiện vài ký tự đầu + `***`, không bao giờ in nguyên giá trị.**

## 3. Đánh giá mức độ

| Mức | Ví dụ |
|---|---|
| 🔴 Critical | Secret thật bị hardcode/commit, SQL injection khai thác được, route ghi/xoá không có auth, RLS tắt trên bảng chứa dữ liệu người dùng, service role key ở client |
| 🟠 High | XSS từ input người dùng, IDOR, policy RLS quá rộng, webhook không verify chữ ký |
| 🟡 Medium | Thiếu sanitize nhưng nguồn dữ liệu hạn chế, CORS lỏng, JWT cấu hình yếu |
| 🔵 Low | Hardening: thiếu CSP/security header, log quá nhiều thông tin |

Chỉ báo những gì đã xác nhận qua đọc code. Nghi ngờ nhưng chưa chắc (không thấy được nguồn dữ liệu, cấu hình nằm ngoài repo như RLS trên dashboard Supabase) thì ghi riêng mục **"Cần kiểm tra thêm"**.

## 4. Báo cáo

Sắp xếp từ nghiêm trọng nhất. Mỗi lỗ hổng:

- **[Mức] Tên lỗi**: link file:dòng
- **Vấn đề**: 1–2 câu, dữ liệu đi từ đâu tới đâu.
- **Kịch bản khai thác**: input cụ thể → hậu quả.
- **Cách sửa**: đoạn code đề xuất ngắn (parameterized query, sanitize, thêm middleware, policy RLS mẫu, chuyển key sang server...).

Cuối báo cáo:
- Tóm tắt số lượng theo mức độ và phạm vi đã quét (cả những hạng mục quét rồi mà không thấy lỗi).
- Mục **"Cần kiểm tra thêm"** nếu có.
- Nếu có secret bị lộ: nhắc **rotate key ngay** (xoá khỏi code là chưa đủ vì vẫn còn trong lịch sử git).
- Hỏi người dùng có muốn sửa không. **Chỉ sửa khi người dùng đồng ý**, và sửa theo thứ tự Critical → Low.
