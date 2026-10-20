---
name: schema-designer
description: Thiết kế Data Schema (Prisma / Drizzle / SQL thuần), định nghĩa quan hệ 1-1, 1-n, n-n, ràng buộc và gợi ý indexes tối ưu theo query pattern. Dùng khi người dùng gọi /schema-designer, "thiết kế database", "thiết kế bảng", "thêm model", "gợi ý index".
disable-model-invocation: true
argument-hint: "[tính năng / các thực thể cần thiết kế] [prisma|drizzle|sql]"
---

# Schema Designer

Nhiệm vụ: thiết kế **data schema**, định nghĩa **quan hệ (1-1, 1-n, n-n)** và gợi ý **indexes** tối ưu. Trình bày bản thiết kế trước, **chỉ ghi file và tạo migration khi người dùng duyệt**.

## 1. Hiểu yêu cầu và bối cảnh

- Đọc `$ARGUMENTS`: các thực thể, thuộc tính, quy tắc nghiệp vụ. Thiếu thông tin quyết định cấu trúc thì hỏi lại ngắn gọn. Ví dụ: một task có thuộc nhiều project không, xoá user thì dữ liệu của họ xử lý thế nào, có multi-tenant không.
- Dò codebase và **theo convention có sẵn**:
  - Công cụ: `prisma/schema.prisma`, `drizzle.config.*` + file schema, thư mục `migrations/`/`supabase/migrations/`, file `.sql`.
  - DB: PostgreSQL, MySQL, SQLite... (ảnh hưởng kiểu dữ liệu, index, enum).
  - Quy ước: kiểu khoá chính (`cuid`/`uuid`/`autoincrement`), tên bảng/cột (`snake_case` qua `@@map`/`@map` hay `camelCase`), có `createdAt`/`updatedAt`/`deletedAt` không, cách khai báo enum.
  - Model liên quan đã có, để nối quan hệ đúng thay vì tạo trùng.
- Chưa chỉ định công cụ (`prisma` / `drizzle` / `sql`) thì dùng cái dự án đang dùng; chưa có gì thì hỏi.

## 2. Thiết kế thực thể

- Mỗi bảng có khoá chính, `createdAt`, `updatedAt` (trừ bảng nối thuần tuý nếu dự án không dùng).
- Chuẩn hoá tới 3NF làm mặc định; chỉ denormalize (lưu bản sao, cột đếm) khi có lý do hiệu năng rõ ràng và nêu cách giữ đồng bộ.
- Kiểu dữ liệu đúng:
  - Tiền dùng `Decimal`/`numeric` hoặc số nguyên đơn vị nhỏ nhất. **Không dùng float.**
  - Thời gian dùng `timestamptz` (Postgres).
  - Trạng thái dùng enum hoặc bảng tra cứu.
  - JSON chỉ cho dữ liệu thật sự không có cấu trúc cố định.
- Ràng buộc ở tầng DB, không chỉ ở app:
  - `NOT NULL` cho field bắt buộc, `UNIQUE` cho email/slug.
  - `CHECK` cho khoảng giá trị khi công cụ hỗ trợ.
  - Default hợp lý.
- Multi-tenant: mọi bảng dữ liệu của tenant có `orgId`/`tenantId`; unique theo phạm vi tenant (`@@unique([orgId, slug])`).
- Xoá mềm (`deletedAt`) chỉ khi nghiệp vụ cần khôi phục/lưu vết. Nếu dùng thì unique và index phải tính tới bản ghi đã xoá (partial index `WHERE deleted_at IS NULL` nếu DB hỗ trợ).

## 3. Quan hệ

| Quan hệ | Cách làm |
|---|---|
| **1-1** | FK đặt ở bảng phụ thuộc, FK có `UNIQUE` (vd. `Profile.userId @unique`) |
| **1-n** | FK ở phía "n" (vd. `Post.authorId` → `User.id`) |
| **n-n** | Bảng nối với khoá chính ghép `(aId, bId)`. Dùng **bảng nối tường minh** khi cần thêm cột (`role`, `createdAt`, `position`); quan hệ ngầm của Prisma chỉ khi chắc chắn không bao giờ cần thêm dữ liệu |
| **Tự tham chiếu** | `parentId` trỏ về chính bảng (cây danh mục, comment lồng nhau); đặt tên relation rõ ràng |
| **Đa hình** | Tránh cặp `targetType` + `targetId` không có FK; ưu tiên nhiều FK nullable + `CHECK` chỉ một cột có giá trị, hoặc bảng riêng cho từng loại |

- Hành vi khi xoá (`onDelete`) phải chọn có chủ đích cho từng FK:
  - `Cascade`: dữ liệu con vô nghĩa khi cha mất.
  - `Restrict`: cấm xoá khi còn con.
  - `SetNull`: giữ con, bỏ liên kết.
- Đặt tên relation và cột FK nhất quán: `authorId`/`author`, không trộn `userId` với `user_id`.

## 4. Indexes

Index phải xuất phát từ **query pattern thật**. Liệt kê các truy vấn chính của tính năng trước, rồi mới chọn index.

- **Luôn index cột FK.** Postgres không tự tạo index cho FK (MySQL InnoDB thì có), Prisma cũng không tự thêm (với `relationMode = "prisma"` thì còn không có FK). Vì vậy cần khai báo `@@index` / `index()` tường minh.
- **Index ghép** theo thứ tự: cột lọc bằng (`=`) trước, cột lọc khoảng / sắp xếp sau.
  - Ví dụ `WHERE projectId = ? AND status = ? ORDER BY createdAt DESC` dùng `@@index([projectId, status, createdAt])`.
  - Index `(a, b)` đã phục vụ được query chỉ lọc `a`, nên không tạo thêm index `(a)` riêng.
- Ràng buộc `UNIQUE` đã tạo index, không tạo trùng.
- Bảng nối n-n: khoá chính `(aId, bId)` phục vụ tra theo `aId`; thêm index `(bId)` cho chiều ngược lại.
- Tìm kiếm text: `LIKE 'abc%'` dùng B-tree được. `ILIKE '%abc%'` / full-text thì gợi ý `pg_trgm` GIN hoặc `tsvector`, hoặc dịch vụ search.
- Postgres nâng cao khi thật sự cần:
  - Partial index (`WHERE deleted_at IS NULL`, `WHERE status = 'active'`).
  - GIN cho `jsonb`/mảng.
  - Index biểu thức (`lower(email)`).
- **Không index tràn lan**: mỗi index làm chậm ghi và tốn dung lượng. Cột ít giá trị phân biệt (boolean, enum 2–3 giá trị) đứng một mình thường không đáng index.
- Supabase/RLS: index các cột dùng trong policy (`user_id`, `org_id`).

## 5. Trình bày bản thiết kế

Gửi người dùng duyệt trước khi ghi file:

1. **Tóm tắt** các thực thể và quan hệ (1–3 câu).
2. **Sơ đồ ER** bằng Mermaid `erDiagram` (chỉ các bảng mới/thay đổi và bảng liên quan trực tiếp).
3. **Schema** đầy đủ bằng công cụ của dự án (Prisma / Drizzle / SQL), có comment ngắn cho quyết định không hiển nhiên.
4. **Bảng index**: index → query mà nó phục vụ.
5. **Hành vi xoá** của từng FK và lý do.
6. **Migration và rủi ro** nếu sửa bảng đã có dữ liệu:
   - Thêm cột `NOT NULL` vào bảng có dữ liệu → cần default hoặc backfill nhiều bước.
   - Đổi tên cột → Prisma có thể hiểu thành drop + add, gây **mất dữ liệu**.
   - Tạo index trên bảng lớn → cân nhắc `CREATE INDEX CONCURRENTLY`.
7. **Điểm cần người dùng quyết định** (nếu có).

## 6. Ghi file (sau khi được duyệt)

- Sửa file schema theo đúng convention. Chạy bước kiểm tra không đụng DB:
  - Prisma: `prisma format` + `prisma validate`.
  - Drizzle: `drizzle-kit check` hoặc typecheck.
- **Không tự chạy lệnh tác động database** (`prisma migrate dev`, `migrate deploy`, `db push`, `drizzle-kit push`, chạy SQL). Đưa lệnh cho người dùng hoặc hỏi trước khi chạy, và nói rõ DB nào sẽ bị ảnh hưởng.
- Gợi ý chạy `/api-architect` để thiết kế API/DTO dựa trên schema này.
