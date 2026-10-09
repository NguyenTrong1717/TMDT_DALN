# HCORE STORE - HỒ SƠ ĐẶC TẢ TỔNG THỂ DỰ ÁN (PROJECT MASTER SPECIFICATION)
*Phiên bản: 2.0 (Verified As-Built)*  
*Nguồn sự thật: Kiểm kê trực tiếp từ mã nguồn hệ thống D:\TMDT_DALN*  
*Ngôn ngữ tài liệu: Tiếng Việt (Thuật ngữ kỹ thuật quốc tế)*

---

## 1. CÔNG NGHỆ THỰC TẾ (TECHNOLOGY STACK)
> **Bằng chứng kiểm chứng:** `package.json`, `rag_service/requirements.txt`, `docker-compose.yml`, `vite.config.js`

* **Giao diện người dùng (Frontend Web Application):**
  - Thư viện cốt lõi: React v19.2.6 (`package.json#L36`)
  - Công cụ đóng gói & Build Server: Vite v8.0.12 (`package.json#L62`)
  - Định tuyến trang: React Router DOM v7.17.0 (`package.json#L41`)
  - Framework Giao diện & CSS: Bootstrap v5.3.8 & React-Bootstrap v2.10.10 (`package.json#L30,37`), CSS Modules tùy biến chuyên sâu. *(Lưu ý: Dự án không sử dụng Tailwind CSS).*
  - Hệ thống Icon & Thông báo: `lucide-react` v1.23.0, `react-icons` v5.6.0, `sonner` v2.0.7, `nprogress` v0.2.0.
  - Biểu đồ thống kê: `recharts` v3.9.0 (`package.json#L42`).
  - Cổng dịch vụ Client: Port 5173.

* **Máy chủ Dịch vụ Lõi (Backend Core API):**
  - Nền tảng thực thi: Node.js v22 (hỗ trợ Native `--watch` và `process.loadEnvFile`).
  - Web Framework: Express.js v5.2.1 (`package.json#L31`).
  - Trình điều khiển cơ sở dữ liệu: MongoDB Node.js Driver v7.6.0 (`package.json#L33`).
  - Xử lý mã hóa & Bảo mật chữ ký: Node.js Native `crypto` (HMAC-SHA512 cho VNPAY, HMAC-SHA256 cho MoMo).
  - Cổng dịch vụ API: Port 3000.

* **Hệ thống Cơ sở dữ liệu (Database Layer):**
  - Hệ quản trị CSDL: MongoDB (triển khai cục bộ hoặc MongoDB Atlas Cloud).
  - Tên cơ sở dữ liệu mặc định: `tmdt_daln` (`server_mongodb.mjs#L33`).
  - Tổng số lượng Collections hoạt động: 20 collections (khởi tạo qua `scripts/migrate_to_mongodb.mjs` và kiểm chứng từ `database/backups/db.json.bak`).

* **Dịch vụ Trí tuệ Nhân tạo (AI RAG Microservice):**
  - Ngôn ngữ & Nền tảng: Python v3.11.
  - Web Framework: FastAPI v0.110.0+ (`rag_service/requirements.txt#L1`).
  - ASGI Server: Uvicorn v0.28.0+ (`rag_service/requirements.txt#L2`).
  - Công cụ Embedding Vector tại chỗ: `fastembed` v0.8.0+ (Chạy ONNX Runtime C++ mô hình `bge-small-en-v1.5`, vector 384 chiều).
  - Mô hình Ngôn ngữ lớn (LLM): Google Gemini Flash API (`gemini-2.5-flash` / `gemini-1.5-flash`).
  - Cổng dịch vụ AI: Port 8000.

* **Cổng Thanh toán Trực tuyến (Payment Gateways - Môi trường Sandbox):**
  - Cổng VNPAY: Giao thức VNPAY Payment Gateway V2, thuật toán kiểm tra tính toàn vẹn SHA512.
  - Cổng MoMo: MoMo All-in-One Payment Gateway (AIO), phương thức Capture Wallet, thuật toán HMAC-SHA256.

* **Đóng gói và Triển khai (Containerization):**
  - Docker Compose (`docker-compose.yml`) điều phối 3 dịch vụ độc lập:
    1. `hcore-frontend` (Port 5173:5173)
    2. `hcore-backend` (Port 3000:3000)
    3. `hcore-rag` (Port 8000:8000)
    Gắn kết qua mạng cầu nối nội bộ `hcore-net`.

---

## 2. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)
Hệ thống được thiết kế theo kiến trúc Microservices phân tách ranh giới rõ ràng:
1. **Lớp Client (Presentation Tier):** Single Page Application (SPA) xây dựng trên React 19, đóng gói bằng Vite, giao tiếp với các Backend thông qua RESTful JSON over HTTP(S).
2. **Lớp Nghiệp vụ Chính (Core Business Tier):** Máy chủ Node.js/Express phụ trách toàn bộ logic nghiệp vụ mua bán, quản lý giỏ hàng, xác thực người dùng, máy trạng thái đơn hàng (FSM Order Status), tạo phiên thanh toán và hứng Webhook IPN từ đối tác thứ ba.
3. **Lớp Trợ lý Thông minh (AI RAG Tier):** Microservice FastAPI độc lập, đảm nhiệm việc tiền xử lý văn bản, phòng thủ mã độc/jailbreak (3-Layer Guards), nhúng vector hóa (Embedding) và tích hợp LLM để tư vấn khách hàng.
4. **Lớp Dữ liệu (Persistence Tier):** MongoDB lưu trữ tài liệu phi cấu trúc, đảm bảo hiệu năng đọc ghi cao và tính linh hoạt của danh mục sản phẩm điện tử.

---

## 3. KIỂM KÊ CƠ SỞ DỮ LIỆU (20 COLLECTIONS)
> **Bằng chứng kiểm chứng:** `database/backups/db.json.bak`, `server_mongodb.mjs#L98-L101`

1. `users`: Thông tin tài khoản, phân quyền quản trị, mật khẩu hash, trạng thái hoạt động.
2. `orders`: Đơn hàng, mã đơn, tổng giá trị, trạng thái đơn, phương thức thanh toán, snapshot sản phẩm lúc mua.
3. `paymentAttempts`: Bản ghi phiên thanh toán cổng VNPAY/MoMo phục vụ cơ chế Idempotent chống trừ tiền hai lần.
4. `cart`: Giỏ hàng động của từng người dùng.
5. `vouchers`: Danh mục mã giảm giá do hệ thống phát hành kèm điều kiện áp dụng.
6. `userVouchers`: Ví voucher cá nhân của người dùng, lưu vết voucher đã thu thập và trạng thái sử dụng.
7. `products`: Sản phẩm linh kiện và thiết bị chính.
8. `catenogies`: Danh mục phân loại sản phẩm.
9. `LaptopUser`: Bảng sản phẩm laptop chuyên biệt theo phân khúc.
10. `eventList`: Bảng sản phẩm thuộc các chương trình sự kiện / khuyến mãi.
11. `appliances`: Thiết bị gia dụng công nghệ.
12. `ProductPagies`: Dữ liệu phân trang hiển thị sản phẩm mở rộng.
13. `ProductMenus`: Cấu hình danh mục menu động.
14. `demoUnits`: Máy trưng bày / hàng trải nghiệm.
15. `reviews`: Đánh giá, chấm sao và bình luận của khách hàng về sản phẩm.
16. `news`: Tin tức công nghệ, bài viết khuyến mãi, cẩm nang tư vấn.
17. `chatMessages`: Lịch sử đối thoại giữa người dùng và trợ lý AI RAG.
18. `notifications`: Thông báo hệ thống gửi đến người dùng.
19. `serviceRequests`: Đơn yêu cầu hỗ trợ kỹ thuật, lắp ráp, bảo hành.
20. `wishlist`: Danh sách sản phẩm yêu thích được người dùng đánh dấu.

---

## 4. KIỂM KÊ DANH MỤC API (24 ENDPOINTS CHÍNH XÁC)
> **Bằng chứng kiểm chứng:** `server_mongodb.mjs#L203-L796`, `rag_service/main.py#L74-L109`

### 4.1. Phân hệ Đặt hàng & Thanh toán (Node.js API)
1. `POST /api/orders/checkout`: Đặt hàng thanh toán khi nhận hàng (COD), xử lý Idempotent, trừ kho và tiêu thụ voucher.
2. `POST /api/payments/vnpay/create`: Khởi tạo phiên giao dịch VNPAY Sandbox, sinh chữ ký HMAC-SHA512.
3. `POST /api/orders/:orderId/vnpay/retry`: Thử lại thanh toán VNPAY cho đơn hàng chưa hoàn tất.
4. `GET /api/payments/vnpay/return`: Tiếp nhận chuyển hướng trình duyệt từ VNPAY, kiểm tra chữ ký và chuyển hướng về frontend `/payment-result`.
5. `GET /api/payments/vnpay/ipn`: Webhook máy chủ tới máy chủ (Server-to-Server) của VNPAY, kiểm tra tính toàn vẹn và cập nhật trạng thái đơn hàng.
6. `POST /api/payments/momo/create`: Khởi tạo phiên giao dịch MoMo Sandbox, sinh chữ ký HMAC-SHA256.
7. `POST /api/orders/:orderId/momo/retry`: Thử lại thanh toán MoMo cho đơn hàng lỗi hoặc quá hạn.
8. `GET /api/payments/momo/return`: Tiếp nhận chuyển hướng trình duyệt từ MoMo về frontend.
9. `POST /api/payments/momo/ipn`: Webhook máy chủ tới máy chủ của MoMo để cập nhật trạng thái đơn sang `paid`.
10. `GET /api/payments/result/:lookupToken`: Tra cứu trạng thái đơn hàng an toàn thông qua token tra cứu ngẫu nhiên.
11. `GET /api/orders/mine`: Lấy danh sách đơn hàng của tài khoản đang đăng nhập (`x-user-id`).

### 4.2. Phân hệ Quản trị Hệ thống (Admin API)
12. `GET /api/admin/orders`: Lấy toàn bộ danh sách đơn hàng trong hệ thống (Yêu cầu `role='admin'`).
13. `PATCH /api/admin/orders/:orderId/status`: Cập nhật trạng thái đơn hàng tuân theo máy trạng thái (FSM State Machine).
14. `DELETE /api/admin/orders/:orderId`: Xóa đơn hàng đã hoàn tất hoặc đã hủy (Cấm xóa đơn VNPAY).
15. `GET /api/db-status`: Kiểm tra trạng thái kết nối cơ sở dữ liệu và danh sách collections.

### 4.3. Phân hệ RESTful CRUD Đa năng (Generic Resource API)
16. `GET /:resource`: Lấy danh sách tài nguyên kèm bộ lọc regex `q`, sắp xếp `_sort`, phân trang `_limit`, `_page`.
17. `GET /:resource/:id`: Lấy chi tiết một bản ghi theo khóa định danh.
18. `POST /:resource`: Tạo mới bản ghi trong collection chỉ định.
19. `PATCH /:resource/:id`: Cập nhật từng phần bản ghi.
20. `PUT /:resource/:id`: Thay thế toàn bộ bản ghi.
21. `DELETE /:resource/:id`: Xóa một bản ghi theo khóa định danh.

### 4.4. Phân hệ AI RAG Service (FastAPI)
22. `GET /`: Kiểm tra thông tin phiên bản và danh mục endpoint của AI Service.
23. `GET /api/health`: Health check dịch vụ AI và trạng thái mô hình FastEmbed trong RAM.
24. `POST /api/chat`: Xử lý hội thoại thông minh, kiểm duyệt an toàn 3 lớp, truy xuất ngữ cảnh và sinh câu trả lời bằng Gemini LLM.

---

## 5. PHÂN QUYỀN VÀ TÁC NHÂN (ACTORS & ROLES)
1. **Khách vãng lai (Guest):** Xem danh mục sản phẩm, tìm kiếm, đọc tin tức, tương tác với AI Chatbot.
2. **Khách hàng đã đăng nhập (Customer / User - `role='user'`):** Quản lý giỏ hàng, thu thập voucher, đặt hàng, thanh toán qua VNPAY/MoMo, tra cứu lịch sử đơn hàng, gửi yêu cầu bảo hành.
3. **Quản trị viên (Admin - `role='admin'`):** Được kiểm soát bởi `<AdminProtectedRoute>`, quản lý kho hàng, duyệt và cập nhật trạng thái đơn, quản lý người dùng, cấu hình voucher và theo dõi biểu đồ doanh thu.
4. **Đối tác Thanh toán (Payment Gateway):** VNPAY và MoMo đóng vai trò tác nhân ngoại vi xác nhận kết quả thanh toán thông qua kênh bảo mật IPN Webhook.
5. **Hệ thống Trợ lý AI (AI Microservice):** Tác nhân tự động phân tích và sinh nội dung tư vấn dựa trên tri thức thực tế của cửa hàng.

---

## 6. CƠ CHẾ BẢO MẬT ĐÃ ĐƯỢC THIẾT LẬP (VERIFIED SECURITY MECHANISMS)
1. **Bảo mật Định tuyến Admin (Role-Based Access Control):** Kiểm tra quyền tại cả Client (`AdminProtectedRoute`) lẫn Server (`requireAdmin` kiểm tra `x-user-id`).
2. **Khóa Truy cập Trực tiếp Tài nguyên Thanh toán:** Chặn mọi truy cập trực tiếp qua REST Generic CRUD tới `paymentAttempts` (`isProtectedPaymentResource`).
3. **Cơ chế Idempotency chống gửi trùng:** Header/body `requestId` bắt buộc đối với mọi yêu cầu checkout, đảm bảo một yêu cầu thanh toán không bao giờ bị nhân bản.
4. **Xác thực chữ ký số Webhook:** Kiểm tra HMAC-SHA512 (`vnp_SecureHash`) và HMAC-SHA256 (`momoSignature`) bằng khóa bí mật phía máy chủ (`VNP_HASH_SECRET`, `MOMO_SECRET_KEY`).
5. **Phòng thủ AI 3 lớp (3-Layer AI Guardrails):** Module `guards.py` loại trừ thông tin cá nhân (PII Guard), chặn tấn công Prompt Injection/Jailbreak, và sàng lọc nội dung ngoài luồng kinh doanh (Off-topic Filter).
