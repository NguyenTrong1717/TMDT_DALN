# Chương 3. Giao diện bên ngoài

## 3.1 Giao diện người dùng
{{TODO: các màn hình chính - trang chủ, chi tiết sản phẩm, giỏ hàng, thanh toán, kết quả thanh toán, admin, chatbot}}

## 3.2 Giao diện phần cứng
Không áp dụng (ứng dụng web).

## 3.3 Giao diện phần mềm và API bên thứ ba
| Hệ thống | Mục đích | Giao thức | Ghi chú |
| :-- | :-- | :-- | :-- |
| VNPAY Sandbox | Thanh toán | HTTPS redirect + IPN | PAY 2.1.0, HMAC-SHA512 |
| MoMo Sandbox | Thanh toán | HTTPS + IPN | {{TODO}} |
| Google Gemini | Sinh câu trả lời | HTTPS REST | {{TODO}} |
| MongoDB Atlas | Lưu trữ dữ liệu | MongoDB driver | {{TODO}} |

## 3.4 Giao diện giữa các thành phần nội bộ
{{TODO: Frontend ↔ Backend REST; Frontend ↔ RAG `POST /api/chat`}}
