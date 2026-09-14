/**
 * HCORE STORE - EXPRESS MONGODB BACKEND SERVER
 * File: server_mongodb.mjs
 * Port: 3000
 * Database: mongodb://localhost:27017/tmdt_daln
 *
 * Nhiệm vụ:
 * Cung cấp RESTful API kết nối trực tiếp với MongoDB Local (27017).
 * Tương thích 100% với toàn bộ code fetch của React Frontend hiện tại.
 */

import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = "tmdt_daln";

app.use(cors());
app.use(express.json());

let db;
let client;

// Khởi tạo kết nối MongoDB
async function initMongoDB() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✅ [MongoDB Backend] Đã kết nối thành công tới ${MONGO_URI}/${DB_NAME}`);
  } catch (err) {
    console.error(`❌ [MongoDB Backend] Không thể kết nối MongoDB:`, err.message);
    process.exit(1);
  }
}

// Helper: Chuẩn hóa document trả về client (bảo toàn id dạng string/number)
function formatDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    id: doc.id !== undefined ? doc.id : String(_id),
    ...rest,
  };
}

// Helper: Xây dựng query tìm kiếm theo id linh hoạt (hỗ trợ cả number, string và ObjectId)
function buildIdQuery(idParam) {
  const queries = [{ id: idParam }];
  const numId = Number(idParam);
  if (!isNaN(numId)) {
    queries.push({ id: numId });
  }
  if (ObjectId.isValid(idParam)) {
    queries.push({ _id: new ObjectId(idParam) });
  }
  return { $or: queries };
}

// -------------------------------------------------------------
// 1. HEALTH CHECK & STATUS
// -------------------------------------------------------------
app.get("/api/db-status", async (req, res) => {
  try {
    const cols = await db.listCollections().toArray();
    res.json({
      status: "connected",
      database: DB_NAME,
      uri: MONGO_URI,
      collections: cols.map((c) => c.name),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. GET LIST (Hỗ trợ lọc, tìm kiếm, sắp xếp, phân trang)
// GET /:resource
// Ví dụ: GET /orders?userId=1&status=pending&_sort=createdAt&_order=desc
// -------------------------------------------------------------
app.get("/:resource", async (req, res) => {
  try {
    const { resource } = req.params;
    const col = db.collection(resource);

    const query = {};
    const { _sort, _order, _page, _limit, q, ...filters } = req.query;

    // Lọc theo các trường truyền vào query
    for (const [key, value] of Object.entries(filters)) {
      if (value === "true") query[key] = true;
      else if (value === "false") query[key] = false;
      else if (!isNaN(Number(value)) && String(Number(value)) === value) {
        // Hỗ trợ tìm kiếm cả dạng chuỗi và dạng số
        query[key] = { $in: [value, Number(value)] };
      } else {
        query[key] = value;
      }
    }

    // Tìm kiếm từ khóa chung (q=...)
    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ name: regex }, { fullName: regex }, { code: regex }];
    }

    let cursor = col.find(query);

    // Sắp xếp
    if (_sort) {
      const sortDirection = _order === "asc" ? 1 : -1;
      cursor = cursor.sort({ [_sort]: sortDirection });
    }

    // Phân trang
    if (_page && _limit) {
      const page = Math.max(1, parseInt(_page, 10));
      const limit = Math.max(1, parseInt(_limit, 10));
      cursor = cursor.skip((page - 1) * limit).limit(limit);
    }

    const docs = await cursor.toArray();
    res.json(docs.map(formatDoc));
  } catch (err) {
    console.error(`[GET /${req.params.resource}] Lỗi:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. GET DETAIL BY ID
// GET /:resource/:id
// -------------------------------------------------------------
app.get("/:resource/:id", async (req, res) => {
  try {
    const { resource, id } = req.params;
    const col = db.collection(resource);
    const doc = await col.findOne(buildIdQuery(id));

    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    }

    res.json(formatDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. CREATE NEW RECORD
// POST /:resource
// -------------------------------------------------------------
app.post("/:resource", async (req, res) => {
  try {
    const { resource } = req.params;
    const col = db.collection(resource);
    const newDoc = { ...req.body };

    // Tự sinh ID nếu client chưa truyền
    if (newDoc.id === undefined) {
      newDoc.id = Date.now().toString();
    }

    await col.insertOne(newDoc);
    res.status(201).json(formatDoc(newDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. UPDATE RECORD (PATCH)
// PATCH /:resource/:id
// -------------------------------------------------------------
app.patch("/:resource/:id", async (req, res) => {
  try {
    const { resource, id } = req.params;
    const col = db.collection(resource);
    const query = buildIdQuery(id);

    const updateFields = { ...req.body };
    delete updateFields._id; // Không ghi đè _id của MongoDB

    const result = await col.findOneAndUpdate(
      query,
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật" });
    }

    res.json(formatDoc(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. REPLACE RECORD (PUT)
// PUT /:resource/:id
// -------------------------------------------------------------
app.put("/:resource/:id", async (req, res) => {
  try {
    const { resource, id } = req.params;
    const col = db.collection(resource);
    const query = buildIdQuery(id);

    const replacement = { ...req.body };
    delete replacement._id;
    if (replacement.id === undefined) replacement.id = id;

    const result = await col.findOneAndReplace(query, replacement, {
      returnDocument: "after",
    });

    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy bản ghi để thay thế" });
    }

    res.json(formatDoc(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. DELETE RECORD
// DELETE /:resource/:id
// -------------------------------------------------------------
app.delete("/:resource/:id", async (req, res) => {
  try {
    const { resource, id } = req.params;
    const col = db.collection(resource);
    const query = buildIdQuery(id);

    const result = await col.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: `Không tìm thấy id ${id} để xóa` });
    }

    res.json({ success: true, message: "Xóa thành công khỏi MongoDB" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Khởi chạy server sau khi kết nối MongoDB thành công
initMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 [MongoDB Backend Server] Đang chạy tại http://localhost:${PORT}`);
    console.log(`📊 Kiểm tra trạng thái DB: http://localhost:${PORT}/api/db-status`);
  });
});
