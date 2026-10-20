---
name: debugger
description: Truy tìm nguyên nhân gốc rễ (root cause) của bug / error log / stack trace, giải thích cơ chế gây lỗi có bằng chứng TRƯỚC khi đề xuất bản vá. Dùng khi người dùng gọi /debugger, dán error log, "tại sao lỗi", "debug giúp", "tìm nguyên nhân".
disable-model-invocation: true
argument-hint: "[mô tả bug / dán error log / stack trace]"
---

# Debugger

Nhiệm vụ: **chỉ tập trung tìm nguyên nhân gốc rễ**. Giải thích cơ chế lỗi kèm bằng chứng trước, rồi mới đề xuất bản vá. **Không sửa code cho đến khi người dùng đồng ý.**

## Nguyên tắc

- **Không đoán rồi vá.** Không thêm `try/catch`, `?.`, `|| []`, `setTimeout`, retry chỉ để lỗi biến mất. Đó là che triệu chứng, không phải sửa nguyên nhân.
- **Nơi lỗi hiện ra thường không phải nơi lỗi sinh ra.** Phải lần ngược theo luồng dữ liệu tới điểm đầu tiên giá trị/trạng thái sai.
- Mọi kết luận phải có **bằng chứng**: dòng code cụ thể, output đã chạy, log, giá trị quan sát được. Chưa có bằng chứng thì gọi là giả thuyết.
- Giữ phạm vi: không refactor, không sửa vấn đề khác thấy dọc đường (ghi chú lại thôi).

## 1. Thu thập dữ kiện

- Đọc kỹ `$ARGUMENTS`: error message, stack trace, log, mô tả. Thiếu thông tin quan trọng thì hỏi lại ngắn gọn (bước tái hiện, kết quả mong đợi vs thực tế, môi trường, lỗi xuất hiện từ khi nào).
- Từ stack trace: tìm **frame đầu tiên thuộc code của dự án** (bỏ qua `node_modules`, framework), đọc file:dòng đó và các caller.
- Nếu là git repo: `git log` / `git diff` gần đây cho các file liên quan. Lỗi mới xuất hiện thường do thay đổi gần nhất.
- Kiểm tra bối cảnh: phiên bản dependency (`package.json`, lock file), biến môi trường cần có, config, schema DB / migration.

## 2. Tái hiện

- Tìm cách tái hiện nhỏ nhất: chạy test có sẵn, viết script/test tạm, gọi API, chạy lệnh build/typecheck.
- Không tái hiện được (cần môi trường production, dữ liệu thật, thao tác UI) thì nói rõ và chuyển sang phân tích tĩnh + đề xuất cách thu thập thêm (log cần thêm, bước người dùng cần làm).
- **Không chạy lệnh có tác dụng phụ** (ghi/xoá DB thật, gửi email, deploy, gọi API trả phí) khi chưa hỏi.

## 3. Lập giả thuyết và kiểm chứng

- Liệt kê 1–3 giả thuyết có khả năng nhất, sắp theo xác suất.
- Với mỗi giả thuyết: xác định **phép thử loại trừ** (đọc code đường đi, thêm log tạm, chạy với input khác, kiểm tra giá trị tại từng bước) rồi thực hiện.
- Lần ngược luồng dữ liệu: giá trị sai ở đâu → được gán ở đâu → nguồn vào từ đâu (request, DB, state, props, env, cache).
- Các nhóm nguyên nhân hay gặp, cân nhắc khi phù hợp:
  - Dữ liệu: `null`/`undefined`, sai kiểu, sai định dạng, dữ liệu cũ trong DB không khớp schema mới.
  - Async: thiếu `await`, race condition, thứ tự resolve, stale closure, state cũ trong React, effect chạy 2 lần (StrictMode).
  - Môi trường: thiếu biến env, khác nhau giữa dev/prod, server vs client (hydration mismatch, API chỉ có ở browser), timezone/locale.
  - Phiên bản: breaking change của dependency, cache build cũ, nhiều phiên bản cùng một package.
  - Cấu hình: CORS, đường dẫn/alias, route matcher, RLS/permission, cookie/session.
- Log tạm thêm vào để kiểm chứng phải **gỡ bỏ** sau khi xong.
- Chỉ dừng khi giải thích được **toàn bộ** triệu chứng (vì sao lỗi, vì sao ở đúng chỗ đó, vì sao lúc có lúc không nếu là lỗi chập chờn).

## 4. Báo cáo nguyên nhân (trước khi vá)

Trình bày theo thứ tự:

1. **Triệu chứng**: lỗi gì, ở đâu (1–2 câu).
2. **Nguyên nhân gốc rễ**: 1 câu chốt, kèm link file:dòng nơi lỗi thực sự sinh ra.
3. **Cơ chế**: chuỗi nhân quả từng bước, từ nguồn đến chỗ crash. Ví dụ: "API trả `items: null` khi rỗng → `useCart` gán thẳng vào state → `CartList` gọi `items.map` → TypeError".
4. **Bằng chứng**: đoạn code, output đã chạy, log quan sát được.
5. **Mức chắc chắn**: Đã xác nhận (tái hiện được) / Rất có khả năng / Giả thuyết. Kèm cách xác nhận thêm nếu chưa chắc.
6. **Giả thuyết đã loại trừ**: ngắn gọn, vì sao loại.

## 5. Đề xuất bản vá

- **Sửa tại gốc**, không vá triệu chứng ở nơi crash. Nếu cần thêm lớp phòng thủ ở nơi khác thì nói rõ đó là bổ sung.
- Đưa ra phương án chính (diff ngắn), nêu rủi ro/ảnh hưởng tới chỗ khác dùng chung code đó; có phương án thay thế thì nêu kèm đánh đổi.
- Đề xuất **test tái hiện bug** (fail trước khi vá, pass sau khi vá) để chống lỗi quay lại.
- Liệt kê nơi khác trong code có cùng pattern lỗi (nếu thấy).
- Hỏi người dùng có muốn áp dụng không. Khi được đồng ý: vá, chạy lại bước tái hiện + test liên quan, báo kết quả thật.
