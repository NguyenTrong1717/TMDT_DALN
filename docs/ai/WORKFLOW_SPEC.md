# HỒ SƠ ĐẶC TẢ LUỒNG CÔNG VIỆC & NGHIỆP VỤ (WORKFLOW SPECIFICATION)
*Nguồn kiểm chứng: `server_mongodb.mjs`, `backend/vnpay.mjs`, `backend/momo.mjs`, `rag_service/engine.py`*

---

## 1. LUỒNG CHECKOUT & THANH TOÁN QUA CỔNG ĐIỆN TỬ (PAYMENT WORKFLOW)

### 1.1. Sơ đồ Tuần tự (Sequence Diagram) - VNPAY / MoMo Checkout
```mermaid
sequenceDiagram
    autonumber
    actor C as Khách hàng
    participant UI as React Frontend (:5173)
    participant API as Node.js Backend (:3000)
    participant DB as MongoDB Database
    participant GW as Cổng VNPAY / MoMo (Sandbox)

    C->>UI: 1. Nhấn nút "Đặt hàng & Thanh toán"
    UI->>API: 2. POST /api/payments/vnpay/create (Header: x-user-id, Body: requestId)
    activate API
    API->>API: 3. Kiểm tra Idempotent (findIdempotentOrder)
    API->>DB: 4. Tạo record đơn hàng (status: pending, paymentStatus: pending)
    API->>DB: 5. Tạo record phiên giao dịch paymentAttempts (txnRef, amount, expiresAt)
    API->>API: 6. Sinh chữ ký bảo mật HMAC-SHA512 với VNP_HASH_SECRET
    API-->>UI: 7. Trả về paymentUrl & lookupToken
    deactivate API

    UI->>GW: 8. Chuyển hướng trình duyệt sang paymentUrl
    activate GW
    C->>GW: 9. Nhập thông tin thẻ test & mã OTP Sandbox

    par Kênh Trình duyệt Người dùng (Client Return)
        GW->>API: 10a. Trình duyệt điều hướng về GET /api/payments/vnpay/return
        activate API
        API->>API: 11a. Kiểm tra chữ ký vnp_SecureHash
        API-->>UI: 12a. HTTP 302 Redirect về /payment-result?token=...
        deactivate API
    and Kênh Webhook Ngầm (Server-to-Server IPN)
        GW->>API: 10b. Gửi HTTP Request ngầm tới GET /api/payments/vnpay/ipn
        activate API
        API->>API: 11b. Xác minh tính toàn vẹn và số tiền giao dịch
        API->>DB: 12b. Cập nhật orders.paymentStatus = 'paid' & paymentAttempts.status = 'paid'
        API->>DB: 13b. Dọn sạch giỏ hàng cart của người dùng
        API-->>GW: 14b. Phản hồi HTTP 200 { RspCode: "00", Message: "Confirm Success" }
        deactivate API
    end
    deactivate GW
```

---

## 2. LUỒNG TƯ VẤN THÔNG MINH TRỢ LÝ ẢO AI (RAG PIPELINE WORKFLOW)

### 2.1. Sơ đồ Luồng Hoạt động (Flowchart)
```mermaid
flowchart TD
    Start([Người dùng gửi câu hỏi]) --> Guard1{Chứa thông tin cá nhân PII?}
    Guard1 -- Có --> BlockPII[Từ chối vì lý do bảo mật quyền riêng tư]
    Guard1 -- Không --> Guard2{Tấn công Jailbreak/Prompt Injection?}
    Guard2 -- Có --> BlockJB[Từ chối và định hướng lại câu hỏi]
    Guard2 -- Không --> Guard3{Hỏi ngoài luồng kinh doanh shop?}
    Guard3 -- Có --> BlockOff[Lịch sự từ chối & gợi ý hỏi về linh kiện máy tính]
    Guard3 -- Không --> Embed[FastEmbed ONNX Vectorize: 384-dim Vector]

    Embed --> Search[Truy xuất kho dữ liệu: Cosine Similarity Hybrid Search]
    Search --> TopK[Chọn Top-K sản phẩm phù hợp nhất]
    TopK --> Augment[Ghép nối vào System Prompt giàu ngữ cảnh]
    Augment --> CheckKey{Có Gemini API Key?}
    CheckKey -- Có --> CallLLM[Gọi Gemini Flash API sinh câu trả lời]
    CheckKey -- Không / Mất mạng --> Fallback[Dùng Local Fallback Template ghép giá và tên máy]
    CallLLM --> Output([Trả phản hồi về React Chat UI])
    Fallback --> Output
    BlockPII --> Output
    BlockJB --> Output
    BlockOff --> Output
```

---

## 3. MÁY TRẠNG THÁI HỮU HẠN ĐƠN HÀNG (ORDER STATUS FINITE STATE MACHINE)

```mermaid
stateDiagram-v2
    [*] --> pending: Khách đặt hàng thành công

    pending --> confirmed: Quản trị viên duyệt đơn
    pending --> cancelled: Khách hoặc Admin hủy đơn (Hoàn lại kho hàng)

    confirmed --> shipping: Đơn vị vận chuyển lấy hàng (Yêu cầu đơn VNPAY đã thanh toán)
    confirmed --> cancelled: Hủy đơn trước khi xuất kho

    shipping --> completed: Giao hàng thành công tới người nhận

    completed --> [*]: Kết thúc vòng đời đơn hàng
    cancelled --> [*]: Kết thúc vòng đời đơn hàng
```
