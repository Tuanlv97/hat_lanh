# Thiết kế website bán thực phẩm chay thực dưỡng "Hạt Lành"

Ngày: 2026-10-19. Trạng thái: bản nháp chờ chủ shop duyệt.

Quy ước: nội dung **không đánh dấu** là điều chủ shop đã nói hoặc đã chọn. Mục ghi **[Quyết định của builder/Claude]** là lựa chọn của người soạn tài liệu, chủ shop chưa xác nhận từng cái.

## 1. Mục đích

Chủ shop bán thực phẩm chay thực dưỡng qua Facebook: gạo lứt, trà gạo lứt, trà gạo rang, mơ muối, mè rang, bột ngũ cốc, hạt óc chó... Khách hàng rộng, gồm người ăn chay tu hành, người giảm cân và người muốn phòng bệnh theo phương pháp thực dưỡng. Giao hàng toàn quốc.

Cần một website để khách xem sản phẩm đầy đủ (nguồn gốc xuất xứ, công dụng, mô tả, hình ảnh trực quan), đăng ký tài khoản và đặt hàng. Website cũng giúp khách tin tưởng hơn so với chỉ nhắn tin trên Facebook, và giúp chủ shop biết sản phẩm nào bán chạy, sản phẩm nào bị hoàn trả nhiều.

Giai đoạn này **chỉ chạy ở máy local**. Chưa cần chọn nơi đặt web, tên miền hay ngân sách.

## 2. Mục tiêu, không mục tiêu, điều không được xảy ra

**Mục tiêu**
- Khách xem sản phẩm, đặt hàng (có tài khoản hoặc vãng lai), theo dõi đơn, yêu cầu hoàn trả, đánh giá sản phẩm, đọc blog.
- Admin quản lý sản phẩm, đơn hàng, hoàn trả, blog, bình luận/đánh giá, người dùng và xem báo cáo.
- Chạy trọn vẹn ở local với 10 sản phẩm mẫu.

**Không mục tiêu (giai đoạn này)**
- Thanh toán online/VietQR (chỉ chừa chỗ, xem mục 8).
- Gửi Telegram thật, đăng nhập Google/Facebook thật (chỉ chừa chỗ, xem mục 8).
- Mã giảm giá, khuyến mãi, combo. Chỉ bán giá niêm yết.
- Phân quyền nhiều vai trò. Chỉ một admin.
- Tính phí vận chuyển tự động.
- Triển khai lên máy chủ, tên miền.
- Logo thật, ảnh thật của shop.

**Điều không được xảy ra (anti-goal)**
- Nội dung website nói sản phẩm "chữa bệnh/trị bệnh". Quảng cáo thực phẩm theo hướng thuốc có thể bị xử phạt. Nội dung công dụng viết theo hướng hỗ trợ, bổ sung dinh dưỡng.
- Bịa nguồn gốc xuất xứ. Dữ liệu mẫu để chỗ trống rõ ràng, ví dụ "[Điền vùng trồng / nhà cung cấp]", cho chủ shop điền sự thật.

## 3. Công nghệ

**[Quyết định của Claude, chủ shop nói "theo ý bạn"]**
- Ngôn ngữ: TypeScript cho cả back-end và hai giao diện.
- Back-end: Node.js 22 + NestJS.
- Database: PostgreSQL, truy cập qua Prisma. Chạy local bằng Docker (máy đã có Docker, Node 22, npm, Git; chưa có psql, không cần).
- Portal khách hàng: Next.js (cần SEO cho trang sản phẩm và blog).
- Trang quản trị: React + Vite.
- Quản lý monorepo: npm workspaces.
- Ngôn ngữ giao diện: tiếng Việt, tiền tệ VND.

## 4. Cấu trúc project

Chủ shop đã đồng ý cấu trúc này.

```
hat-lanh/
├─ apps/
│  ├─ api/      NestJS: back-end duy nhất (cổng 3000)
│  ├─ portal/   Next.js: web khách hàng (cổng 3001)
│  └─ admin/    React + Vite: trang quản trị (cổng 3002)
├─ packages/
│  └─ shared/   kiểu dữ liệu, kiểm tra hợp lệ (số điện thoại VN, form đặt hàng), hằng số trạng thái
├─ docker-compose.yml   PostgreSQL local
└─ docs/        thiết kế, ghi chú VietQR, hướng dẫn gắn Telegram và OAuth
```

Một back-end và một database dùng chung cho portal và trang quản trị. Trang quản lý người dùng nằm **trong** trang quản trị (menu Sản phẩm, Đơn hàng, Blog, Người dùng...), không phải ứng dụng riêng.

Back-end chia theo tính năng, mỗi tính năng là một module: `auth`, `users`, `products`, `orders`, `returns`, `reviews`, `comments`, `posts` (blog), `moderation`, `reports`, `uploads`, `address`, cộng hai module cắm sau `notifications` và `payments`. Mỗi module chia controller → service → Prisma. Giao diện chia theo `features/...` và dùng chung kiểm tra hợp lệ từ `shared`.

**[Quyết định của Claude]** Danh sách Tỉnh/Thành và Phường/Xã là file dữ liệu trong dự án, không gọi dịch vụ ngoài. Ảnh sản phẩm lưu thư mục local (sau này chuyển Azure Blob).

## 5. Portal khách hàng

**Sản phẩm.** Danh sách và trang chi tiết: ảnh, mô tả, nguồn gốc xuất xứ, công dụng, quy cách theo cân nặng với giá riêng, tồn kho, đánh giá. Mỗi sản phẩm có một hoặc nhiều quy cách.

**Giỏ hàng.** Khách vãng lai thêm vào giỏ và đặt nhanh được; giỏ lưu trong trình duyệt, khi đăng nhập thì gộp vào tài khoản.

**Tài khoản.** Khách có hai cách: (1) đăng nhập bằng Google hoặc Facebook (làm sẵn nút, xem mục 8); (2) đăng ký bằng email và số điện thoại kèm mật khẩu (chủ shop yêu cầu, dành cho khách không dùng Google/Facebook). Đăng nhập bằng email hoặc số điện thoại cùng mật khẩu. Số điện thoại kiểm tra đúng định dạng như khi đặt hàng, email và số điện thoại không được trùng tài khoản khác. **[Quyết định của Claude]** Vì hệ thống không gửi email/SMS nên **không** xác minh email/số điện thoại bằng mã; quên mật khẩu thì khách nhắn chủ shop và admin đặt lại mật khẩu trong mục Người dùng. Mật khẩu được băm, không lưu nguyên văn.

**Đặt hàng.** Khách vãng lai và khách đăng nhập đều phải nhập khi đặt hàng:
- Họ tên (bắt buộc).
- Số điện thoại (bắt buộc, kiểm tra đúng định dạng số di động Việt Nam, ví dụ đầu 03x, 05x, 07x, 08x, 09x, 10 số).
- Email (bắt buộc, kiểm tra hợp lệ).
- Địa chỉ: Tỉnh/Thành (bắt buộc), Phường/Xã (bắt buộc), địa chỉ chi tiết (bắt buộc). **[Quyết định của Claude]** chỉ 2 cấp vì Việt Nam đã bỏ cấp quận/huyện từ 01/07/2025.

Đơn hiển thị tổng tiền hàng. Phí vận chuyển **không** tính trên website, chủ shop báo riêng khi nhắn xác nhận; trang đặt hàng ghi chú "Phí vận chuyển sẽ được báo khi xác nhận đơn". Chưa thanh toán online: chủ shop nhắn lại khách để xác nhận đơn và cách thanh toán.

**Đơn hàng của tôi.** Khách đăng nhập xem lịch sử đơn và trạng thái. **[Quyết định của Claude]** Khách vãng lai tra cứu đơn bằng mã đơn + số điện thoại.

**Hoàn trả.** Khách gửi yêu cầu hoàn trả: chọn sản phẩm trong đơn, lý do.

**Đánh giá và bình luận.**
- Chỉ tài khoản đã đăng nhập và đã mua sản phẩm đó (đơn hoàn thành) mới được đánh giá sản phẩm.
- **[Quyết định của Claude]** Người đã đăng nhập bình luận được bài blog. Khách vãng lai chưa đánh giá được.
- **[Quyết định của Claude]** Khách vãng lai có thể tạo tài khoản sau; đơn cũ cùng email hoặc số điện thoại tự gắn vào tài khoản.
- Nội dung hiện ngay khi đăng. Nếu chứa từ nhạy cảm thì chuyển "chờ duyệt", admin duyệt mới hiện.

**Blog và giới thiệu.** Blog chia sẻ kinh nghiệm ăn chay thực dưỡng, phân loại theo chủ đề (ví dụ ăn chay tu hành, giảm cân, phòng bệnh), mỗi bài một trang riêng để Google tìm thấy. **[Quyết định của Claude]** cuối bài có thể gắn sản phẩm liên quan. Có trang "Về chúng tôi".

**Phong cách giao diện (chủ shop chọn mẫu B).** Cảm giác thanh tịnh: xanh lá nhạt (khoảng #A8C3A0, #EAF1E6) kết hợp vàng mật (khoảng #E8C27A), nền gần trắng, chữ xanh đen (khoảng #2E3B33), chữ không chân, bo góc mềm, tươi sáng, dễ đọc trên điện thoại. Làm responsive cho điện thoại.

## 6. Trang quản trị (một admin)

Đăng nhập bằng email và mật khẩu. **[Quyết định của Claude]** Tạo sẵn một tài khoản admin mẫu và hướng dẫn đổi mật khẩu. Chưa phân quyền, nhưng cấu trúc cho phép thêm vai trò sau.

Các mục:
- **Sản phẩm:** thêm/sửa/ẩn sản phẩm, quy cách, giá, tồn kho, ảnh, mô tả, nguồn gốc, công dụng.
- **Đơn hàng:** danh sách, chi tiết, đổi trạng thái. **[Quyết định của Claude]** Vòng đời: mới đặt → đã xác nhận → đang giao → hoàn thành; ngoài ra hủy và hoàn trả.
- **Hoàn trả:** nhận yêu cầu của khách, duyệt hoặc từ chối; admin cũng tự tạo phiếu hoàn trả (cho trường hợp khách nhắn Zalo/Facebook), ghi sản phẩm và lý do (ví dụ hàng hỏng, giao sai, khách đổi ý).
- **Tồn kho:** **[Quyết định của Claude]** đếm tồn kho theo quy cách; hết hàng thì portal báo "Hết hàng" và không cho đặt.
- **Blog:** soạn bài bằng trình soạn thảo có chèn ảnh, lưu nháp, hẹn ngày đăng, chủ đề.
- **Bình luận/đánh giá:** duyệt hàng chờ, ẩn hoặc xóa bất kỳ nội dung nào; quản lý danh sách từ nhạy cảm (thêm/bớt). Danh sách mẫu gồm từ tục, spam, link quảng cáo, số điện thoại, và các từ như "chữa khỏi", "trị bệnh".
- **Người dùng:** xem danh sách và thông tin người dùng.
- **Báo cáo:** sản phẩm bán chạy nhất, sản phẩm bị hoàn trả nhiều nhất kèm lý do, doanh thu theo thời gian.

## 7. Dữ liệu mẫu

10 sản phẩm: gạo lứt đỏ, gạo lứt đen, gạo lứt trắng, trà gạo lứt rang, trà gạo rang, mơ muối, mè rang, muối mè, bột ngũ cốc, hạt óc chó. Mỗi sản phẩm có vài quy cách theo cân nặng. **[Quyết định của Claude]** Quy cách và giá là giá mẫu để chủ shop sửa; ảnh minh họa tạm; mô tả và công dụng do Claude soạn theo hướng hỗ trợ; nguồn gốc để chỗ trống "[Điền vùng trồng / nhà cung cấp]".

## 8. Các phần "cắm sau" (làm sẵn chỗ, chưa tích hợp thật)

1. **Thông báo Telegram.** Module `notifications` có giao diện chung và bản hiện tại chỉ `console.log` ra terminal. Gọi khi có đơn mới và khi có yêu cầu hoàn trả mới. Sau này thay bằng Telegram bot (chủ shop tạo bot qua BotFather và cung cấp token). Chủ shop chọn Telegram, không dùng Zalo vì Zalo cá nhân không có cách gửi tự động chính thức.
2. **Đăng nhập Google/Facebook.** Làm sẵn nút. Môi trường dev dùng đăng nhập giả lập. Sau này điền key OAuth thật (Google Cloud, Facebook Developers). Lưu ý: Facebook thường phải xác minh ứng dụng mới cho người ngoài dùng.
3. **VietQR / thanh toán online.** Module `payments` để trống, kèm comment `TODO` có các lưu ý sau, chủ shop yêu cầu ghi rõ:
   - Cần liên kết VietQR/ngân hàng (hiện chưa có, đây là lý do chưa làm).
   - Cần cơ chế đối soát thanh toán (webhook hoặc kiểm tra giao dịch) để biết khách đã trả.
   - Khi nhận thanh toán thì phải chuyển trạng thái đơn tương ứng.
   - Luồng hiện tại (chủ shop nhắn xác nhận) phải vẫn dùng được song song.

   Nội dung này cũng ghi trong `docs/`.

## 8b. Các quyết định bổ sung của Claude (sau khi rà soát)

Chủ shop chưa xác nhận từng mục này, cần xem lại khi đọc.

- **Tồn kho:** trừ khi đơn được tạo; cộng lại khi đơn bị hủy. Chống bán vượt tồn khi nhiều người đặt cùng lúc (khóa dòng trong transaction). Hàng hoàn trả **không** tự cộng lại kho (thực phẩm, có thể đã mở); khi duyệt hoàn trả, admin chọn "nhập lại kho" hay không.
- **Hoàn trả và báo cáo:** tỷ lệ hoàn trả tính theo sản phẩm (số lượng hoàn / số lượng đã bán). Doanh thu tính theo ngày đơn hoàn thành, trừ phần đã hoàn, không gồm phí vận chuyển (vì phí do chủ shop báo riêng), múi giờ Asia/Ho_Chi_Minh, nhóm theo ngày, tuần, tháng. Đơn hủy không tính. Sản phẩm đã hoàn vẫn không chặn khách đã đánh giá trước đó.
- **Gắn đơn cũ vào tài khoản mới:** chỉ gắn tự động khi tài khoản đăng nhập bằng Google/Facebook và email do nhà cung cấp đó xác minh trùng email trên đơn. Tài khoản đăng ký bằng email/số điện thoại chưa được xác minh nên **không** tự gắn đơn cũ (tránh người lạ nhận đơn của người khác); khách vãng lai vẫn tra cứu đơn bằng mã đơn và số điện thoại. Khi đăng ký email/số điện thoại, đơn mới đặt lúc đã đăng nhập thì thuộc tài khoản đó bình thường.
- **Tra cứu đơn của khách vãng lai:** mã đơn ngẫu nhiên, khó đoán (không đánh số tuần tự), cộng số điện thoại, có giới hạn số lần thử.
- **Kiểm duyệt từ nhạy cảm:** so khớp không phân biệt hoa thường và không phân biệt dấu tiếng Việt; số điện thoại và link nhận bằng mẫu (pattern), từ khác so khớp theo từ. Áp dụng cho cả đánh giá và bình luận blog. Nội dung chờ duyệt chỉ tác giả thấy. Admin từ chối thì ẩn (không xóa hẳn); admin cũng có nút xóa.
- **Sản phẩm:** "ẩn" là xóa mềm; quy cách đã có đơn thì không xóa được, chỉ ẩn. Giá lưu số nguyên VND. Có phân loại sản phẩm (ví dụ gạo lứt, trà, gia vị, hạt) và ô tìm kiếm, lọc theo phân loại trong portal.
- **Blog:** lưu dạng HTML đã làm sạch (chống XSS). Bài nháp không hiện công khai; bài hẹn ngày đăng hiện khi tới giờ (kiểm tra thời gian lúc đọc, không cần tác vụ định kỳ).
- **Thông báo:** hệ thống **không** gửi email hay SMS cho khách; chủ shop tự nhắn lại khách (Zalo/Facebook/điện thoại). Email chỉ lưu để liên hệ.
- **Dữ liệu địa giới:** lấy theo cơ cấu sau 01/07/2025 (khoảng 34 tỉnh/thành và hơn 3.000 phường/xã) từ nguồn công khai và ghi rõ nguồn trong repo; chủ shop có thể cập nhật file này.

## 9. Ràng buộc và việc để builder quyết định

- Chạy local bằng một lệnh cho mỗi việc: khởi động database, migrate + seed, chạy ba ứng dụng.
- Mật khẩu, key, token nằm trong file môi trường, không hard-code, có file `.env.example`.
- Builder tự chọn thư viện giao diện, trình soạn thảo blog, cách upload ảnh local, cách quản lý phiên đăng nhập, chi tiết lược đồ database và cách kiểm thử, miễn đúng các mục trên.
- Kiểm thử: các phần nghiệp vụ quan trọng (kiểm tra số điện thoại, tạo đơn và trừ tồn kho, hoàn trả, kiểm duyệt từ nhạy cảm, báo cáo) cần có test.
