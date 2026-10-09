# Chương 8. Kết luận và hướng phát triển

## 8.1 Kết quả đạt được
- Hệ thống 3 tầng: React, Node/MongoDB, Python RAG.
- Thanh toán VNPAY Sandbox có xác minh chữ ký IPN; bộ test thanh toán 12/12 pass.
- Chatbot RAG dùng embedding cục bộ, có 3 tầng bảo mật và fallback ngoại tuyến.
- Đóng gói được bằng Docker Compose.

## 8.2 Hạn chế hiện tại
- Xác thực demo bằng header `x-user-id`, chưa dùng JWT.
- Đăng nhập Google/Facebook mới là thông báo, chưa tích hợp OAuth2.
- Biểu đồ thống kê theo tháng vẫn dùng dữ liệu mẫu.
- Mã giảm giá có danh sách dự phòng nằm trong frontend; cần kiểm tra hoàn toàn ở backend.
- Thanh toán mới ở môi trường Sandbox.
- Chưa có kiểm thử giao diện tự động (E2E).

## 8.3 Hướng phát triển

| Nhóm | Hướng phát triển | Giải quyết hạn chế |
| :-- | :-- | :-- |
| Bảo mật | JWT + refresh token, OAuth2, rate limiting, bcrypt | Xác thực demo, đăng nhập mạng xã hội |
| AI/RAG | Hybrid search, cross-encoder reranker, streaming, nhớ ngữ cảnh | Chất lượng truy xuất |
| Hạ tầng | CI/CD, Kubernetes, message broker | Triển khai thủ công |
| Nghiệp vụ | VNPAY/MoMo Production, kho đa showroom, hoàn tiền | Chỉ có Sandbox |
| Trải nghiệm | PWA / ứng dụng di động, đa ngôn ngữ, code-splitting | Bundle JS lớn |
| Chất lượng | E2E (Playwright), kiểm thử tải API, giám sát | Thiếu E2E |

## 8.4 Kết luận chung
{{TODO}}
