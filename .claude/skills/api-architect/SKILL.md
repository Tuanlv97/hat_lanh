---
name: api-architect
description: Thiết kế API - RESTful endpoints hoặc Next.js Server Actions, định nghĩa DTO, Zod schema, response/error format thống nhất - cho một tính năng hoặc resource. Dùng khi người dùng gọi /api-architect, "thiết kế API", "tạo endpoint", "viết server action", "định nghĩa DTO/schema".
disable-model-invocation: true
argument-hint: "[tính năng / resource cần thiết kế] [rest|action]"
---

# API Architect

Nhiệm vụ: thiết kế **RESTful endpoints hoặc Server Actions**, định nghĩa **DTO, Zod schema, response format**. Trình bày bản thiết kế trước, **chỉ sinh code khi người dùng duyệt**.

## 1. Hiểu yêu cầu và bối cảnh

- Đọc `$ARGUMENTS`: tính năng/resource, thao tác cần có, ai được gọi. Thiếu thông tin nghiệp vụ quan trọng (quan hệ dữ liệu, quyền, ràng buộc) thì hỏi lại ngắn gọn.
- Dò codebase và **theo convention có sẵn**, không áp đặt cấu trúc mới:
  - Framework: Next.js App Router (`app/api/**/route.ts`, `'use server'`), Pages API, Express/Fastify/Hono/NestJS, tRPC...
  - Nơi đặt schema/type (`schemas/`, `lib/validations/`, `types/`, cạnh feature), cách đặt tên file.
  - ORM/DB (Prisma, Drizzle, Supabase...), schema bảng hiện có.
  - Auth (NextAuth/Auth.js, Clerk, Supabase Auth, JWT...) và helper lấy user hiện tại.
  - Response/error format, helper (`apiResponse`, `ActionResult`...), phiên bản Zod đang dùng.
- Đã có format/convention thì dùng đúng cái đó; các mặc định bên dưới chỉ áp dụng khi dự án chưa có.

## 2. Chọn REST hay Server Action

Người dùng chỉ định (`rest` / `action`) thì theo đó. Nếu không:

| Dùng **Server Action** khi | Dùng **REST endpoint** khi |
|---|---|
| Mutation gọi từ form/component của chính app Next.js | Client bên ngoài gọi: mobile app, service khác, đối tác |
| Cần progressive enhancement, `revalidatePath`/`revalidateTag` | Webhook, cron, upload/download file, streaming |
| | Cần HTTP cache, method/status code chuẩn, public API có versioning |

Đọc dữ liệu trong Next.js ưu tiên Server Component gọi thẳng tầng data; không tạo endpoint GET chỉ để chính app tự gọi.

## 3. Thiết kế

### REST endpoints
- Resource danh từ số nhiều, kebab-case, lồng tối đa 1 cấp: `/api/projects`, `/api/projects/:projectId/tasks`.
- Method đúng ngữ nghĩa: `GET` đọc, `POST` tạo, `PATCH` cập nhật một phần, `PUT` thay toàn bộ, `DELETE` xoá. Hành động không phải CRUD: `POST /api/orders/:id/cancel`.
- Status code: `200` OK, `201` Created (kèm resource), `204` No Content, `400` validation, `401` chưa đăng nhập, `403` không có quyền, `404` không tìm thấy, `409` xung đột/trùng, `422` vi phạm nghiệp vụ, `429` rate limit, `500` lỗi server.
- List: phân trang (`page`/`pageSize` hoặc `cursor`/`limit` cho dữ liệu lớn), `sort`, filter qua query string, có giới hạn `pageSize` tối đa.
- Idempotency cho thao tác thanh toán/tạo đơn (header `Idempotency-Key`) khi phù hợp.

### Server Actions
- Đặt tên động từ rõ nghĩa: `createProject`, `updateTaskStatus`, `deleteComment`.
- Mỗi action: xác thực user → kiểm quyền trên resource → validate input bằng Zod → xử lý → `revalidatePath`/`revalidateTag` → trả `ActionResult`.
- **Không throw lỗi nghiệp vụ ra client**; trả về result có `ok: false`. Chỉ `redirect()`/`notFound()` theo cơ chế của Next.js.
- Input từ `FormData` thì parse bằng Zod với `z.coerce` cho số/ngày/boolean.

### DTO và Zod schema
- **Zod schema là nguồn sự thật duy nhất**; type suy ra bằng `z.infer` / `z.input` / `z.output`, không khai báo interface trùng lặp.
- Tách theo mục đích:
  - `CreateXInput`: field client được gửi khi tạo.
  - `UpdateXInput`: thường là `CreateXInput.partial()`, cộng/trừ field nếu cần.
  - `XQuery`: params của list (page, limit, sort, filter) với `z.coerce` và `.default()`.
  - `XResponse` / `XDto`: dữ liệu trả về client.
- **Không bao giờ** nhận từ client các field server tự quyết: `id`, `userId`/`ownerId`, `role`, `createdAt`, `updatedAt`, giá tiền/tổng tiền tính được. Lấy từ session/tính ở server.
- **Không trả thẳng entity DB**: map sang DTO, loại bỏ field nhạy cảm (`passwordHash`, token, field nội bộ).
- Validate chặt: `.trim()`, `.min()`/`.max()` độ dài, `.email()`, `.url()`, `.uuid()`/`.cuid()`, `z.enum([...])` thay vì string tự do, giới hạn kích thước mảng. Dùng `.strict()` khi muốn từ chối field lạ.
- Message lỗi validation viết theo ngôn ngữ UI đang dùng trong dự án.

### Response format (mặc định khi dự án chưa có)

```ts
// Thành công
{ success: true, data: T, meta?: { page, pageSize, total, nextCursor? } }

// Lỗi
{ success: false, error: { code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR' | ..., message: string, details?: Record<string, string[]> } }
```

- `code` ổn định để client xử lý theo logic; `message` cho người đọc; `details` chứa lỗi theo từng field (từ `error.flatten().fieldErrors` của Zod).
- Server Action dùng cùng cấu trúc (`ActionResult<T>`), nên định nghĩa type dùng chung.
- Lỗi `500` không lộ stack trace, câu SQL hay thông tin nội bộ ra client; log chi tiết ở server.

### Bảo mật và hiệu năng (bắt buộc có trong thiết kế)
- Mọi endpoint/action ghi dữ liệu phải có auth và **kiểm quyền theo bản ghi** (lọc theo `userId`/`orgId`), không chỉ kiểm đăng nhập.
- Rate limit cho endpoint nhạy cảm (đăng nhập, gửi email/OTP, tạo tài nguyên tốn kém).
- Truy vấn chỉ `select` field cần, tránh N+1, có index cho field lọc/sắp xếp.

## 4. Trình bày bản thiết kế

Gửi người dùng duyệt trước khi viết code:

1. **Tóm tắt**: REST hay Server Action và lý do (1–2 câu).
2. **Bảng endpoint/action**: method + path (hoặc tên action), mô tả, auth/quyền, input DTO, output DTO, status/error code có thể trả.
3. **Zod schema** đầy đủ cho các DTO (code block).
4. **Response format** và type dùng chung (nếu dự án chưa có).
5. **Ví dụ request/response** cho 1–2 case chính và 1 case lỗi.
6. **Vị trí file** dự kiến theo convention dự án.
7. **Điểm cần người dùng quyết định** (nếu có): quy tắc nghiệp vụ chưa rõ, cách phân trang, xoá cứng hay xoá mềm...

## 5. Sinh code (sau khi được duyệt)

- Tạo/sửa đúng các file đã nêu: schema, type, route handler / server action, helper response nếu chưa có.
- Chạy typecheck/lint (và test nếu có) rồi báo kết quả thật.
- Gợi ý chạy `/tester` để viết test và `/security-auditor` để rà lại phần auth/quyền.
