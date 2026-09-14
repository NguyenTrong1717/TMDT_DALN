# HCore Store - Tài liệu Dữ liệu Database (Nhánh feature/database-data)

Nhánh này được tạo riêng biệt để lưu trữ và quản lý trọn bộ **Dữ liệu Database (Seed Data)** và **Công cụ di chuyển dữ liệu (Migration Tools)** của dự án HCore Store.

---

## 1. Cấu trúc dữ liệu trên nhánh này

* **`db.json`**: Bản snapshot dữ liệu JSON chuẩn xác nhất được xuất trực tiếp từ MongoDB Atlas Cloud (21 collections, bao gồm toàn bộ danh mục sản phẩm, người dùng, đánh giá chân thực, tin tức, banner, thông báo, voucher và cấu hình hệ thống).
* **`scripts/migrate_to_mongodb.mjs`**: Script nạp tự động toàn bộ dữ liệu từ `db.json` lên MongoDB (hỗ trợ cả MongoDB Atlas Cloud và MongoDB Local).
* **`scripts/update_stocks.mjs`**: Script tự động đồng bộ và nạp số lượng tồn kho (`stock: 25`, `stockLeft: 25`, `status: "Còn hàng"`) cho tất cả sản phẩm.
* **`server_mongodb.mjs`**: Máy chủ Express RESTful API kết nối trực tiếp với MongoDB.

---

## 2. Hướng dẫn nạp dữ liệu vào MongoDB

### Bước 1: Cấu hình biến môi trường trong file `.env`
```env
# MongoDB Atlas Cloud (hoặc mongodb://localhost:27017 nếu chạy local)
MONGO_URI=mongodb+srv://nhom18daln_db_user:Nhom18daln2026@clusterdaln.gl39l4e.mongodb.net/?retryWrites=true&w=majority
DB_NAME=tmdt_daln
PORT=3000
```

### Bước 2: Chạy lệnh đồng bộ dữ liệu
```bash
node scripts/migrate_to_mongodb.mjs
```
Toàn bộ 21 collections từ `db.json` sẽ được nạp sạch sẽ lên MongoDB!
