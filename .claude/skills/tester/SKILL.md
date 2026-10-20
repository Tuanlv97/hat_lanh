---
name: tester
description: Viết Unit Test / Integration Test / E2E (Jest, Vitest, Playwright) bao phủ cả Happy Path lẫn Edge Cases cho code vừa viết hoặc file được chỉ định. Dùng khi người dùng gọi /tester, "viết test", "thêm test", "tăng coverage".
disable-model-invocation: true
argument-hint: "[file/thư mục cần test] [unit|integration|e2e] - bỏ trống = code vừa viết"
---

# Tester

Nhiệm vụ: viết test cho code, bao phủ **Happy Path** và **Edge Cases**. Test phải chạy được và pass, trừ khi phát hiện bug thật.

## 1. Xác định phạm vi và loại test

- Có tham số (`$ARGUMENTS`) → test đúng file/thư mục đó; nếu có `unit` / `integration` / `e2e` thì chỉ viết loại đó.
- Không có → code vừa viết/sửa: ưu tiên `git diff` + file mới chưa track; nếu không phải git repo thì dùng các file đã tạo/sửa trong cuộc hội thoại này.
- Chưa chỉ định loại test thì chọn theo bản chất code:

| Code | Loại test |
|---|---|
| Hàm thuần, util, hook, reducer, validator | Unit |
| Service gọi DB/API, route/controller, nhiều module phối hợp | Integration |
| Luồng người dùng trên UI (đăng nhập, checkout, form nhiều bước) | E2E (Playwright) |

## 2. Dò setup test có sẵn

- Đọc `package.json` (scripts, devDependencies), `jest.config.*`, `vitest.config.*` / `vite.config.*`, `playwright.config.*`, `tsconfig.json`.
- Tìm test mẫu đang có (`*.test.*`, `*.spec.*`, `__tests__/`, `tests/`, `e2e/`) và **bắt chước**: vị trí đặt file, cách đặt tên, cách import, cách mock, helper/fixture/factory dùng chung.
- Framework:
  - Đã có Jest hoặc Vitest → dùng đúng cái đó, không trộn.
  - Chưa có gì → dự án dùng Vite thì đề xuất Vitest, còn lại đề xuất Jest; E2E dùng Playwright.
  - **Cài thêm package hoặc tạo file config mới thì hỏi người dùng trước.**

## 3. Liệt kê test case trước khi viết

Đọc code, liệt kê ngắn gọn các case theo nhóm, rồi mới viết:

**Happy Path**: input hợp lệ điển hình → output/side effect đúng.

**Edge Cases** (chọn những gì áp dụng được):
- Giá trị biên: `0`, số âm, số rất lớn, `NaN`, `Infinity`, chuỗi rỗng, khoảng trắng, unicode/emoji, mảng/object rỗng, 1 phần tử, rất nhiều phần tử.
- Thiếu/sai dữ liệu: `null`, `undefined`, sai kiểu, field thiếu, field thừa.
- Nhánh lỗi: throw/reject, message lỗi, mã lỗi HTTP (400/401/403/404/409/500), timeout, network fail, retry.
- Async: thứ tự resolve, gọi đồng thời, huỷ/unmount giữa chừng, debounce/throttle (dùng fake timers).
- Trạng thái: gọi lặp lại (idempotent), dữ liệu đã tồn tại/trùng, quyền truy cập khác nhau.
- Thời gian/locale: múi giờ, cuối tháng, năm nhuận, định dạng số/tiền (cố định bằng fake timers / mock date).
- UI: loading, empty, error state, disabled, nhập sai rồi sửa, điều hướng bằng bàn phím.

Mỗi nhánh `if`/`switch`/`catch` trong code nên có ít nhất 1 test đi qua.

## 4. Viết test

- Đặt tên mô tả behavior: `it('trả về 0 khi giỏ hàng rỗng')` thay vì `it('test 1')`. Theo ngôn ngữ đặt tên đang dùng trong test có sẵn.
- Cấu trúc Arrange, Act, Assert. Mỗi test kiểm 1 behavior, độc lập, không phụ thuộc thứ tự chạy.
- **Test behavior, không test implementation**: assert output, giá trị render, request gửi đi; không assert state nội bộ hay hàm private.
- Mock:
  - **Unit**: mock dependency bên ngoài (API, DB, time, random, module khác).
  - **Integration**: hạn chế mock; dùng DB test/in-memory, mock tầng network (MSW, `nock`, `page.route`) thay vì mock hàm nội bộ.
  - Reset mock giữa các test (`beforeEach` / `vi.restoreAllMocks()` / `jest.restoreAllMocks()`).
- React/Vue component: dùng Testing Library, query theo role/label/text (`getByRole`, `getByLabelText`), tương tác bằng `user-event`.
- Playwright:
  - Dùng locator theo role/label/test-id, web-first assertion (`await expect(locator).toBeVisible()`).
  - Không dùng `waitForTimeout` cố định.
  - Mỗi test tự tạo dữ liệu, không phụ thuộc test khác.
- Không viết snapshot lớn thay cho assertion cụ thể. Không có test rỗng, không `skip`/`only` sót lại.
- Dùng factory/fixture có sẵn của dự án nếu có; dữ liệu test ngắn, có ý nghĩa.

## 5. Chạy và kiểm chứng

- Chạy đúng lệnh của dự án (`npm test`, `npx vitest run <file>`, `npx jest <file>`, `npx playwright test <file>`...), ưu tiên chạy riêng file vừa viết trước rồi chạy toàn bộ.
- Có coverage script thì chạy và báo % cho file liên quan.
- Test fail:
  - **Do test viết sai** → sửa test.
  - **Do code có bug thật** → **không sửa code**. Để test thể hiện behavior đúng mong đợi (đánh dấu `it.fails` / `test.fail` hoặc ghi chú rõ) và báo cho người dùng quyết định.
- Không sửa code production để "cho dễ test". Nếu code khó test (cần tách dependency), đề xuất thay vì tự làm.

## 6. Báo cáo (ngắn gọn)

- File test đã tạo/sửa (link file:dòng) và số test theo nhóm: happy path / edge case / error.
- Lệnh đã chạy, kết quả pass/fail, coverage nếu có.
- Bug phát hiện được (nếu có) kèm test tái hiện.
- Case chưa test được và lý do (thiếu môi trường, cần dữ liệu thật, cần quyết định nghiệp vụ...).
