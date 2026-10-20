---
name: perf-checker
description: Soi điểm nghẽn hiệu năng - re-render thừa trong React, N+1 query và truy vấn chậm ở Database, bundle size nặng - trong code vừa viết hoặc phạm vi được chỉ định, rồi báo cáo theo mức độ ảnh hưởng. Dùng khi người dùng gọi /perf-checker, "check performance", "tối ưu hiệu năng", "app chậm", "bundle nặng".
disable-model-invocation: true
argument-hint: "[file/thư mục | all] [react|db|bundle] - bỏ trống = code vừa viết, cả 3 nhóm"
---

# Perf Checker

Nhiệm vụ: soi điểm nghẽn hiệu năng ở 3 nhóm: **re-render React, N+1 / query Database, bundle size**. Mặc định **chỉ đọc và báo cáo**, không tự sửa code.

## 1. Xác định phạm vi

- `$ARGUMENTS` là file/thư mục → chỉ soi phạm vi đó; có `react` / `db` / `bundle` → chỉ soi nhóm đó.
- `all` → toàn bộ dự án (bỏ qua `node_modules`, `dist`, `build`, `.next`, `coverage`).
- Không có tham số → code vừa viết/sửa: ưu tiên `git diff` + `git diff --cached` + file mới chưa track; nếu không phải git repo thì dùng các file đã tạo/sửa trong cuộc hội thoại này.
- Đọc nhanh stack (`package.json`, framework, ORM, bundler, state management) và bỏ qua nhóm không áp dụng (không có React thì bỏ mục A...).

## 2. Các hạng mục cần soi

Dùng Grep để khoanh vùng, sau đó **đọc code xung quanh để xác nhận**: code có nằm trên đường nóng không (render thường xuyên, list lớn, request mỗi lượt), dữ liệu lớn cỡ nào. Không báo cáo chỉ vì grep trúng. Không đề xuất tối ưu vi mô vô nghĩa.

### A. Re-render thừa trong React
- **Prop tham chiếu mới mỗi render** truyền vào component đã `memo` hoặc vào dependency array: object/array literal (`style={{...}}`, `options={[...]}`), arrow function inline, `.map/.filter` trong render.
- **Context quá rộng**: `value={{ a, b }}` tạo object mới mỗi render, một context chứa cả state thay đổi liên tục lẫn state tĩnh → mọi consumer re-render. Đề xuất `useMemo` cho value hoặc tách context.
- **State đặt quá cao**: state của input/hover/modal nằm ở component cha lớn hoặc layout → cả cây re-render mỗi lần gõ phím. Đề xuất đưa state xuống gần nơi dùng.
- **Derived state**: `useEffect` + `setState` để tính giá trị suy ra từ props/state (render 2 lần) → tính trực tiếp hoặc `useMemo`.
- **Effect lỗi**: thiếu/sai dependency gây vòng lặp render, fetch lặp lại; `useEffect` không cleanup (listener, interval, subscription).
- **Store selector**: Redux/Zustand selector trả về object/array mới mỗi lần (`useSelector(s => ({...}))`, `useStore(s => s.items.filter(...))`), lấy cả store thay vì đúng field.
- **List**: `key={index}` với list có thêm/xoá/sắp xếp, list hàng trăm/ngàn item không dùng virtualization (`react-window`, `@tanstack/react-virtual`).
- **Tính toán nặng trong render** không memo (sort/filter/format list lớn, parse JSON lớn).
- Next.js: component không cần tương tác lại bị gắn `'use client'` (đẩy JS xuống client), fetch phía client thay vì server component.
- Lưu ý: **không** khuyên bọc `memo`/`useMemo`/`useCallback` tràn lan; chỉ đề xuất khi có component tốn kém hoặc re-render thường xuyên thật. Nếu dự án bật React Compiler thì phần lớn memo thủ công là không cần.

### B. Database: N+1 và truy vấn chậm
- **N+1**: query nằm trong vòng lặp hoặc trong `map` + `Promise.all` theo từng phần tử (`for (const u of users) await db.post.findMany({ where: { userId: u.id } })`); GraphQL resolver lấy quan hệ cho từng item mà không có DataLoader; lazy-loading quan hệ của ORM trong loop (Sequelize/TypeORM/Django/Rails/EF Core).
  - Đề xuất: `include` / `with` / `JOIN`, `WHERE id IN (...)` rồi gom bằng Map, DataLoader, `select_related` / `prefetch_related`, `.Include()`.
- **Lấy thừa dữ liệu**: `SELECT *` / không có `select` khi chỉ cần vài cột; lấy cả bảng rồi lọc/đếm/phân trang trong JS; không có `LIMIT`/phân trang cho danh sách.
- **Thiếu index**: cột dùng trong `WHERE`, `JOIN`, `ORDER BY`, foreign key mà schema/migration không có index (Prisma `@@index`, migration SQL...).
- **Query tuần tự không cần thiết**: nhiều `await` độc lập nối đuôi nhau → `Promise.all`.
- **Ghi từng dòng**: insert/update trong vòng lặp → `createMany` / bulk insert / transaction.
- Query lặp lại giống hệt trong cùng request, thiếu cache cho dữ liệu ít đổi; mở connection mới mỗi request (serverless không dùng pool).
- Supabase: policy RLS gọi subquery/function nặng cho từng dòng, cột trong policy không có index.

### C. Bundle size nặng
- **Thư viện nặng / import cả gói**: `import _ from 'lodash'`, `import moment`, `import * as Icons from '...'`, toàn bộ `@mui/icons-material`, `aws-sdk` v2, chart/editor/map lớn import ở trang không cần. Đề xuất import theo đường dẫn con, thay bằng bản nhẹ (`lodash-es`, `date-fns`/`dayjs`), hoặc API có sẵn của trình duyệt.
- **Thiếu code splitting**: component lớn chỉ dùng khi mở modal/tab/route khác nhưng import tĩnh → `React.lazy` / `next/dynamic` / `import()`.
- Code/thư viện chỉ dùng phía server (SDK DB, `fs`, xử lý ảnh) bị kéo vào bundle client.
- Polyfill, thư viện trùng chức năng (2 thư viện date, 2 thư viện icon), dependency bị cài trùng nhiều phiên bản.
- Ảnh/font: ảnh lớn không tối ưu, không dùng `next/image` hoặc lazy loading, load nhiều weight font không dùng, nhúng asset lớn dạng base64.
- **Đo nếu được**: nếu dự án có script build/analyze (`next build` in kích thước route, `vite build`, `@next/bundle-analyzer`, `rollup-plugin-visualizer`, `source-map-explorer`) thì chạy và dùng số liệu thật. Không có sẵn công cụ phân tích thì **hỏi trước** khi cài. Ước lượng kích thước package phải ghi rõ là ước lượng.

## 3. Đánh giá mức độ ảnh hưởng

| Mức | Ví dụ |
|---|---|
| 🔴 High | N+1 trên danh sách không giới hạn hoặc trang chính, query full bảng lớn, re-render cả app mỗi lần gõ phím, thư viện hàng trăm KB ở trang đầu tiên |
| 🟠 Medium | N+1 trên danh sách nhỏ có giới hạn, thiếu index cột lọc thường dùng, context gây re-render nhóm component, thiếu code splitting cho tính năng ít dùng |
| 🔵 Low | Tối ưu nhỏ, chỉ đáng làm khi đã có số đo cho thấy chậm |

Chỉ báo những gì đã xác nhận qua đọc code. Cần số liệu runtime mới kết luận được (profiler, `EXPLAIN ANALYZE`, dữ liệu production) thì ghi vào mục **"Cần đo thêm"** kèm cách đo.

## 4. Báo cáo

Sắp xếp từ ảnh hưởng lớn nhất. Mỗi vấn đề:

- **[Mức] Tên vấn đề**: link file:dòng
- **Vấn đề**: 1–2 câu, vì sao chậm.
- **Ảnh hưởng ước tính**: ví dụ "1 + N query, N = số user trên trang (~50)", "re-render ~30 component mỗi lần gõ", "+~70 KB gzip".
- **Cách sửa**: đoạn code đề xuất ngắn, kèm lưu ý nếu cách sửa có thể đổi behavior.

Cuối báo cáo:
- Tóm tắt số lượng theo mức và phạm vi/nhóm đã soi (cả những nhóm soi rồi mà không thấy vấn đề).
- Mục **"Cần đo thêm"** nếu có: React DevTools Profiler, `EXPLAIN ANALYZE`, bundle analyzer, Lighthouse.
- Hỏi người dùng có muốn sửa không. **Chỉ sửa khi người dùng đồng ý**, theo thứ tự High → Low. Sửa xong phải giữ nguyên behavior và chạy lại test/build nếu có.
