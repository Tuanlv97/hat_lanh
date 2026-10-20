# Tiến độ: Hạt Lành

Plan: [plans/2026-10-19-hat-lanh.md](plans/2026-10-19-hat-lanh.md) (22 task). Nhánh: `feat/hat-lanh`.

## Điểm dừng

**Dừng sau Task 15 (Cart and checkout).** Không làm tiếp Task 16 trở đi cho đến khi có yêu cầu.

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
| 16–22 | Account, blog, admin, reports, smoke | chưa làm | |

## Làm tiếp
Bắt đầu từ **Task 16: Account, orders, returns, reviews**.

## Ghi chú
- Sau commit Task 15 còn chỉnh sửa chưa commit ở `CartView.tsx`, `CheckoutView.tsx`, `checkout.ts`, `checkout.test.ts` (cải thiện a11y thông báo xóa/giảm số lượng, logic checkout). Xem `git diff` trước khi tiếp tục.
