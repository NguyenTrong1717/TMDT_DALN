# Hướng dẫn chạy MoMo Sandbox (All-in-One V2)

Tích hợp cổng thanh toán MoMo Sandbox V2 cho phép khách hàng thanh toán đơn hàng bằng cách **quét mã QR** hoặc **đăng nhập ví MoMo Sandbox**. 

Cơ chế bảo mật tuân thủ chuẩn MoMo V2:
- Khởi tạo phiên thanh toán ký số **HMAC-SHA256**.
- `Return URL` (chuyển hướng người dùng) và `IPN URL` (webhook máy chủ gọi ngầm) đều được kiểm tra chữ ký nghiêm ngặt trước khi xác nhận đơn.

---

## 1. Cấu hình Sandbox trong `.env`

Bộ thông tin thử nghiệm mặc định của MoMo Sandbox đã được điền sẵn trong `.env`:

```env
# MoMo Sandbox Payment Gateway (All-in-one V2)
MOMO_PARTNER_CODE=MOMOBKUN20180529
MOMO_ACCESS_KEY=klm05TvNBzhg7h7j
MOMO_SECRET_KEY=at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa
MOMO_API_URL=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_RETURN_URL=http://127.0.0.1:3000/api/payments/momo/return
MOMO_IPN_URL=http://127.0.0.1:3000/api/payments/momo/ipn
FRONTEND_URL=http://localhost:5173
```

> **Lưu ý bảo mật:** `MOMO_SECRET_KEY` chỉ được lưu và đọc ở phía Node.js Backend, tuyệt đối không dùng tiền tố `VITE_` và không đưa ra Frontend.

---

## 2. Return URL và IPN URL

- **Return URL (`GET /api/payments/momo/return`)**:
  - Khi khách thanh toán trên cổng MoMo, MoMo điều hướng trình duyệt của khách quay về đường dẫn này.
  - Backend xác thực chữ ký của MoMo. Khi chạy local (không có IPN public), backend sẽ tự động hỗ trợ chốt trạng thái `paid` tại bước này nếu chữ ký hợp lệ và kết quả thành công (`resultCode = 0`).
  - Sau đó, backend chuyển tiếp trình duyệt về `http://localhost:5173/payment-result?token=...`.

- **IPN URL (`POST /api/payments/momo/ipn`)**:
  - Máy chủ MoMo gọi ngầm webhook Server-to-Server để gửi thông báo kết quả chính thức.
  - Khi deploy lên internet, IPN URL cần là domain HTTPS public (hoặc qua cloudflared / ngrok khi test webhook ngầm).

---

## 3. Khởi động dự án

Chạy hệ thống qua lệnh npm quen thuộc:

```powershell
# Chạy đầy đủ Frontend + Backend + RAG AI
npm run dev

# Hoặc chạy riêng lẻ:
npm run server       # Backend MongoDB (cổng 3000)
npm run dev:vite     # Frontend React (cổng 5173)
```

---

## 4. Trải nghiệm thanh toán trên Web

1. Mở trang web `http://localhost:5173`.
2. Đăng nhập tài khoản và thêm sản phẩm vào giỏ hàng (hoặc bấm **Mua ngay**).
3. Tại trang **Thanh toán (`/checkout`)**:
   - Chọn phương thức: **Ví điện tử MoMo (Quét mã QR)**.
   - Nhập thông tin người nhận (Họ tên, SĐT, Địa chỉ).
   - Bấm nút **Đặt hàng ngay**.
4. Website sẽ tự động chuyển hướng bạn sang cổng thanh toán **MoMo Sandbox**:
   - Giao diện MoMo Sandbox hiển thị mã QR và thông tin đơn hàng.
   - Bạn có thể quét mã QR giả lập hoặc bấm chọn xác nhận thanh toán thử nghiệm.
5. Sau khi thanh toán xong, hệ thống chuyển về trang `/payment-result`:
   - Hiển thị **Thanh toán thành công!**.
   - Trạng thái đơn được cập nhật `paid`, trừ số lượng tồn kho tự động.

---

## 5. Chạy kiểm thử tự động (Unit Tests)

Dự án đã tích hợp sẵn bộ kiểm thử tự động cho MoMo:

```powershell
# Chạy test riêng cho MoMo
npm run test:momo

# Chạy test cả VNPAY và MoMo
npm run test:payments
```

Bộ test tự động kiểm tra:
- Tạo chữ ký HMAC-SHA256 đúng chuẩn MoMo V2.
- Xác thực chữ ký hợp lệ và phát hiện chữ ký bị sửa đổi/giả mạo.
- Xử lý Webhook IPN, chốt đơn `paid`, trừ kho và trừ voucher.
- Xử lý các trường hợp hủy giao dịch hoặc lỗi thanh toán an toàn.
