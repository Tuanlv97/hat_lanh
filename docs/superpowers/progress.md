# Tiến độ: Hạt Lành

Plan: [plans/2026-10-19-hat-lanh.md](plans/2026-10-19-hat-lanh.md) (22 task). Nhánh: `feat/hat-lanh`.

## Điểm dừng

Đã xong Task 20 và 21. Chỉ còn Task 22 (smoke test và bàn giao).

| Task | Nội dung | Trạng thái | Commit |
|---|---|---|---|
| 1 | Monorepo scaffold, local DB | xong | efe7846 |
| 2 | Shared validators, constants | xong | dd14af5 |
| 3 | Schema, address data, seed | xong | 5a191a1 |
| 4 | API bootstrap, test harness | xong | fbf4852 |
| 5 | Auth và users | xong | 0148cac |
| 6 | Address và catalog | xong | 13cceab |
| 7 | Orders, stock, notifications | xong | 6f79437 |
| 8 | Returns | xong | e683fdd |
| 9 | Moderation, reviews, comments | xong | f6c9c60 |
| 10 | Blog | xong | 4dc95ad |
| 11 | Reports | xong | 87e3dd4 |
| 12 | Docs seams và API readme | xong | ddf2f3d |
| 13 | Portal foundation | xong | 57c5b69 |
| 14 | Catalog và product detail | xong | 72d45f6, fbb72ac |
| 15 | Cart và checkout | xong | 5e2b887 |
| 16 | Account, orders, returns, reviews | xong | 2d2f887 |
| 17 | Blog và about | xong | a279061 |
| 18 | Admin foundation và login | xong | 387bbff |
| 19 | Admin: products, orders, returns | xong | 27d943b |
| 20–21 | Admin: blog, moderation, users, reports | xong | (commit Task 20-21) |
| 22 | Smoke test và bàn giao | chưa làm | |

## Làm tiếp
Bắt đầu từ **Task 22: End-to-end smoke and handover**.

## Ghi chú
- Trang `ve-chung-toi` còn các chỗ giữ chỗ `[Điền …]` để chủ shop tự điền.
- Chưa kiểm tra bằng trình duyệt luồng bình luận khi đã đăng nhập (API có test e2e).
- Admin (Task 19) chưa được click thử trên trình duyệt; đã kiểm tra bằng tsc, build và gọi các API mà màn hình dùng.
- Báo cáo kiểm thử bằng `scripts/verify-reports.mjs` (chạy với API đang chạy): so khớp số liệu báo cáo với tính lại độc lập từ đơn/hoàn trả thô, cộng delta chính xác từ dữ liệu mẫu; 23 kiểm tra đều đạt. Script tạo thêm 3 đơn và 1 hoàn trả vào DB dev.
- Task 20-21 chưa click thử trên trình duyệt (editor contentEditable, biểu đồ SVG).
