---
name: refactor
description: Refactor / clean-code cho đoạn code vừa viết - chia nhỏ function/component quá dài, loại bỏ trùng lặp (DRY) mà KHÔNG thay đổi logic/behavior. Dùng khi người dùng gọi /refactor, "clean code", "refactor lại", "tách nhỏ function".
disable-model-invocation: true
argument-hint: "[file hoặc thư mục - bỏ trống = code vừa viết]"
---

# Refactor / Clean Code

Nhiệm vụ: rà soát code vừa viết, chia nhỏ function/component quá dài, tối ưu DRY. **Behavior phải giữ nguyên 100%.**

## 1. Xác định phạm vi

- Có tham số (`$ARGUMENTS`) → chỉ refactor file/thư mục đó.
- Không có → code vừa viết/sửa: ưu tiên `git diff` + `git diff --cached` (và file mới chưa track); nếu không phải git repo thì dùng các file đã tạo/sửa trong cuộc hội thoại này.
- Không tự mở rộng sang code cũ không liên quan. Nếu phạm vi không rõ, hỏi lại trước khi sửa.

## 2. Chốt baseline trước khi sửa

- Tìm cách kiểm chứng sẵn có: test, typecheck, lint, build (xem `package.json`, `Makefile`, `pyproject.toml`, `*.csproj`...).
- Chạy chúng và ghi lại kết quả ban đầu. Test đang fail sẵn thì ghi nhận, không sửa.
- Không có test: đọc kỹ để nắm input/output, side effect, thứ tự gọi, nhánh lỗi của từng hàm sẽ đụng tới.

## 3. Tìm vấn đề

| Dấu hiệu | Ngưỡng tham khảo | Hướng xử lý |
|---|---|---|
| Function quá dài | > ~40 dòng hoặc làm > 1 việc | Extract function theo từng bước/ý nghĩa |
| Component quá dài | > ~150 dòng JSX/template, nhiều trách nhiệm | Tách sub-component, custom hook, helper thuần |
| Lồng sâu | > 3 cấp if/loop | Guard clause / early return, tách hàm |
| Trùng lặp | Cùng logic xuất hiện ≥ 3 lần (2 lần nếu dài và chắc chắn cùng ý nghĩa) | Gom về 1 hàm/hằng/component dùng chung |
| Magic value | Số/chuỗi lặp lại hoặc khó hiểu | Đặt hằng có tên |
| Tên khó hiểu | Biến/hàm nội bộ đặt tên mơ hồ | Đổi tên (chỉ trong phạm vi nội bộ) |

Hai đoạn code trông giống nhau nhưng thay đổi vì lý do khác nhau thì **không** gộp. Trùng lặp vẫn tốt hơn abstraction sai.

## 4. Refactor từng bước nhỏ

Mỗi bước chỉ một thay đổi (extract, rename, gộp trùng lặp...), sau đó kiểm chứng lại.

**Bắt buộc giữ nguyên:**
- Public API: tên export, signature, kiểu trả về, props của component, route, tên field trong JSON/DB.
- Thứ tự side effect (I/O, gọi API, log, mutate state), thứ tự async/await, xử lý lỗi và message lỗi.
- Giá trị mặc định, xử lý `null`/`undefined`/rỗng, edge case.
- React/Vue: thứ tự gọi hook, dependency array, key của list, memo/callback đang có.
- Hiệu năng: không biến O(n) thành O(n²), không thêm re-render, không gọi lặp tác vụ nặng.

**Không làm:**
- Không thêm thư viện, không đổi kiến trúc, không đổi style format toàn file.
- Không tạo abstraction "để sau này dùng" (generic hoá, config hoá quá mức).
- Không tách thành quá nhiều hàm vụn chỉ 1–2 dòng gọi một lần, khiến đọc khó hơn.
- **Không lén sửa bug.** Thấy bug thì giữ nguyên behavior và liệt kê ở báo cáo.

Giữ đúng convention của codebase: cách đặt tên, cấu trúc thư mục, mật độ comment, kiểu export.

## 5. Kiểm chứng

- Chạy lại đúng các lệnh ở bước 2; kết quả phải bằng hoặc tốt hơn baseline.
- Có fail mới → sửa hoặc hoàn tác bước gây ra, không được bỏ qua.
- Không có công cụ kiểm chứng → tự rà lại diff, đối chiếu từng hàm cũ/mới, và nói rõ trong báo cáo là chưa có test xác nhận.

## 6. Báo cáo (ngắn gọn)

- Đã thay đổi gì: mỗi mục 1 dòng, kèm link file:dòng (ví dụ: tách `handleSubmit` 80 dòng thành `validateForm` + `buildPayload`).
- Kết quả kiểm chứng: lệnh đã chạy, pass/fail.
- Vấn đề phát hiện nhưng **không sửa** vì sẽ đổi behavior (bug, edge case nghi ngờ) → đề xuất để người dùng quyết định.
