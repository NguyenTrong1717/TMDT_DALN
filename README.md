# 💻 HCore Store - Nền Tảng Thương Mại Điện Tử & Trợ Lý AI RAG

> **Dự án Đồ án Chuyên ngành / Tốt nghiệp:** Sàn thương mại điện tử chuyên kinh doanh Laptop & Linh kiện máy tính cao cấp, tích hợp Cổng thanh toán trực tuyến (VNPAY & MoMo Sandbox) cùng Hệ thống Trợ lý ảo AI tư vấn cấu hình sử dụng công nghệ **RAG (Retrieval-Augmented Generation)** cục bộ.

---

## 📌 Bảng Ánh Xạ Dịch Vụ & Cổng (Port Mapping)

Hệ thống hoạt động theo mô hình Microservices phân tán 3 tầng:

| Tầng Dịch Vụ | Công Nghệ | Cổng Thực Thi (Port) | Mô Tả Chức Năng |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | React 19, Vite, Bootstrap, Lucide Icons | `http://localhost:5173` | Giao diện người dùng mua sắm, bộ lọc đa chiều (Faceted Filter), giỏ hàng & thanh toán |
| **API Backend** | Node.js (ESM), Express, MongoDB Driver | `http://127.0.0.1:3000` | Quản lý sản phẩm, đơn hàng, bảo mật HMAC thanh toán VNPAY/MoMo |
| **AI RAG Service** | Python 3.11+, FastAPI, FastEmbed ONNX | `http://127.0.0.1:8000` | Vector Search cục bộ (<2ms), 3 tầng bảo mật Guards, tư vấn sản phẩm |

---

## 🗂️ Cấu Trúc Thư Mục Dự Án (Directory Structure)

```text
TMDT_DALN/
├── backend/                  # Modules nghiệp vụ thanh toán (VNPAY, MoMo logic)
│   ├── momo.mjs              # Xử lý chữ ký số & IPN MoMo
│   └── vnpay.mjs             # Xử lý mã hóa HMAC-SHA512 & IPN VNPAY PAY 2.1.0
├── database/                 # Dữ liệu & bản sao lưu cơ sở dữ liệu
│   └── backups/              # Bản sao lưu db.json trước khi migrate sang MongoDB
├── docs/                     # Trung tâm lưu trữ tài liệu kỹ thuật & nghiệp vụ
│   ├── architecture/         # Tài liệu kiến trúc RAG, sơ đồ tương tác HTML
│   └── payments/             # Hướng dẫn chi tiết chạy VNPAY Sandbox & MoMo Sandbox
├── postman/                  # Bộ sưu tập Postman Collection kiểm thử API thanh toán
├── public/                   # Tài nguyên tĩnh phục vụ cho Vite Client
├── rag_service/              # Microservice Python AI RAG (FastAPI + ONNX Runtime)
│   ├── chunker.py            # Thuật toán phân đoạn ngữ cảnh (Semantic Chunking)
│   ├── embeddings.py         # FastEmbed ONNX & chuẩn hóa L2 Norm vector 384 chiều
│   ├── engine.py             # Điều phối RAG & Smart Local Fallback ngoại tuyến
│   ├── guards.py             # Hệ thống 3 tầng bảo mật (Lọc thẻ, CCCD, Prompt Injection)
│   ├── knowledge.py          # Đồng bộ tri thức sản phẩm thời gian thực từ Database
│   ├── main.py               # FastAPI Endpoints (:8000)
│   └── retriever.py          # Dot Product Search & Regex Budget Reranker
├── rag_tests/                # Bộ kiểm thử tự động cho hệ thống RAG (Load & Functional)
├── scripts/                  # Kịch bản bảo trì, seed dữ liệu và migration MongoDB
├── src/                      # Mã nguồn ứng dụng React Frontend
│   ├── assets/               # Hình ảnh, banner, icons
│   ├── Chat_bot/             # Giao diện widget Chatbot AI & bộ điều hướng RAG
│   ├── components/           # Các thành phần giao diện (Header, Footer, ProductCard, Filter...)
│   ├── pages/                # Các trang chính (Home, Checkout, PaymentResult, Wishlist...)
│   └── utils/                # Tiện ích định dạng tiền tệ, xử lý chuỗi
├── tests/                    # Bộ kiểm thử tự động API Backend (Node Test Runner)
├── .env.example              # Mẫu cấu hình biến môi trường
├── package.json              # Quản lý thư viện và script npm
├── server.mjs                # API Server chế độ giả lập (Mock JSON-server)
├── server_mongodb.mjs        # API Server chính thức kết nối MongoDB
└── vite.config.js            # Cấu hình Vite bundler & React Compiler
```

---

## ⚡ Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Chuẩn Bị Môi Trường
- **Node.js**: Phiên bản 20.x hoặc 22.x LTS.
- **Python**: Phiên bản 3.10 trở lên.
- **MongoDB**: Đang chạy cục bộ tại `mongodb://localhost:27017` hoặc MongoDB Atlas.

### 2. Cấu Hình Biến Môi Trường (`.env`)
Sao chép `.env.example` thành `.env` tại thư mục gốc và điền thông tin:
```bash
cp .env.example .env
```
*(Tham khảo thông tin thẻ test và secret key tại [docs/payments/VNPAY_SANDBOX.md](docs/payments/VNPAY_SANDBOX.md))*

### 3. Cài Đặt Dependencies
```powershell
# Cài đặt thư viện Node.js
npm install

# Cài đặt môi trường ảo Python cho AI RAG
cd rag_service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Khởi Chạy Toàn Bộ Hệ Thống

**Cách 1: Khởi động 3 cửa sổ riêng biệt (Khuyên dùng - Không bị lẫn log)**:
```powershell
npm run dev:tabs
# Hoặc click đúp chuột vào file start-dev.bat ở thư mục gốc
```

**Cách 2: Khởi động gộp 1 terminal**:
```powershell
npm run dev:all
```

**Cách 3: Khởi chạy từng dịch vụ riêng biệt**:
- **Chạy React Vite**: `npm run dev:vite`
- **Chạy Backend MongoDB**: `npm run server`
- **Chạy Python AI RAG**: `npm run rag`

### 5. Tiện Ích Vận Hành & Khắc Phục Lỗi
- **Kiểm tra sức khỏe 3 dịch vụ**: `npm run check:health` (Kiểm tra ping và trạng thái Online/Offline).
- **Giải phóng cổng bị kẹt ngầm (Zombie)**: `npm run clean:ports` (Dọn dẹp cổng 3000, 5173, 8000 khi bị nghẽn).

---

## 🧪 Kiểm Thử Hệ Thống (Testing Suite)

Dự án cung cấp bộ kịch bản kiểm thử toàn diện:

### 1. Kiểm Thử Cổng Thanh Toán Backend
```powershell
# Chạy toàn bộ test tích hợp thanh toán (VNPAY & MoMo)
npm run test:payments

# Chạy riêng kiểm thử VNPAY Sandbox
npm run test:vnpay
```

### 2. Kiểm Thử Hệ Thống AI RAG
```powershell
# Kích hoạt venv và chạy kiểm thử chức năng RAG
cd rag_tests
..\rag_service\.venv\Scripts\python functional_test.py
..\rag_service\.venv\Scripts\python load_test.py
```

### 3. Kiểm Thử Qua Postman
Nhập tệp collection [postman/VNPAY-Sandbox.postman_collection.json](postman/VNPAY-Sandbox.postman_collection.json) vào ứng dụng Postman để kiểm thử các luồng:
1. `POST /api/payments/vnpay/create`: Tạo đơn và sinh paymentUrl.
2. `GET /api/payments/result/{lookupToken}`: Tra cứu trạng thái sau IPN.

---

## 📚 Tài Liệu Kỹ Thuật Chi Tiết

- 💳 **Thanh toán VNPAY Sandbox**: Xem [docs/payments/VNPAY_SANDBOX.md](docs/payments/VNPAY_SANDBOX.md)
- 👛 **Thanh toán MoMo Sandbox**: Xem [docs/payments/MOMO_SANDBOX.md](docs/payments/MOMO_SANDBOX.md)
- 🧠 **Kiến trúc Trợ lý AI RAG**: Xem [docs/architecture/RAG_ARCHITECTURE.md](docs/architecture/RAG_ARCHITECTURE.md)
- 🌐 **Sơ đồ Tương tác Đồ họa**: Mở trực tiếp [docs/architecture/rag-architecture.html](docs/architecture/rag-architecture.html) trên trình duyệt.
