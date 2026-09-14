import fs from "fs";
import { MongoClient } from "mongodb";

process.loadEnvFile?.();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "tmdt_daln";
const dbFile = [new URL("../db.json", import.meta.url), new URL("../db.json.bak", import.meta.url)].find((f) => fs.existsSync(f));

async function migrate() {
  if (!dbFile) {
    console.error("❌ Không tìm thấy file dữ liệu gốc (db.json hoặc db.json.bak)");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`✅ Kết nối MongoDB: ${dbName}`);

    let totalDocs = 0;
    for (const [key, items] of Object.entries(data)) {
      if (!Array.isArray(items) || key.startsWith("$")) continue;
      const col = db.collection(key);
      await col.deleteMany({});
      if (items.length > 0) {
        await col.insertMany(items.map((item) => ({ ...item })));
        await col.createIndex({ id: 1 }).catch(() => {});
        totalDocs += items.length;
        console.log(`  + [${key}]: ${items.length} bản ghi`);
      }
    }
    console.log(`🎉 Đồng bộ hoàn tất: ${totalDocs} bản ghi vào '${dbName}'`);
  } catch (err) {
    console.error("❌ Lỗi di chuyển dữ liệu:", err.message);
  } finally {
    await client.close();
  }
}

migrate();
