# Nguồn dữ liệu địa giới hành chính

- Dữ liệu: danh sách Tỉnh/Thành phố và Phường/Xã theo cơ cấu 2 cấp áp dụng từ 01/07/2025.
- Nguồn: Provinces Open API v2 (công khai) — https://provinces.open-api.vn/api/v2/?depth=2
- Ngày lấy dữ liệu: 2026-10-20
- Số lượng: 34 tỉnh/thành phố, 3321 phường/xã/đặc khu.
- Mã (code) được chuyển thành chuỗi, thêm số 0 ở đầu theo độ dài mã của Tổng cục Thống kê
  (tỉnh 2 chữ số, phường/xã 5 chữ số).

Cập nhật lại: từ thư mục gốc dự án chạy `npx tsx scripts/fetch-address.ts`.
Chủ shop có thể sửa trực tiếp `vn-address.json` nếu có thay đổi địa giới.
