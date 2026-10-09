# NHẬT KÝ QUYẾT ĐỊNH KIẾN TRÚC & TÀI LIỆU (ARCHITECTURAL & DOCUMENTATION DECISIONS)

## Quyết định 1: Ngôn ngữ Báo cáo là 100% Tiếng Việt Chuẩn Học Thuật
- **Lý do:** Báo cáo đồ án tốt nghiệp tại các trường đại học Việt Nam yêu cầu ngôn ngữ chính luận, chuẩn xác ngữ nghĩa.
- **Quy tắc:** Mọi đề mục, bảng, hình ảnh, văn bản giải thích đều dùng tiếng Việt. Các thuật ngữ công nghệ chuẩn quốc tế (React, Vite, Express, MongoDB, FastEmbed, ONNX, Webhook IPN, FSM...) được giữ nguyên để đảm bảo tính chuyên môn cao.

## Quyết định 2: Tách biệt Rạch ròi Giữa Code Thực Tế và Mẫu Tài Liệu Cũ
- **Phát hiện:** Bản nháp cũ có nhắc tới Tailwind CSS, Laravel, PHP, WordPress.
- **Quyết định:** Loại bỏ hoàn toàn 100% những công nghệ không tồn tại trong source code. Xác định chính xác: Frontend dùng **React 19 + Bootstrap 5 + React-Bootstrap**, Backend dùng **Node.js Express + MongoDB Atlas Native Driver**, AI dùng **Python FastAPI + FastEmbed (ONNX) + Gemini Flash**.

## Quyết định 3: Tách Sơ đồ ERD theo Phân hệ (Modular ERD)
- **Lý do:** Hệ thống có 20 collections. Một sơ đồ ERD nhồi nhét 20 bảng vào một trang giấy sẽ gây vỡ nét, chữ bé và khó theo dõi.
- **Quyết định:** Chia thành 3 sơ đồ ERD phân hệ rõ ràng:
  1. Phân hệ Giao dịch & Bán hàng (Core Commerce): `users`, `orders`, `cart`, `paymentAttempts`, `vouchers`, `userVouchers`.
  2. Phân hệ Danh mục & Sản phẩm (Catalog & Content): `products`, `catenogies`, `LaptopUser`, `eventList`, `appliances`, `reviews`, `news`.
  3. Phân hệ Tương tác & Vận hành (Engagement & Operations): `chatMessages`, `notifications`, `serviceRequests`, `wishlist`.

## Quyết định 4: Phân định Rõ Ràng Môi trường Sandbox và Production
- **Quyết định:** Tài liệu ghi nhận chính xác việc tích hợp cổng thanh toán VNPAY và MoMo đang hoạt động trên môi trường Sandbox của nhà cung cấp, sử dụng thẻ test và tài khoản test để kiểm thử nghiệm thu.

## Quyết định 5: Chiến lược Screenshot As-Built
- **Quyết định:** Trong Chương 4, mọi vị trí ảnh được đánh dấu mã `UI-xx` kèm chú thích chi tiết, trạng thái kiểm thử (`NEED_SCREENSHOT` hoặc đường dẫn ảnh thực). Không tạo ảnh giả lập.
