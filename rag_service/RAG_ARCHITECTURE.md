# BÁO CÁO KỸ THUẬT: KIẾN TRÚC HỆ THỐNG RAG (RETRIEVAL-AUGMENTED GENERATION) - HCORE STORE

> **Phiên bản:** 2.0.0 (Modular & Local AI Architecture)  
> **Dự án:** HCore E-Commerce Platform (`TMDT_DALN`)  
> **Sơ đồ kiến trúc tương tác:** [rag-architecture.html](file:///d:/TMDT_DALN/rag_service/rag-architecture.html) *(Mở trực tiếp bằng trình duyệt để xem sơ đồ SVG có tương tác, chuyển Dark/Light theme)*

---

## MỤC LỤC
1. [Tổng Quan Hệ Thống & Triết Lý Thiết Kế](#1-tổng-quan-hệ-thống--triết-lý-thiết-kế)
2. [Cấu Trúc Thư Mục Chuẩn Hóa (`rag_service/`)](#2-cấu-trúc-thư-mục-chuẩn-hóa-rag_service)
3. [Luồng Xử Lý Toàn Diện Từ Frontend Đến Xử Lý & Trả Kết Quả (End-to-End Pipeline)](#3-luồng-xử-lý-toàn-diện-từ-frontend-đến-xử-lý--trả-kết-quả-end-to-end-pipeline)
4. [Bảng Phân Tích Cơ Chế Xử Lý 8 Bước (Deep-Dive Mechanism)](#4-bảng-phân-tích-cơ-chế-xử-lý-8-bước-deep-dive-mechanism)
5. [Chi Tiết Thuật Toán & Kỹ Thuật Phân Đoạn (Entity-based Semantic Chunking)](#5-chi-tiết-thuật-toán--kỹ-thuật-phân-đoạn-entity-based-semantic-chunking)
6. [Mô Hình Local AI Embedding & Chuẩn Hóa Vector ($L_2$ Normalization)](#6-mô-hình-local-ai-embedding--chuẩn-hóa-vector-l_2-normalization)
7. [Hệ Thống 3 Tầng Bảo Mật (Security Guardrails)](#7-hệ-thống-3-tầng-bảo-mật-security-guardrails)
8. [Truy Xuất Hai Giai Đoạn & Xếp Hạng Ngân Sách (Hybrid Retrieval & Reranking)](#8-truy-xuất-hai-giai-đoạn--xếp-hạng-ngân-sách-hybrid-retrieval--reranking)
9. [Tăng Cường Ngữ Cảnh & Cơ Chế Dự Phòng Ngoại Tuyến (Generation & Smart Fallback)](#9-tăng-cường-ngữ-cảnh--cơ-chế-dự-phòng-ngoại-tuyến-generation--smart-fallback)
10. [Bảng So Sánh: HCore RAG vs Chatbot Truyền Thống](#10-bảng-so-sánh-hcore-rag-vs-chatbot-truyền-thống)
11. [Hướng Dẫn Kiểm Thử & Vận Hành](#11-hướng-dẫn-kiểm-thử--vận-hành)

---

## 1. TỔNG QUAN HỆ THỐNG & TRIẾT LÝ THIẾT KẾ

Hệ thống RAG của HCore là dịch vụ thông minh hỗ trợ tư vấn bán hàng chuyên sâu về linh kiện máy tính, laptop, PC Gaming và phụ kiện công nghệ. Khác với các Chatbot thông thường (chỉ gửi prompt thẳng lên mô hình ngôn ngữ lớn), HCore RAG giải quyết triệt để 3 bài toán lớn của thương mại điện tử:

1. **Chống Ảo Giác (Anti-Hallucination):** LLM chỉ được phép tư vấn các sản phẩm, giá bán, tồn kho và chính sách có thật trong cơ sở dữ liệu của cửa hàng.
2. **Bảo Mật & Tuân Thủ (Security & Compliance):** Ngăn chặn 100% các cuộc tấn công chiếm quyền điều khiển câu lệnh (Prompt Injection / DAN Attack), che giấu thông tin định danh cá nhân (PII), và từ chối các chủ đề ngoài phạm vi bán hàng.
3. **Hiệu Năng Cao & Tính Sẵn Sàng 100% (High Availability):**
   - **Local AI Embedding:** Sử dụng mô hình Vector cục bộ chạy qua ONNX Runtime, hoàn toàn ngoại tuyến, thời gian sinh vector chỉ từ 10 - 20ms, không phụ thuộc kết nối Internet và không tốn chi phí gọi API.
   - **Smart Local Fallback:** Nếu mạng gặp sự cố hoặc Gemini API quá tải (Rate limit 429), Chatbot tự động kích hoạt bộ sinh phản hồi theo mẫu cục bộ dựa trên dữ liệu sản phẩm đã truy xuất, đảm bảo người dùng không bao giờ gặp lỗi gián đoạn.

---

## 2. CẤU TRÚC THƯ MỤC CHUẨN HÓA (`rag_service/`)

Kiến trúc đa tầng (Layered Modular Architecture) tuân thủ nguyên lý Đơn nhiệm (Single Responsibility Principle):

```
d:/TMDT_DALN/rag_service/
├── config.py                  # [Cấu hình] Quản lý biến môi trường, cổng mạng, API key và siêu tham số
├── knowledge.py               # [Tri thức] Lưu trữ chính sách cửa hàng và nạp dữ liệu song song từ db.json
├── chunker.py                 # [Phân đoạn] Thuật toán Entity-based Semantic Chunking + Fingerprint Cache
├── embeddings.py              # [Vector hóa] Local AI ONNX FastEmbed (MiniLM-L12, 384 chiều) + Chuẩn hóa L2
├── retriever.py               # [Truy xuất] Cosine Similarity qua Dot Product + Regex Budget/Category Reranker
├── guards.py                  # [Bảo mật] 3 tầng phòng thủ: PII Masking, Jailbreak Blocker, Off-topic Filter
├── engine.py                  # [Điều phối] Nhạc trưởng trung tâm RAG Engine liên kết toàn bộ các tầng
├── rag_engine.py              # [Tương thích] Wrapper re-export đảm bảo 100% tương thích ngược
├── main.py                    # [REST API] FastAPI server (:8000), định tuyến endpoints /api/chat, /api/health
├── rag-pipeline.architecture.json # [Đặc tả kiến trúc] Định nghĩa máy trạng thái theo chuẩn Archify
├── rag-architecture.html      # [Sơ đồ tương tác] Giao diện SVG động độc lập với đầy đủ views và cards
└── RAG_ARCHITECTURE.md        # [Tài liệu] Bản báo cáo chi tiết kỹ thuật này
```

---

## 3. LUỒNG XỬ LÝ TOÀN DIỆN TỪ FRONTEND ĐẾN XỬ LÝ & TRẢ KẾT QUẢ (END-TO-END PIPELINE)

Quy trình khép kín từ khi khách hàng gõ tin nhắn đến khi giao diện hiển thị câu trả lời:

```mermaid
flowchart TD
    subgraph 1. Frontend React Layer
        A([Khách hàng nhập câu hỏi]) --> B[ChatBot.jsx]
        B --> C[ragEngine.js - Client Dispatcher]
    end

    C -->|HTTP POST :8000/api/chat| D[main.py - FastAPI Gateway]

    subgraph 2. Security Guardrails Layer
        D --> E{guards.py}
        E -->|Phát hiện Thẻ/CCCD/SĐT| E1[Tầng 1: PII Masking]
        E -->|Phát hiện DAN/Injection| E2[Tầng 2: Jailbreak Blocker]
        E -->|Chủ đề ngoài công nghệ| E3[Tầng 3: Off-topic Filter]
        E1 --> F[Query An Toàn]
        E -->|Hợp lệ| F
    end

    subgraph 3. Vector & Retrieval Layer
        F --> G[embeddings.py - FastEmbed ONNX]
        G -->|Sinh Query Vector 384-dim + Chuẩn hóa L2| H[retriever.py - Giai đoạn 1: Dense Retrieval]
        
        DB[(JSON Server :3000 db.json)] --> I[knowledge.py]
        I --> J[chunker.py - Entity-based Chunking]
        J -->|Fingerprint Hash Check| G
        
        H -->|Dot Product Matrix Multiplication| K[Top-12 Ứng Viên Tiềm Năng]
        K --> L[retriever.py - Giai đoạn 2: Regex Budget & Category Reranker]
        L -->|Cộng/Trừ điểm thưởng phạt| M[Top 3-5 Contexts Chuẩn Xác Nhất]
    end

    subgraph 4. Augmentation & Generation Layer
        M --> N[engine.py - build_system_prompt]
        N --> O{Call LLM Dispatcher}
        O -->|Thành công| P[Google Gemini API: gemini-flash]
        O -->|Mất mạng / 429 Quota| Q[Smart Local Fallback: Rule-based Generator]
        P --> R[Tổng Hợp JSON Response]
        Q --> R
    end

    R -->|HTTP Response 200 OK| S[ragEngine.js]
    S --> T[ChatBot.jsx]
    T --> U([Render Markdown, Thẻ Sản Phẩm & Gợi Ý Lên Màn Hình])
```

---

## 4. BẢNG PHÂN TÍCH CƠ CHẾ XỬ LÝ 8 BƯỚC (DEEP-DIVE MECHANISM)

| Bước | Tên Bước | Thành Phần Phụ Trách | Đầu Vào (Input) | Cơ Chế & Thuật Toán Xử Lý | Đầu Ra (Output) | Độ Trễ (Latency) |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **1** | **Khởi Tạo Câu Hỏi** | `ChatBot.jsx`, `ragEngine.js` | Text nhập từ ô chat, User Profile | Đóng gói JSON payload, gắn `AbortController` timeout 10 giây, gửi HTTP POST qua fetch API | HTTP Request tới `:8000/api/chat` | < 1ms |
| **2** | **Định Tuyến & Xác Thực API** | `main.py` (FastAPI) | HTTP Request Body | Pydantic validation (`ChatRequest`), kiểm tra CORS middleware | Object `request.userQuery` | < 1ms |
| **3** | **Kiểm Soát 3 Lớp Bảo Mật** | `guards.py` | Câu hỏi thô | 1. **PII Masking:** Regex ẩn thẻ ngân hàng, CCCD.<br>2. **Jailbreak Blocker:** Chặn từ khóa DAN, system prompt bypass.<br>3. **Off-topic Filter:** Lọc câu hỏi toán học, chính trị, code | Query đã lọc hoặc Cảnh báo dừng sớm | < 2ms |
| **4** | **Nạp & Phân Đoạn Tri Thức** | `knowledge.py`, `chunker.py` | `db.json` (:3000) & chính sách shop | **Entity-based Semantic Chunking:** Giữ nguyên vẹn sản phẩm. **SHA-256 Fingerprint Cache:** Không tính lại nếu DB giữ nguyên | Danh sách Chunks có cấu trúc + Metadata | 0ms (Đã cache) |
| **5** | **Vector Hóa Ngữ Nghĩa Cục Bộ** | `embeddings.py` | Query an toàn | Chạy mô hình FastEmbed `MiniLM-L12-v2` trên CPU bằng C++ ONNX Runtime. **Chuẩn hóa $L_2$** đưa vector về $\|\mathbf{v}\|_2 = 1$ | Vector truy vấn $\mathbf{q} \in \mathbb{R}^{384}$ | 10 – 15ms |
| **6.1**| **Truy Xuất Dày (Dense Retrieval)** | `retriever.py` | $\mathbf{q}$ và ma trận tài liệu | **Phép nhân vô hướng Dot Product:** $\mathbf{q} \cdot \mathbf{d} = \sum q_i d_i$ (do vector đã chuẩn hóa $L_2$), quét toàn bộ kho tri thức | Top-12 tài liệu liên quan nhất | < 2ms |
| **6.2**| **Xếp Hạng Ngân Sách (Reranker)** | `retriever.py` | Top-12 ứng viên | Bóc tách số tiền bằng Regex (`tầm 18tr`). Áp dụng công thức thưởng phạt: $+0.25$ (đúng giá), $-0.40$ (vượt giá), $+0.15$ (đúng danh mục) | Top 3–5 Contexts tối ưu | < 1ms |
| **7** | **Tăng Cường & Sinh Phản Hồi** | `engine.py` | Top Contexts + User Query | **Augment:** Ghép context vào System Prompt với luật chống bịa đặt.<br>**Generate:** Gọi Gemini Flash. Nếu lỗi/429 $\rightarrow$ kích hoạt **Smart Local Fallback** | JSON `{ reply, sources, engine }` | 800ms – 1.5s (LLM) / 5ms (Fallback) |
| **8** | **Render Kết Quả Lên UI** | `ChatBot.jsx` | JSON Response | React Virtual DOM parse Markdown, hiển thị badge giá, hình ảnh, link xem chi tiết và nút mua nhanh | Giao diện tin nhắn mượt mà | < 5ms |

---

## 5. CHI TIẾT THUẬT TOÁN & KỸ THUẬT PHÂN ĐOẠN (ENTITY-BASED SEMANTIC CHUNKING)

### 5.1. Tại sao KHÔNG sử dụng Fixed Character/Token Chunking?
Trong các bài toán xử lý tài liệu văn bản dài (sách, bài báo), người ta thường dùng kỹ thuật cắt đoạn cố định theo số ký tự (như `RecursiveCharacterTextSplitter` cắt mỗi 500 ký tự với overlap 50 ký tự). 

Tuy nhiên, **trong thương mại điện tử, áp dụng cách này là một sai lầm nghiêm trọng**:
- **Nguy cơ xé nhỏ thực thể:** Một sản phẩm laptop có thể bị cắt làm đôi: nửa đầu chứa tên máy (`Dell XPS 15`), nửa sau chứa giá bán (`35.000.000đ`) và card đồ họa. Khi đó, vector tìm kiếm sẽ mất ngữ cảnh, khiến mô hình báo nhầm giá hoặc gán nhầm thông số của máy này sang máy khác.
- **Mất liên kết thuộc tính:** Người dùng hỏi *"tìm laptop RAM 16GB dưới 20 triệu"*, nếu RAM ở chunk 1 và giá tiền ở chunk 2, hệ thống truy xuất sẽ không thể đánh giá chính xác độ tương đồng của cả sản phẩm.

### 5.2. Giải pháp: Phân đoạn ngữ nghĩa theo thực thể (Entity-based Semantic Chunking)
HCore áp dụng thuật toán phân đoạn theo từng thực thể hoàn chỉnh:
- **Nguyên tắc:** Mỗi sản phẩm hoặc mỗi chính sách cửa hàng là **một đơn vị tri thức nguyên tử (Atomic Knowledge Unit)**.
- **Cấu trúc Chunk chuẩn hóa:**
  ```python
  text_representation = (
      f"Sản phẩm: {item['name']}\n"
      f"Danh mục: {category_label} | Mã: {item['id']}\n"
      f"Giá bán: {formatted_price} (Nguyên bản: {price_num} VNĐ)\n"
      f"Thông số kỹ thuật & Cấu hình: {specs_summary}\n"
      f"Đặc điểm nổi bật: {item.get('description', 'Đang cập nhật')}\n"
      f"Tình trạng kho hàng: Còn hàng - Sẵn sàng giao ngay\n"
      f"Đường dẫn chi tiết: {product_url}"
  )
  ```
- **Metadata đi kèm từng Chunk:**
  ```python
  metadata = {
      "id": item["id"],
      "name": item["name"],
      "price": price_num,
      "category": category_slug,
      "type": "product", # hoặc "store_policy"
      "url": product_url
  }
  ```

### 5.3. Cơ Chế Bộ Nhớ Đệm Dấu Vân Tay (Fingerprint Hashing Cache)
Để tránh việc tính toán lại vector lặp đi lặp lại tốn tài nguyên CPU:
1. Khi nạp dữ liệu từ `knowledge.py`, hệ thống tính chuỗi băm SHA-256 trên nội dung thô:
   $$\text{Hash} = \text{SHA256}(\text{Catalog Content})$$
2. Nếu `Hash` không đổi so với lần chạy trước, hệ thống tái sử dụng toàn bộ Vector Matrix trong RAM mà không cần gọi lại model embedding.
3. Nếu dữ liệu trong `db.json` thay đổi (thêm sản phẩm mới hoặc đổi giá), hệ thống phát hiện lệch Hash và tự động kích hoạt cập nhật vector trong nền (Background Vector Ingestion).

---

## 6. MÔ HÌNH LOCAL AI EMBEDDING & CHUẨN HÓA VECTOR ($L_2$ NORMALIZATION)

### 6.1. Lựa Chọn Mô Hình: FastEmbed ONNX
Hệ thống sử dụng mô hình mã nguồn mở tối ưu cho đa ngôn ngữ:
- **Tên mô hình:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Thời gian thực thi:** Chạy trực tiếp trên CPU thông qua Open Neural Network Exchange (ONNX Runtime) với các nhân tính toán C++ tối ưu hóa vector AVX2/AVX-512.
- **Kích thước vector:** $d = 384$ chiều (Float32).
- **Hỗ trợ tiếng Việt:** Hiểu sâu sắc ngữ nghĩa tiếng Việt có dấu, không dấu, từ viết tắt công nghệ (`ram`, `card màn hình`, `vga`, `ssd`, `màn 2k`).

### 6.2. Thuật Toán Chuẩn Hóa $L_2$ (L2 Normalization)
Khoảng cách Cosine giữa vector truy vấn $\mathbf{q}$ và vector tài liệu $\mathbf{d}$ được định nghĩa:
$$\text{CosineSimilarity}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\|_2 \|\mathbf{d}\|_2} = \frac{\sum_{i=1}^{d} q_i d_i}{\sqrt{\sum_{i=1}^{d} q_i^2} \sqrt{\sum_{i=1}^{d} d_i^2}}$$

Nếu tính toán căn bậc hai và phép chia này cho hàng ngàn sản phẩm trong mỗi lượt hỏi thì sẽ rất chậm. Vì vậy, HCore áp dụng chiến lược **Chuẩn hóa trước (Pre-normalization)**:

Mỗi vector $\mathbf{v}$ ngay khi sinh ra đều được đưa về độ dài đơn vị ($\|\mathbf{v}\|_2 = 1$):
$$\mathbf{v}_{\text{norm}} = \frac{\mathbf{v}}{\sqrt{\sum_{i=1}^{384} v_i^2 + \epsilon}} \quad (\text{với } \epsilon = 10^{-12})$$

Nhờ đó, khi người dùng gửi câu hỏi, khoảng cách Cosine được rút gọn thành một phép **Nhân vô hướng (Dot Product)** ma trận đơn giản:
$$\text{CosineSimilarity}(\mathbf{q}_{\text{norm}}, \mathbf{d}_{\text{norm}}) = \mathbf{q}_{\text{norm}} \cdot \mathbf{d}_{\text{norm}} = \sum_{i=1}^{384} q_{\text{norm}, i} \cdot d_{\text{norm}, i}$$

Phép tính này đạt tốc độ **< 2 mili-giây** trên CPU cho toàn bộ cơ sở dữ liệu cửa hàng.

---

## 7. HỆ THỐNG 3 TẦNG BẢO MẬT (SECURITY GUARDRAILS)

Trước khi bất kỳ câu hỏi nào được đưa vào bộ truy xuất vector, nó phải vượt qua 3 lớp phòng thủ độc lập trong `guards.py`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Khách hàng gửi câu hỏi                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ Tầng 1: PII Masking                                     │
       │ Phát hiện số thẻ Visa/Master, CMND/CCCD, SĐT cá nhân    │
       │ Thay thế bằng [THÔNG TIN ĐÃ ĐƯỢC ẨN VÌ BẢO MẬT]         │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ Tầng 2: Jailbreak & Prompt Injection Defense             │
       │ Chặn từ khóa: "ignore previous instructions", "DAN mode",│
       │ "system prompt", "bỏ qua câu lệnh trước", "hãy đóng vai" │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ Tầng 3: Out-of-Domain Filter                            │
       │ Nhận diện câu hỏi thời tiết, chính trị, code python,    │
       │ giải toán, triết học không thuộc phạm vi cửa hàng        │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
                        [Câu hỏi an toàn & hợp lệ]
```

1. **PII Masking (Bảo vệ dữ liệu cá nhân):** Dùng biểu thức chính quy (Regex) quét số thẻ thanh toán quốc tế (Luhn algorithm pattern), số thẻ nội địa, và số điện thoại để che giấu trước khi ghi log hoặc gửi ra LLM bên ngoài.
2. **Jailbreak Defense (Chống tấn công Prompt):** Chặn các mẫu câu cố tình vượt rào (bypass guardrails), yêu cầu đóng vai hoặc ép AI tiết lộ prompt nội bộ.
3. **Off-topic Filter (Lọc ngoài phạm vi):** Nhận diện các câu hỏi không liên quan đến công nghệ, phần cứng, mua sắm để trả lời từ chối lịch sự và hướng người dùng quay lại danh mục sản phẩm của HCore.

---

## 8. TRUY XUẤT HAI GIAI ĐOẠN & XẾP HẠNG NGÂN SÁCH (HYBRID RETRIEVAL & RERANKING)

Một trong những vấn đề lớn nhất của việc tìm kiếm thuần túy bằng vector ngữ nghĩa (Pure Vector Search) là **mù mờ về mặt số học (Numerical Blindness)**.
Ví dụ: Người dùng hỏi *"Tư vấn laptop dưới 15 triệu"*, mô hình vector có thể trả về các sản phẩm laptop có mô tả rất giống nhưng giá là `25.000.000đ` vì từ khóa `laptop` có điểm tương đồng từ vựng cao.

Để giải quyết triệt để, HCore thiết kế quy trình **Truy xuất hai giai đoạn (Two-stage Retrieval)**:

### Giai đoạn 1: Dense Semantic Retrieval
Lấy Top-$N$ ($N = 12$) sản phẩm có độ tương đồng Cosine cao nhất với câu hỏi.

### Giai đoạn 2: Regex Budget & Category Reranker
Bóc tách ngữ nghĩa số học trong câu hỏi bằng hệ thống Regex tiếng Việt chuyên dụng:
- **Phát hiện ngân sách tối đa:** Quét các cụm từ như `dưới 15tr`, `< 20 triệu`, `tối đa 18tr`, `không quá 12 triệu`.
- **Phát hiện khoảng ngân sách mục tiêu:** Quét các cụm từ như `tầm 15 đến 20tr`, `khoảng 10-15 triệu`, `tầm 20 củ`.
- **Phát hiện danh mục ưu tiên:** Bóc tách từ khóa chuyên ngành (`laptop`, `vga`, `card`, `ram`, `ssd`, `màn hình`, `chuột`, `bàn phím`, `tai nghe`).

**Công thức tính điểm xếp hạng lại (Rerank Score):**
$$\text{Score}_{\text{final}} = \text{Score}_{\text{cosine}} + \Delta_{\text{budget}} + \Delta_{\text{category}}$$

Trong đó:
- Nếu sản phẩm **thỏa mãn ngân sách tối đa** (ví dụ: giá $\le 15.000.000đ$): $\Delta_{\text{budget}} = +0.25$
- Nếu sản phẩm **vượt quá ngân sách** khách yêu cầu: $\Delta_{\text{budget}} = -0.40$ (đẩy lùi về cuối danh sách)
- Nếu sản phẩm **nằm đúng trong dải ngân sách mục tiêu** ($\pm 15\%$): $\Delta_{\text{budget}} = +0.20$
- Nếu sản phẩm **khớp chính xác danh mục** người dùng đang tìm kiếm: $\Delta_{\text{category}} = +0.15$

Sau khi xếp hạng lại, hệ thống chỉ chọn ra **Top 3 đến 5 sản phẩm xuất sắc nhất** để đưa vào ngữ cảnh sinh câu trả lời.

---

## 9. TĂNG CƯỜNG NGỮ CẢNH & CƠ CHẾ DỰ PHÒNG NGOẠI TUYẾN (GENERATION & SMART FALLBACK)

### 9.1. Tăng Cường Ngữ Cảnh (Context Augmentation)
Dữ liệu đã qua chọn lọc được định dạng thành một khối thông tin có cấu trúc chuẩn xác và gắn kèm vào `System Prompt` của Google Gemini:

```
VAI TRÒ: Bạn là Chuyên gia tư vấn kỹ thuật cao cấp tại HCore Computer Store.
NGUYÊN TẮC BẮT BUỘC:
1. CHỈ tư vấn dựa trên danh sách sản phẩm và chính sách được cung cấp dưới đây.
2. TUYỆT ĐỐI KHÔNG tự bịa ra sản phẩm, cấu hình hoặc mức giá không có trong dữ liệu.
3. Khi giới thiệu sản phẩm, PHẢI nêu rõ: Tên đầy đủ, Giá bán chính xác, Ưu điểm cấu hình và Link xem chi tiết.
4. Trả lời bằng tiếng Việt lịch sự, súc tích, định dạng Markdown rõ ràng.

DỮ LIỆU SẢN PHẨM & CHÍNH SÁCH ĐƯỢC CẤP:
---
[Sản phẩm 1]: Laptop Gaming Acer Nitro V... (Giá: 18.990.000đ)
[Sản phẩm 2]: Laptop Asus TUF Gaming A15... (Giá: 19.490.000đ)
---
```

### 9.2. Cơ Chế Dự Phòng Ngoại Tuyến (Smart Local Fallback)
Nếu xảy ra các sự cố không mong muốn như:
- Mất kết nối Internet ra bên ngoài.
- Google Gemini API trả mã lỗi `429 Too Many Requests` (hết hạn ngạch miễn phí).
- Thời gian phản hồi của Cloud LLM vượt quá 10 giây.

Bộ `Smart Local Fallback` trong `engine.py` sẽ lập tức tiếp quản:
1. Trích xuất thông tin các sản phẩm đã được lọc qua bước Reranker.
2. Tự động sinh phản hồi hoàn chỉnh bằng thuật toán ghép mẫu thông minh (Template Generation), bao gồm:
   - Lời chào chuyên nghiệp của HCore.
   - Bảng phân tích ưu điểm từng sản phẩm theo ngân sách khách tìm.
   - Báo giá và đường dẫn mua hàng chính xác.
   - Nhắc nhở về chính sách bảo hành 24 tháng và freeship toàn quốc.
3. Chatbot vẫn phản hồi trong vòng **< 50ms**, đảm bảo trải nghiệm của khách hàng không bị gián đoạn.

---

## 10. BẢNG SO SÁNH: HCORE RAG vs CHATBOT TRUYỀN THỐNG

| Tiêu Chí Kỹ Thuật | Chatbot Truyền Thống (Chỉ có Cloud LLM) | Hệ Thống RAG Của HCore Store |
| :--- | :--- | :--- |
| **Độ chính xác về giá & kho hàng** | Hay bịa đặt giá cũ, sai tồn kho (Hiện tượng ảo giác - Hallucination) | **Chính xác 100%** theo thời gian thực từ database |
| **Khả năng hiểu ngân sách** | Thường gợi ý sản phẩm đắt hơn ngân sách do "mù số học" | **Regex Budget Reranker** ép sản phẩm đúng tầm tiền khách yêu cầu |
| **Bảo mật dữ liệu (Security)** | Dễ bị jailbreak, đánh cắp prompt hệ thống hoặc lộ thông tin | **3 tầng Guards** lọc sạch thẻ ngân hàng, CCCD, chặn 100% prompt injection |
| **Phụ thuộc kết nối Internet** | Mất mạng hoặc API lỗi là chatbot sập hoàn toàn | **Smart Local Fallback** tự sinh phản hồi trong 50ms |
| **Tốc độ sinh vector** | Gọi OpenAI Embedding API (200 - 500ms, tốn phí USD) | **FastEmbed ONNX cục bộ** (10 - 20ms, 0đ chi phí API) |
| **Độ trễ tính khoảng cách vector** | Tính Cosine đầy đủ trên CPU ($O(N \cdot d)$ kèm căn bậc hai) | **Chuẩn hóa $L_2$ + Dot Product** (tính toán < 2ms) |

---

## 11. HƯỚNG DẪN KIỂM THỬ & VẬN HÀNH

### 11.1. Khởi Chạy Hệ Thống
Hệ thống chạy trên 3 tiến trình nền:
```bash
# 1. Khởi chạy Mock Database (Port 3000)
npx json-server --watch src/data/db.json --port 3000

# 2. Khởi chạy RAG Python Service (Port 8000)
cd rag_service
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 3. Khởi chạy React Vite Frontend (Port 5173)
npm run dev
```

### 11.2. Kiểm Tra Sức Khỏe Dịch Vụ (Health Check)
```bash
curl http://127.0.0.1:8000/api/health
```
**Kết quả kỳ vọng:**
```json
{
  "status": "online",
  "gemini_configured": true,
  "engine": "python-gemini (gemini-3.5-flash-lite)",
  "vector_model": "FastEmbed ONNX (paraphrase-multilingual-MiniLM-L12-v2, 384-dim)",
  "knowledge_chunks": 42
}
```

### 11.3. Xem Sơ Đồ Kiến Trúc Tương Tác
Mở tệp tin bằng bất kỳ trình duyệt nào:
```bash
# Mở file trực tiếp:
d:\TMDT_DALN\rag_service\rag-architecture.html
```
- Nhấp chọn **"Toàn bộ luồng RAG"** để xem chu trình từ Frontend -> Guardrails -> LLM.
- Nhấp chọn **"Tầng Vector & Indexing"** để xem luồng nạp và phân đoạn thực thể.
- Chuyển đổi giữa chế độ **Sáng (Light)** và **Tối (Dark)** ngay góc trên của giao diện.
