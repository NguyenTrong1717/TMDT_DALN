# HCORE STORE - PROJECT MASTER SPECIFICATION
*Document Version: 1.0*
*Source of Truth: Reverse-Engineered from D:\TMDT_DALN source code.*

## A. TECHNOLOGY STACK
> **Evidence:** `package.json`, `rag_service/requirements.txt`, `docker-compose.yml`
*   **Frontend**: React 19, Vite, Tailwind CSS, React Router DOM.
*   **Backend API**: Node.js 22, Express.js.
*   **Database**: MongoDB Atlas (Native MongoDB Driver).
*   **AI Microservice**: Python 3.11, FastAPI, Uvicorn.
*   **AI Models**: FastEmbed (C++ ONNX Runtime) - model `bge-small-en-v1.5` (384-dim), Google Gemini Flash API (LLM Fallback/Generator).
*   **Payment Gateways**: MoMo Sandbox, VNPAY Sandbox.
*   **Deployment**: Docker, Docker Compose (`docker-compose.yml`).

## B. PROJECT ARCHITECTURE
> **Evidence:** `docker-compose.yml`, `docs/architecture/rag-architecture.html`
*   **Client Layer**: React SPA (Port 5173).
*   **Backend Services**: 
    *   Node.js Core API (Port 3000) - Handles CRUD, Payments, Auth, Orders.
    *   FastAPI RAG Service (Port 8000) - Handles Vector Embedding, Similarity Search, Guardrails, AI Generation.
*   **Data Layer**: MongoDB Cloud (Database: `tmdt_daln`), JSON Backup (`database/backups/db.json.bak`).

## C. DATABASE INVENTORY (20 Collections)
> **Evidence:** `server_mongodb.mjs`, `database/backups/db.json.bak`

### C.1. Core Commerce Module
1.  **`users`**: `id` (PK), `fullName`, `email`, `phone`, `password` (hash), `role` (admin/user), `status`.
2.  **`orders`**: `id` (PK), `orderCode`, `userId` (FK), `paymentMethod`, `status`, `totalAmount`, `voucherCode` (FK), `discountAmount`, `products` (snapshot).
3.  **`cart`**: `id` (PK), `userId` (FK), `productId` (FK), `quantity`, `fromTable`.
4.  **`paymentAttempts`**: Ghi nhận lịch sử giao dịch cổng thanh toán (chống double-spend).
5.  **`vouchers`**: `id` (PK), `code` (UK), `type`, `value`, `minOrder`, `maxCollect`.
6.  **`userVouchers`**: `userId` (FK), `voucherCode` (FK), `used` (boolean).

### C.2. Catalog & Content Module
7.  **`products`**: `id` (PK), `name`, `price`, `image`, `stock`, `sold`, `rating`.
8.  **`catenogies`**: Danh mục phân loại gốc.
9.  **`eventList`**: Sản phẩm sự kiện linh kiện.
10. **`LaptopUser`**: Phân loại laptop theo nhu cầu.
11. **`ProductPagies`**, **`ProductMenus`**, **`appliances`**, **`demoUnits`**: Các nhóm sản phẩm cụ thể.
12. **`reviews`**: Đánh giá sản phẩm.
13. **`news`**: Bài viết tin tức.

### C.3. Engagement & Operations Module
14. **`chatMessages`**: Lịch sử chat RAG.
15. **`notifications`**: Thông báo người dùng.
16. **`serviceRequests`**: Yêu cầu bảo hành/kỹ thuật.
17. **`wishlist`**: Sản phẩm yêu thích.

## D. API INVENTORY (24 Endpoints)
> **Evidence:** `server_mongodb.mjs` lines 203-788, `rag_service/main.py` lines 74-89.

### D.1. Payment & Checkout (Node.js)
*   `POST /api/orders/checkout` - Khởi tạo đơn, trừ voucher, xóa giỏ.
*   `POST /api/payments/vnpay/create` - Tạo link VNPAY.
*   `POST /api/orders/:orderId/vnpay/retry` - Thử lại thanh toán VNPAY.
*   `GET /api/payments/vnpay/return` - Hướng redirect từ VNPAY.
*   `GET /api/payments/vnpay/ipn` - Webhook IPN xử lý chốt đơn VNPAY.
*   `POST /api/payments/momo/create` - Tạo link MoMo.
*   `POST /api/orders/:orderId/momo/retry` - Thử lại thanh toán MoMo.
*   `GET /api/payments/momo/return` - Hướng redirect từ MoMo.
*   `POST /api/payments/momo/ipn` - Webhook IPN xử lý chốt đơn MoMo.
*   `GET /api/payments/result/:lookupToken` - Tra cứu kết quả an toàn.

### D.2. Orders & Admin (Node.js)
*   `GET /api/orders/mine` - Đơn hàng của tôi.
*   `GET /api/admin/orders` - Danh sách toàn bộ đơn.
*   `PATCH /api/admin/orders/:orderId/status` - Cập nhật trạng thái.
*   `DELETE /api/admin/orders/:orderId` - Xóa/Hủy đơn.

### D.3. Core REST CRUD (Node.js)
*   `GET, POST, PATCH, PUT, DELETE /:resource(/:id)` - Dynamic routing cho products, users, news...

### D.4. AI RAG Service (FastAPI)
*   `GET /api/health` - Trạng thái RAM & FastEmbed.
*   `POST /api/chat` - Nhận câu hỏi, Guardrails, Retrieval, Gemini Generate.

## E. FRONTEND ROUTE INVENTORY (36 Screens)
> **Evidence:** `src/App.jsx` lines 79-132.

### E.1. Customer UI
*   `/` - Home (`Home.jsx`)
*   `/login`, `/register` - Auth (`Login.jsx`, `Register.jsx`)
*   `/Profile`, `/edit`, `/orders`, `/wishlist` - User Dashboard
*   `/cart`, `/checkout`, `/payment-result` - Shopping Flow
*   `/product/:id`, `/search`, `/category/:category` - Catalog
*   *Widgets:* ChatBot (AI RAG), WishlistFloating.

### E.2. Admin UI (Protected Role='admin')
*   `/admin/products` - ProductManager
*   `/admin/orders` - AdminOrders
*   `/admin/users` - UserManager
*   `/admin/statistics` - Revenue Statistics
*   `/admin/vouchers`, `/admin/flash-sale`, `/admin/reviews` - Marketing & Ops

## F. USER ROLES
1.  **Guest**: Xem sản phẩm, tìm kiếm, chat AI.
2.  **Customer (User)**: Đặt hàng, áp mã giảm giá, xem lịch sử, yêu cầu bảo hành.
3.  **Administrator (Admin)**: Toàn quyền CRUD kho hàng, đơn hàng, người dùng, xem thống kê, quản lý khuyến mãi.

## G. SECURITY MECHANISMS
1.  **IPN Webhook Separation**: Đơn hàng chỉ cập nhật `paid` qua luồng ngầm server-to-server (IPN), không tin tưởng Frontend Return URL.
2.  **Idempotency (Payment)**: Chống cộng tiền 2 lần nhờ bảng `paymentAttempts`.
3.  **Role-based Guard (React)**: Component `<AdminProtectedRoute>` chặn truy cập không hợp lệ.
4.  **AI Guardrails (3-layers)**: `guards.py` chặn PII (thẻ, CCCD), chặn Jailbreak (DAN) và Off-topic.
