# Hướng dẫn chạy VNPAY Sandbox

Tích hợp này chỉ dùng API PAY 2.1.0 trên môi trường Sandbox. `Return URL` đi qua
backend để kiểm tra chữ ký rồi mới chuyển về React. Chỉ `IPN URL` hợp lệ mới cập
nhật `paymentStatus=paid`.

## 1. Lấy cấu hình Sandbox

1. Đăng ký merchant test tại <https://sandbox.vnpayment.vn/devreg/>.
2. Sao chép `.env.example` thành `.env` (không commit file này).
3. Điền cấu hình được VNPAY cấp:

```env
VNP_TMN_CODE=ma_website_sandbox
VNP_HASH_SECRET=chuoi_bi_mat_sandbox
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://127.0.0.1:3000/api/payments/vnpay/return
FRONTEND_URL=http://localhost:5173
```

`VNP_HASH_SECRET` chỉ được đọc tại Node backend, không dùng tiền tố `VITE_` và
không được đưa vào React. `.gitignore` hiện đã bỏ qua `.env`.

## 2. Return URL và IPN URL

- Return URL: URL trình duyệt quay về, trong project là
  `https://TEN-MIEN-BACKEND/api/payments/vnpay/return`.
- IPN URL: server VNPAY gọi trực tiếp, đăng ký trong cấu hình merchant là
  `https://TEN-MIEN-BACKEND/api/payments/vnpay/ipn`.

Khi chạy local, Return có thể dùng localhost vì đây là chuyển hướng trên trình
duyệt. IPN bắt buộc là HTTPS public để máy chủ VNPAY truy cập được. Hãy cấu hình
reverse proxy hoặc tunnel có rule chỉ chuyển tiếp chính xác đường dẫn
`/api/payments/vnpay/ipn` (và `/api/payments/vnpay/return` nếu muốn Return cũng
dùng domain public) đến cổng 3000. Không mở thẳng toàn bộ cổng json-server ra
Internet vì các resource không liên quan như sản phẩm/người dùng vẫn là mock
CRUD. Nếu đổi Return sang domain public, cập nhật `VNP_RETURN_URL` rồi khởi động
lại server.

## 3. Chạy project

API đơn hàng/thanh toán dùng `http://127.0.0.1:3000`. Trên máy này,
`localhost:3000` qua IPv6 đang trả 404 cho các API nghiệp vụ, trong khi
`127.0.0.1:3000` nhận đúng backend. Nếu đã import Postman trước đó, đổi biến
`baseUrl` của collection thành `http://127.0.0.1:3000`.
Trong `.env`, đặt `VNP_RETURN_URL=http://127.0.0.1:3000/api/payments/vnpay/return`
và khởi động lại backend sau khi sửa cấu hình. Không chạy hai backend cùng cổng.

```powershell
npm run server
npm run dev:vite
```

Hoặc chạy toàn bộ frontend, JSON API và RAG:

```powershell
npm run dev:all
```

Node 22 đọc `.env` bằng `--env-file-if-exists=.env` trong script `npm run server`.

## 4. Thanh toán thử

Checkout chỉ có hai lựa chọn: **VNPAY** và **tiền mặt khi nhận hàng (COD)**.
Chọn VNPAY rồi bấm thanh toán sẽ mở cổng Sandbox. Trên cổng này, chọn
**Thẻ ATM / tài khoản ngân hàng → NCB** để thấy màn hình nhập thẻ như hình mẫu.
Website tự gọi API nên người mua không cần Postman.
Luồng chuyển hướng được mô tả trong [tài liệu PAY của VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

### Thử API bằng Postman

1. Điền khóa Sandbox trong `.env` theo mục 1, chạy `npm run server` và
   `npm run dev:vite` ở hai terminal.
2. Trong Postman chọn **Import**, chọn file
   `postman/VNPAY-Sandbox.postman_collection.json`.
3. Vào **Variables** của collection, điền `userId` của tài khoản demo đang dùng.
   `productId=1`, `fromTable=catenogies` là mẫu mua ngay; có thể đổi sang sản
   phẩm hợp lệ trong dữ liệu của bạn. Header `x-user-id` là cơ chế demo hiện tại.
4. Mở request **1. Tạo đơn và lấy paymentUrl**, bấm **Send**.
   Request gửi `POST http://127.0.0.1:3000/api/payments/vnpay/create` với
   **Body → raw → JSON** đã điền sẵn. Send sẽ tạo đơn thử trong `db.json`.
5. Sao chép `paymentUrl` từ response, dán vào thanh địa chỉ trình duyệt.
   Nhập thẻ trên trang VNPAY, không nhập thẻ trong Postman.
6. Sau khi thanh toán, request **2. Kiểm tra trạng thái sau thanh toán**
   truy vấn kết quả đã lưu tại backend. Cần IPN public như mục 2 để trạng thái
   chuyển sang `paid`; Postman không thay thế callback từ VNPAY.

Collection tự giữ `requestId`: gửi lại request 1 dùng cùng mã sẽ lấy lại đơn.
Muốn tạo đơn test mới, xóa giá trị `requestId` trong Variables rồi Send lại.
Không đưa `VNP_HASH_SECRET` vào collection. Lỗi 503 nghĩa là backend chưa có
khóa Sandbox; lỗi 401 nghĩa là chưa điền đúng tài khoản demo.

Theo trang demo chính thức của VNPAY Sandbox, giao dịch thành công có thể dùng:

- Ngân hàng: `NCB`
- Số thẻ: `9704198526191432198`
- Chủ thẻ: `NGUYEN VAN A`
- Ngày phát hành: `07/15`
- OTP: `123456`

Chỉ dùng dữ liệu thử nghiệm do VNPAY công bố, không nhập thẻ thật.

## 5. Chính sách đơn chờ thanh toán

- Đơn VNPAY giữ logic tồn kho và voucher trong 15 phút nhưng chưa trừ kho/chưa
  dùng voucher.
- IPN thành công mới trừ tồn kho, đánh dấu voucher và xử lý đúng snapshot giỏ
  hàng của đơn, đúng một lần.
- Reservation hết hiệu lực khi quá hạn hoặc lần thanh toán thất bại.
- Có thể thanh toán lại đơn chưa `paid`; mỗi lần có `vnp_TxnRef` mới nhưng không
  tạo thêm đơn hàng.
- Return đến trước IPN sẽ hiện “Đang xác nhận” và polling tối đa khoảng 40 giây.

## 6. Kiểm thử cục bộ

```powershell
npm run test:vnpay
npm run build
```

Test tự động mô phỏng callback đã ký và dùng dữ liệu trong bộ nhớ, không sửa
`db.json`. Đây không phải kiểm thử end-to-end với VNPAY. Muốn xác nhận Sandbox
thật cần merchant hợp lệ và IPN HTTPS public.

## Giới hạn xác thực hiện tại

Project đăng nhập bằng `localStorage`, nên header `x-user-id` chỉ là lớp kiểm tra
phù hợp cho demo và có thể bị giả mạo. Backend đã khóa CRUD tổng quát của
`orders`/`paymentAttempts` và dùng token tra cứu ngẫu nhiên cho trang kết quả,
nhưng trước khi production cần session hoặc JWT được backend xác minh.
