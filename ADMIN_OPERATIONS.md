# HCore Store — Nghiệp vụ quản trị & Vận hành hệ thống

## Phạm vi đã đối chiếu

Backend chạy mặc định là `server_mongodb.mjs` qua `npm run server`. `server.mjs` chỉ còn dành cho test JSON cô lập và bị chặn nếu không đặt `ALLOW_LEGACY_JSON_SERVER=yes`; không dùng backend này để demo hoặc vận hành.

| Chức năng | Frontend | API chính | Vấn đề đã xác nhận và cách xử lý | Ưu tiên |
| --- | --- | --- | --- | --- |
| Đăng nhập/phân quyền | Login, App, Admin | `/api/auth/*` | Bỏ tin cậy `x-user-id`/role phía trình duyệt; dùng bearer session, hash scrypt, kiểm tra khóa và role | P0 |
| Đơn hàng | Checkout, UserOrders, AdminOrders | `/api/orders/*`, `/api/admin/orders/*` | State machine, optimistic version, API shipping/note/COD/cancel, dữ liệu admin/khách tách riêng | P0 |
| Thanh toán | Checkout, PaymentResult | `/api/payments/vnpay/*`, `/api/payments/momo/*` | Giữ cấu hình/chữ ký hiện có; callback và checkout idempotent; online chỉ cập nhật từ callback đã xác minh | P0 |
| Kho | ProductManager | `/api/admin/inventory/adjust` | Cập nhật có điều kiện theo version, nguồn collection rõ ràng, movement log; không cho CRUD sản phẩm ghi đè kho | P0 |
| Trả/hoàn | UserOrders, AdminOrders | `/api/orders/:id/returns`, `/api/admin/returns/*` | Tách tạo, duyệt, tiếp nhận, restock và hoàn thủ công; giới hạn số tiền/số lượng và chống gửi lặp | P0 |
| Khách hàng | UserManager | `/api/admin/users`, `/api/users/me` | Chuẩn hóa `totalAmount`, `createdAt`, `userId`, chi tiêu thuần và hạng thành viên | P1 |
| Voucher/Flash Sale | VoucherManager, FlashSaleManager | `/api/vouchers/:id/claim`, resource allowlist | Backend kiểm tra hạn/mức giảm/lượt nhận/kết hợp và tự chốt giá snapshot | P1 |
| Thống kê | Statistics | `/api/admin/statistics` | Bỏ số cố định/fallback; kỳ hiện tại và kỳ trước lấy từ dữ liệu thật theo Asia/Ho_Chi_Minh | P1 |
| Dịch vụ/audit | AdminServiceRequests, AuditLogManager | resource dịch vụ, `/api/admin/audit-logs` | Transition hợp lệ, assignee/note; audit do backend tạo, không seed/fallback giả | P1 |

## Quyền

- `admin`: toàn bộ nghiệp vụ; riêng thanh toán online vẫn chỉ do callback cổng đã xác minh cập nhật.
- `warehouse`: xem đơn, xác nhận đóng gói/giao/đã giao, tiếp nhận trả hàng, nhập lại hàng đủ điều kiện và điều chỉnh kho có lý do. Không cấp quyền, đổi giá hoặc xác nhận hoàn tiền.
- `support`: xem dữ liệu khách cần thiết, xử lý dịch vụ, duyệt/từ chối yêu cầu trả. Không đổi giá/kho/quyền và không xác nhận hoàn tiền.
- `user`: chỉ đọc/sửa tài nguyên thuộc tài khoản; không sửa role, giá, kho, đơn hay trạng thái thanh toán.

Không thể khóa hoặc hạ quyền quản trị viên hoạt động cuối cùng.

## Đơn hàng và thanh toán

Luồng duy nhất: `pending → confirmed → shipping → delivered → completed`. Chỉ `pending` và `confirmed` được hủy. Đơn online chưa `paid` không được giao; COD chỉ `completed` sau khi đã `delivered` và có mã đối soát thu tiền. Mỗi lần đổi trạng thái lưu trạng thái cũ/mới, actor, thời gian và lý do.

VNPAY và MoMo giữ nguyên cấu hình môi trường hiện có. Backend xác minh chữ ký/số tiền trước khi ghi nhận. `requestId`, mã lần thanh toán và trạng thái đã xử lý ngăn tạo đơn, trừ kho, dùng voucher hoặc ghi tiền hai lần. Callback thành công đến muộn chỉ chốt đơn nếu còn đủ hàng; nếu hết hàng trả lỗi để xử lý thủ công, không âm thầm bán vượt tồn.

Mã tracking tự sinh có `trackingCodeSource=internal_demo`: đây chỉ là mã nội bộ cho demo, không phải vận đơn đã tạo với hãng.

## Tồn kho

- `available`: số hàng thực tế trong `stockLeft` (tương thích dữ liệu cũ qua `stock`).
- `reserved`: số lượng của đơn VNPAY/MoMo `pending` còn trong thời hạn giữ 15 phút.
- `sellable`: `available - reserved`.
- COD trừ kho khi backend tạo đơn; online chỉ giữ hàng và trừ sau callback thành công. Hủy đơn đã trừ kho giải phóng đúng một lần.
- Điều chỉnh, bán, hủy và trả kho đều tạo inventory movement. Product metadata không được ghi đè tồn kho.

MongoDB standalone không hỗ trợ transaction nhiều document. Bản hiện tại tuần tự hóa mutation trong một process, dùng unique index/idempotency key, version/state predicate và marker restock/refund trên bản ghi. Nếu chạy nhiều instance production, cần MongoDB replica set/transaction hoặc distributed lock; không nên coi khóa in-process là đủ cho cụm nhiều server.

## Trả hàng và hoàn tiền

Luồng: `requested → approved → processing → completed`, hoặc `rejected/failed`. `completed` chỉ được tạo qua API hoàn thủ công có số tiền dương, mã tham chiếu và bằng chứng. Restock chỉ cộng số thực nhận được đánh dấu bán lại được; marker theo RMA bảo đảm một mặt hàng không cộng hai lần.

`manual-refund` chỉ **ghi nhận chứng từ hoàn tiền đã thực hiện bên ngoài**. Nó không gọi ngân hàng/VNPAY/MoMo và giao diện không thông báo đã chuyển tiền chỉ vì database cập nhật thành công.

## Báo cáo

- Giá trị đơn: đơn tạo trong kỳ (`createdAt`).
- Tiền thu: đơn có `paidAt` trong kỳ.
- Tiền hoàn: chứng từ hoàn thủ công có `confirmedAt` trong kỳ.
- Doanh thu thuần: tiền thu trừ tiền hoàn.
- Lợi nhuận luôn để `null` khi chưa có giá vốn xác thực; không suy ra theo phần trăm giá bán.

Ngày lọc được hiểu theo `Asia/Ho_Chi_Minh`; tăng trưởng so với kỳ liền trước có cùng độ dài.

## Migration an toàn

1. Sao lưu MongoDB và file nguồn trước khi chạy.
2. Kiểm tra `MONGO_URI`, `DB_NAME`; không thay các biến VNPAY/MoMo.
3. Chạy `npm run migrate:mongo`. Mặc định script upsert theo `id`, hash mật khẩu cũ và xóa plaintext, không xóa collection.
4. Chỉ dùng `--replace` khi thực sự muốn thay dữ liệu và đã đặt `ALLOW_DESTRUCTIVE_MIGRATION=yes`.
5. Tài khoản plaintext cũ cũng tự chuyển sang scrypt ở lần đăng nhập thành công đầu tiên.

## Kịch bản demo

1. Đăng nhập user, đặt COD; bấm lại cùng request không tạo đơn/trừ kho lần hai.
2. Admin xác nhận; warehouse bàn giao bằng mã nội bộ demo, đánh dấu đã giao.
3. Thử hoàn tất COD trước thu tiền để thấy API từ chối; nhập mã đối soát COD rồi hoàn tất.
4. Với VNPAY, thanh toán qua luồng sandbox đang cấu hình; tải lại callback/kết quả để chứng minh không ghi nhận hai lần.
5. User gửi yêu cầu hủy ở `pending/confirmed`; admin nhập lý do và hủy. Đơn đã thanh toán phải xử lý hoàn trước.
6. User gửi RMA sau giao hàng; support duyệt, warehouse nhận/kiểm tra và restock, admin nhập chứng từ hoàn thủ công. Tải lại trang để xem trạng thái, số nhập kho và chứng từ còn nguyên.
7. Mở thống kê theo khoảng ngày và audit log để giải thích quy tắc ghi nhận và actor thực tế.
