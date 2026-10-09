# NHẬT KÝ ĐỐI SOÁT & KIỂM CHỨNG BẰNG CHỨNG (VALIDATION LOG)
*Quy tắc: Mọi khẳng định kỹ thuật trong báo cáo bắt buộc phải có nguồn gốc mã nguồn minh chứng.*

| STT | Khẳng định Kỹ thuật (Claim) | Nguồn Sự Thật (Source File) | Dòng / Bằng chứng Cụ thể (Evidence) | Trạng thái (Status) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Hệ thống dùng React 19 & Vite 8 | `package.json` | `dependencies.react: ^19.2.6`, `devDependencies.vite: ^8.0.12` | **VERIFIED** |
| 2 | Styling dùng Bootstrap 5 & React-Bootstrap | `package.json` | `bootstrap: ^5.3.8`, `react-bootstrap: ^2.10.10` (Không có tailwind) | **VERIFIED** |
| 3 | Core API chạy Node.js Express Port 3000 | `server_mongodb.mjs` | `PORT = Number(process.env.PORT \|\| 3000)`, `app = express()` | **VERIFIED** |
| 4 | CSDL MongoDB Native Driver (20 Collections) | `server_mongodb.mjs`, `package.json` | `import { MongoClient } from "mongodb"`, `dependencies.mongodb: ^7.6.0` | **VERIFIED** |
| 5 | AI Service dùng Python 3.11, FastAPI Port 8000 | `rag_service/main.py`, `rag_service/requirements.txt` | `from fastapi import FastAPI`, `port = 8000`, `fastapi>=0.110.0` | **VERIFIED** |
| 6 | Vector Embedding dùng FastEmbed ONNX | `rag_service/main.py`, `rag_service/requirements.txt` | `from embeddings import get_embed_model`, `fastembed>=0.8.0` | **VERIFIED** |
| 7 | Cổng thanh toán VNPAY tích hợp HMAC-SHA512 | `backend/vnpay.mjs`, `server_mongodb.mjs` | `verifyVnpaySignature`, route `/api/payments/vnpay/create`, `return`, `ipn` | **VERIFIED** |
| 8 | Cổng thanh toán MoMo tích hợp HMAC-SHA256 | `backend/momo.mjs`, `server_mongodb.mjs` | `verifyMomoSignature`, route `/api/payments/momo/create`, `return`, `ipn` | **VERIFIED** |
| 9 | Cơ chế Idempotent chống trùng đơn | `server_mongodb.mjs` | Hàm `findIdempotentOrder` kiểm tra `requestId` và `paymentAttempts` | **VERIFIED** |
| 10 | Máy trạng thái đơn hàng (FSM Order Transitions) | `server_mongodb.mjs` | Dòng 627-633: `transitions = { pending: [...], confirmed: [...] }` | **VERIFIED** |
| 11 | Khóa bảo vệ tài nguyên thanh toán | `server_mongodb.mjs` | Dòng 675-679: `isProtectedPaymentResource(req.path)` trả về HTTP 403 | **VERIFIED** |
| 12 | Bảo vệ phân quyền Admin Router | `src/App.jsx` | Dòng 47-56: `<AdminProtectedRoute>` kiểm tra `currentUser.role === 'admin'` | **VERIFIED** |
| 13 | Hệ thống 3 lớp phòng vệ AI (3-Layer Guards) | `rag_service/guards.py` | `check_pii_security`, `check_jailbreak`, `check_off_topic` | **VERIFIED** |
| 14 | Bộ test tự động thanh toán & API | `tests/`, `package.json` | `tests/vnpay.test.mjs`, `tests/momo.test.mjs`, `tests/checkout-api.test.mjs` | **VERIFIED** |
| 15 | Bộ test tải và kiểm thử hàm RAG Service | `rag_tests/` | `rag_tests/functional_test.py`, `rag_tests/load_test.py`, `TEST_LOG.md` | **VERIFIED** |
