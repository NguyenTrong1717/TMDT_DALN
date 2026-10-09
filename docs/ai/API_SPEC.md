# HỒ SƠ ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (API SPECIFICATION)
*Nguồn kiểm chứng: `server_mongodb.mjs` (Express.js), `rag_service/main.py` (FastAPI)*

---

## 1. DANH MỤC API GIAO DỊCH & THANH TOÁN (NODE.JS - PORT 3000)

### 1.1. `POST /api/orders/checkout`
* **Mục đích:** Xử lý đặt hàng theo phương thức thanh toán khi nhận hàng (COD).
* **Xác thực:** Bắt buộc Header `x-user-id`.
* **Tham số Body:**
  ```json
  {
    "requestId": "UUID-v4-string",
    "paymentMethod": "cod",
    "customer": { "fullName": "Nguyen Van A", "phone": "0987654321", "address": "HN" },
    "voucherCode": "SALE50K"
  }
  ```
* **Thao tác CSDL:**
  1. Kiểm tra Idempotency qua `idempotencyKey = requestId` trong bảng `orders`.
  2. Bảng `orders`: Thêm mới bản ghi với `paymentStatus: "unpaid"`, `status: "pending"`.
  3. Bảng `cart`: Xóa các item đã mua của người dùng.
  4. Bảng `userVouchers`: Đánh dấu `used: true`.
  5. Bảng sản phẩm (`products`, v.v.): Cập nhật giảm `stock`, tăng `soldCount`.
* **Phản hồi Thành công:** HTTP 201 Created kèm dữ liệu đơn hàng và `lookupToken`.
* **Xử lý Lỗi:** HTTP 400 (Thiếu requestId/dữ liệu không hợp lệ), HTTP 401 (Chưa đăng nhập), HTTP 409 (Mã requestId trùng lặp).
* **Component gọi:** `src/components/AdminDashboash/Checkout.jsx`.

### 1.2. `POST /api/payments/vnpay/create`
* **Mục đích:** Khởi tạo giao dịch thanh toán trực tuyến qua cổng VNPAY Sandbox.
* **Xác thực:** Bắt buộc Header `x-user-id`.
* **Tham số Body:** `requestId`, `customer`, `voucherCode`, `paymentMethod: "vnpay"`.
* **Thao tác CSDL:**
  1. Tạo bản ghi mới trong `orders` với `status: "pending"`, `paymentStatus: "pending"`.
  2. Tạo bản ghi mới trong `paymentAttempts` ghi nhận `txnRef`, `amount`, `status: "pending"`, thời gian hết hạn (`expiresAt`).
* **Phản hồi Thành công:**
  ```json
  {
    "orderId": "65b...",
    "orderCode": "171289...",
    "lookupToken": "sec_...",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=..."
  }
  ```
* **Component gọi:** `src/components/AdminDashboash/Checkout.jsx`.

### 1.3. `GET /api/payments/vnpay/return`
* **Mục đích:** Tiếp nhận điều hướng trình duyệt của khách hàng sau khi thanh toán xong trên giao diện VNPAY.
* **Cơ chế Bảo mật:** Xác minh chữ ký `vnp_SecureHash` bằng thuật toán HMAC-SHA512 với khóa bí mật `VNP_HASH_SECRET`.
* **Hành vi Xử lý:**
  - Nếu chữ ký hợp lệ và `vnp_ResponseCode === "00"`: Hoàn tất đơn hàng (`fulfillOrder`), cập nhật `orders.paymentStatus = "paid"`, `paymentAttempts.status = "paid"`.
  - Nếu thất bại: Đánh dấu `failed`.
  - Thực hiện HTTP 302 Redirect về Frontend: `/payment-result?returned=1&token=...&responseCode=...`.
* **Component tiếp nhận:** `src/pages/PaymentResult.jsx`.

### 1.4. `GET /api/payments/vnpay/ipn`
* **Mục đích:** Webhook ngầm từ Server VNPAY sang Server HCore để xác nhận kết quả thanh toán thực tế (Chốt chặn bảo mật không phụ thuộc vào trình duyệt người dùng).
* **Phản hồi cho VNPAY:**
  - Thành công: `{ "RspCode": "00", "Message": "Confirm Success" }`
  - Đơn hàng không tồn tại: `{ "RspCode": "01", "Message": "Order not found" }`
  - Sai chữ ký: `{ "RspCode": "97", "Message": "Checksum failed" }`

### 1.5. `POST /api/payments/momo/create`
* **Mục đích:** Khởi tạo phiên thanh toán ví điện tử MoMo Sandbox (Capture Wallet).
* **Xác thực:** Header `x-user-id`.
* **Thuật toán Chữ ký:** HMAC-SHA256 kết hợp `accessKey` và `secretKey`.
* **Phản hồi:** Trả về `paymentUrl`, `qrCodeUrl`, `deeplink`.

### 1.6. `POST /api/payments/momo/ipn`
* **Mục đích:** Webhook Server-to-Server từ MoMo thông báo kết quả giao dịch. Kiểm tra chữ ký HMAC-SHA256, chuyển trạng thái đơn hàng sang `paid`. Phản hồi HTTP 200 hoặc HTTP 204.

### 1.7. `GET /api/payments/result/:lookupToken`
* **Mục đích:** Cho phép Frontend tra cứu kết quả thanh toán an toàn mà không làm lộ ID người dùng hay thông tin nhạy cảm khác.

---

## 2. DANH MỤC API QUẢN TRỊ HỆ THỐNG (ADMIN API)

### 2.1. `GET /api/admin/orders`
* **Quyền hạn:** Bắt buộc `role === 'admin'`.
* **Chức năng:** Trả về toàn bộ danh sách đơn hàng trong hệ thống kèm thông tin thanh toán.
* **Component gọi:** `src/components/AdminDashboash/AdminOrders.jsx`.

### 2.2. `PATCH /api/admin/orders/:orderId/status`
* **Quyền hạn:** Bắt buộc `role === 'admin'`.
* **Mục đích:** Thay đổi trạng thái đơn hàng tuân theo Máy trạng thái hữu hạn (FSM):
  - `pending` -> `confirmed` hoặc `cancelled`
  - `confirmed` -> `shipping` hoặc `cancelled`
  - `shipping` -> `completed`
* **Ràng buộc nghiệp vụ:**
  - Nếu đơn hàng là VNPAY chưa thanh toán (`paymentStatus !== "paid"`), chặn không cho duyệt sang `shipping` (HTTP 409).
  - Nếu đơn hàng VNPAY đã thanh toán bị hủy, yêu cầu quy trình hoàn tiền trước.
  - Khi đơn hàng bị hủy (`cancelled`), tự động gọi `releaseCancelledOrder` hoàn lại tồn kho (`stock`).

### 2.3. `DELETE /api/admin/orders/:orderId`
* **Quyền hạn:** Bắt buộc `role === 'admin'`.
* **Quy tắc:** Chỉ được phép xóa đơn hàng đã `completed` hoặc `cancelled`. Tuyệt đối cấm xóa đơn hàng VNPAY để phục vụ đối soát tài chính.

---

## 3. DANH MỤC API RESTFUL CRUD TỔNG QUÁT (GENERIC RESOURCES)
* `GET /:resource`: Lấy danh sách, hỗ trợ regex tìm kiếm `q`, lọc theo thuộc tính, sắp xếp `_sort` và phân trang `_limit`, `_page`.
* `GET /:resource/:id`: Lấy chi tiết bản ghi theo id.
* `POST /:resource`: Thêm mới bản ghi.
* `PATCH /:resource/:id`: Cập nhật từng phần (Partial Update).
* `PUT /:resource/:id`: Thay thế toàn bộ bản ghi.
* `DELETE /:resource/:id`: Xóa bản ghi.
* *Middleware bảo vệ:* Chặn tuyệt đối truy cập trực tiếp tới các resource thanh toán nhạy cảm (`isProtectedPaymentResource`).

---

## 4. DANH MỤC API AI RAG SERVICE (PYTHON FASTAPI - PORT 8000)

### 4.1. `GET /api/health`
* **Mục đích:** Health check dịch vụ AI, kiểm tra trạng thái nạp mô hình FastEmbed ONNX trong bộ nhớ RAM.

### 4.2. `POST /api/chat`
* **Body:**
  ```json
  {
    "userQuery": "Tư vấn cho mình laptop gaming tầm giá 20 triệu",
    "currentUser": { "fullName": "Nguyen Van A" },
    "apiKey": null
  }
  ```
* **Quy trình Thực thi:**
  1. Chạy 3 hàm kiểm duyệt an toàn (`check_pii_security`, `check_jailbreak`, `check_off_topic`).
  2. Nạp catalog sản phẩm qua `fetch_store_catalog()`.
  3. Tính toán độ tương đồng Vector bằng mô hình FastEmbed `bge-small-en-v1.5` (384-dim).
  4. Tạo System Prompt giàu ngữ cảnh (Augmented Context).
  5. Gọi Gemini LLM (`gemini-2.5-flash` / `gemini-1.5-flash`) sinh câu trả lời tự nhiên.
  6. Nếu mất kết nối Internet, tự động chuyển đổi sang Local Template Fallback.
* **Component gọi:** `src/Chat_bot/ChatBot.jsx`.
