# HỒ SƠ ĐẶC TẢ TÍNH NĂNG VÀ MA TRẬN TRUY VẾT (FEATURE SPECIFICATION & TRACEABILITY)
*Nguồn kiểm chứng: `src/App.jsx`, `server_mongodb.mjs`, `rag_service/`*

---

## MA TRẬN TRUY VẾT TOÀN DIỆN (END-TO-END TRACEABILITY MATRIX)

| Mã Tính năng | Tên Tính năng | Giao diện Phụ trách (UI Component) | API Endpoint Xử lý | Bảng CSDL Liên quan (Database) | Dịch vụ Ngoài (External Service) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F01** | Xác thực & Quản lý Tài khoản | `Login.jsx`, `Register.jsx`, `Profile.jsx`, `EditProfile.jsx` | `POST /users`, `GET /users/:id`, `PATCH /users/:id` | `users` | Không |
| **F02** | Khám phá & Tìm kiếm Sản phẩm | `Home.jsx`, `SearchResults.jsx`, `CategoryPage.jsx`, `LaptopMenu.jsx` | `GET /products`, `GET /catenogies`, `GET /LaptopUser` | `products`, `catenogies`, `LaptopUser`, `eventList` | Không |
| **F03** | Chi tiết Sản phẩm & Đánh giá | `ProductDetail.jsx`, `ProductReviews.jsx` | `GET /products/:id`, `GET /reviews`, `POST /reviews` | `products`, `reviews` | Không |
| **F04** | Giỏ hàng & Danh sách Yêu thích | `Cart.jsx`, `Wishlist.jsx`, `WishlistFloatingWidget.jsx` | `GET /cart`, `POST /cart`, `DELETE /cart/:id`, `GET/POST /wishlist` | `cart`, `wishlist` | Không |
| **F05** | Ví Khuyến mãi (Voucher) | `VoucherWallet.jsx`, `FlashSalePage.jsx` | `GET /vouchers`, `GET /userVouchers`, `POST /userVouchers` | `vouchers`, `userVouchers` | Không |
| **F06** | Đặt hàng Thanh toán COD | `Checkout.jsx` | `POST /api/orders/checkout` | `orders`, `cart`, `userVouchers`, `products` | Không |
| **F07** | Thanh toán Trực tuyến VNPAY Sandbox | `Checkout.jsx`, `PaymentResult.jsx` | `POST /api/payments/vnpay/create`, `GET /api/payments/vnpay/return`, `GET /api/payments/vnpay/ipn` | `orders`, `paymentAttempts`, `cart`, `userVouchers` | Cổng VNPAY Sandbox |
| **F08** | Thanh toán Trực tuyến MoMo Sandbox | `Checkout.jsx`, `PaymentResult.jsx` | `POST /api/payments/momo/create`, `GET /api/payments/momo/return`, `POST /api/payments/momo/ipn` | `orders`, `paymentAttempts`, `cart`, `userVouchers` | Cổng MoMo Sandbox |
| **F09** | Theo dõi Đơn hàng & Tra cứu | `UserOrders.jsx`, `PaymentResult.jsx` | `GET /api/orders/mine`, `GET /api/payments/result/:lookupToken` | `orders` | Không |
| **F10** | Trợ lý Tư vấn AI RAG Thông minh | `ChatBot.jsx` | `POST /api/chat`, `GET /api/health` | `chatMessages`, `products` | Google Gemini API, FastEmbed ONNX |
| **F11** | Quản trị Kho hàng & Danh mục | `ProductManager.jsx`, `ProductManaCategory.jsx` | `GET/POST/PATCH/DELETE /products`, `GET/POST/DELETE /catenogies` | `products`, `catenogies`, `appliances` | Không |
| **F12** | Quản trị Đơn hàng & Chuyển trạng thái FSM | `AdminOrders.jsx` | `GET /api/admin/orders`, `PATCH /api/admin/orders/:orderId/status`, `DELETE /api/admin/orders/:orderId` | `orders`, `paymentAttempts`, `products` | Không |
| **F13** | Quản trị Khách hàng & Phân quyền | `UserManager.jsx` | `GET/POST/PATCH/DELETE /users` | `users` | Không |
| **F14** | Báo cáo Thống kê Doanh thu | `Statistics.jsx` | `GET /orders`, `GET /products`, `GET /users` | `orders`, `products`, `users` | Thư viện Recharts |
| **F15** | Quản lý Chiến dịch & Voucher Admin | `VoucherManager.jsx`, `FlashSaleManager.jsx` | `GET/POST/PATCH/DELETE /vouchers` | `vouchers` | Không |
| **F16** | Quản trị Yêu cầu Dịch vụ & Nhật ký | `AdminServiceRequests.jsx`, `AuditLogManager.jsx` | `GET/PATCH /serviceRequests` | `serviceRequests` | Không |
