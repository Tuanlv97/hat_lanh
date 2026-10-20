# Tiến độ: Hạt Lành

Plan: [plans/2026-10-19-hat-lanh.md](plans/2026-10-19-hat-lanh.md) (22 task). Nhánh: `feat/hat-lanh`.

## Điểm dừng

Đã xong Task 19. Task 20 trở đi (blog/kiểm duyệt/người dùng, báo cáo, smoke) chưa làm.

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
| 19 | Admin: products, orders, returns | xong | (commit Task 19) |
| 20–22 | Admin blog/moderation/users, reports, smoke | chưa làm | |

## Làm tiếp
Bắt đầu từ **Task 20: Blog, moderation, users screens**.

## Ghi chú
- Trang `ve-chung-toi` còn các chỗ giữ chỗ `[Điền …]` để chủ shop tự điền.
- Chưa kiểm tra bằng trình duyệt luồng bình luận khi đã đăng nhập (API có test e2e).
- Admin (Task 19) chưa được click thử trên trình duyệt; đã kiểm tra bằng tsc, build và gọi các API mà màn hình dùng.
