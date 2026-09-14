/**
 * HCORE STORE - MIGRATION TOOL: db.json -> MongoDB
 * File: scripts/migrate_to_mongodb.mjs
 * Chạy lệnh: node scripts/migrate_to_mongodb.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "tmdt_daln";
const DB_JSON_PATH = path.resolve(__dirname, "../db.json");

async function runMigration() {
  console.log("🚀 Bắt đầu quá trình kết nối và đồng bộ dữ liệu vào MongoDB...");
  console.log(`📡 URI: ${MONGO_URI}`);
  console.log(`🗄️ Database: ${DB_NAME}`);

  if (!fs.existsSync(DB_JSON_PATH)) {
    console.error(`❌ Không tìm thấy file db.json tại ${DB_JSON_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_JSON_PATH, "utf8");
  const data = JSON.parse(raw);

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log(`✅ Đã kết nối thành công tới MongoDB (${DB_NAME})!`);

    const db = client.db(DB_NAME);

    const keys = Object.keys(data).filter((k) => k !== "$schema");
    console.log(`📦 Tìm thấy ${keys.length} bảng dữ liệu cần chuyển giao sang MongoDB:`);

    let totalDocs = 0;

    for (const key of keys) {
      const items = Array.isArray(data[key]) ? data[key] : [];
      const col = db.collection(key);

      // Xóa collection cũ trước khi nạp lại dữ liệu khởi tạo
      await col.deleteMany({});

      if (items.length > 0) {
        // Chuẩn hóa và thêm id làm index
        const docs = items.map((item) => ({ ...item }));
        await col.insertMany(docs);
        try {
          await col.createIndex({ id: 1 });
        } catch {
          // Bỏ qua lỗi index
        }
        totalDocs += items.length;
        console.log(`  + [${key}]: Đã nạp ${items.length} bản ghi vào MongoDB.`);
      } else {
        console.log(`  + [${key}]: Rỗng (0 bản ghi).`);
      }
    }

    console.log("--------------------------------------------------");
    console.log(`🎉 HOÀN TẤT ĐỒNG BỘ! Tổng cộng: ${totalDocs} bản ghi đã nằm trong database '${DB_NAME}'.`);
    console.log("👉 Bạn có thể mở MongoDB Compass và kiểm tra database 'tmdt_daln' ngay bây giờ!");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình di chuyển dữ liệu:", error);
  } finally {
    await client.close();
  }
}

runMigration();
