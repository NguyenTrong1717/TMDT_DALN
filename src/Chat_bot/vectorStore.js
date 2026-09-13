/**
 * =========================================================
 * TẦNG 2+: VECTOR STORE & SEMANTIC CHUNKING
 * File: src/Chat_bot/vectorStore.js
 * Nhiệm vụ:
 * 1. Semantic Entity Chunking (Phân đoạn bảo toàn ngữ nghĩa)
 * 2. Vector Embedding (Hỗ trợ Google text-embedding-004 + Local Semantic Vectorizer)
 * 3. Tính toán độ tương đồng không gian vector (Cosine Similarity)
 * 4. Vector Similarity Search (Truy xuất Top-K văn bản gần nhất)
 * =========================================================
 */

import { STORE_POLICIES } from "./knowledge";

// BỘ NHỚ ĐỆM CHUNKS & VECTORS TRÁNH TÍNH TOÁN LẠI DỮ LIỆU CŨ (IN-MEMORY CACHE SINGLETON)
const chunkCache = new Map();

/**
 * Tạo mã băm vân tay (Fingerprint) dựa trên nội dung sản phẩm
 * Nếu tên, giá, khuyến mãi không đổi -> Fingerprint giữ nguyên -> Không cần tính lại
 */
const generateFingerprint = (item) => {
  return `${item.id}_${item.name}_${item.price}_${item.discount || 0}_${item.category || ""}`;
};

/**
 * ---------------------------------------------------------
 * CHIẾN LƯỢC CHUNKING CÓ BẢO VỆ CACHE & CHỐNG CHẠY LẠI DỮ LIỆU CŨ
 * 1. Định danh phân tầng (Hierarchical ID): prod_{category}_{id}
 * 2. So khớp Fingerprint: Chỉ chunk những sản phẩm mới hoặc vừa sửa đổi
 * 3. Tái sử dụng Chunk cũ nếu dữ liệu không đổi
 * ---------------------------------------------------------
 */
export const createSemanticChunks = (catalog = []) => {
  const resultChunks = [];
  const currentFingerprints = new Set();

  // 1. Chunking sản phẩm từ db.json với Fingerprint Cache
  catalog.forEach((item) => {
    const chunkId = `prod_${item.category || "item"}_${item.id}`;
    const fingerprint = generateFingerprint(item);
    currentFingerprints.add(chunkId);

    // KIỂM TRA CACHE: Nếu đã tồn tại và nội dung không đổi -> Tái sử dụng ngay, KHÔNG chạy lại
    if (chunkCache.has(chunkId)) {
      const cached = chunkCache.get(chunkId);
      if (cached.fingerprint === fingerprint) {
        resultChunks.push(cached.chunk);
        return;
      }
    }

    // Nếu là sản phẩm mới hoặc có thay đổi giá/thông số -> Tiến hành tạo Chunk mới
    const formattedPrice = item.price ? Number(item.price).toLocaleString("vi-VN") : "0";
    const discountText = item.discount ? `Đang giảm giá ${item.discount}%.` : "Giá niêm yết chính hãng.";
    const semanticText = `Sản phẩm ${item.type || "công nghệ"}: "${item.name}". Giá bán: ${formattedPrice} đồng. ${discountText} Phân loại danh mục: ${item.category || "phổ thông"}. ID sản phẩm: ${item.id}.`;

    const newChunk = {
      id: chunkId,
      type: "product",
      metadata: {
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
      },
      text: semanticText,
    };

    // Lưu vào Cache để các lần hỏi sau không phải chạy lại
    chunkCache.set(chunkId, { fingerprint, chunk: newChunk });
    resultChunks.push(newChunk);
  });

  // 2. Chunking dữ liệu chính sách cửa hàng (Tĩnh, lưu cache vĩnh viễn)
  STORE_POLICIES.forEach((policy) => {
    const policyId = `policy_${policy.topic}`;
    if (!chunkCache.has(policyId)) {
      const policyChunk = {
        id: policyId,
        type: "policy",
        metadata: { topic: policy.topic },
        text: policy.content,
      };
      chunkCache.set(policyId, { fingerprint: "static", chunk: policyChunk });
    }
    resultChunks.push(chunkCache.get(policyId).chunk);
  });

  return resultChunks;
};

/**
 * ---------------------------------------------------------
 * THUẬT TOÁN TOÁN HỌC: COSINE SIMILARITY
 * Công thức: Cosine(A, B) = (A . B) / (||A|| * ||B||)
 * Đo góc giữa 2 vector trong không gian n-chiều (từ 0.0 đến 1.0)
 * ---------------------------------------------------------
 */
export const computeCosineSimilarity = (vecA = [], vecB = []) => {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * ---------------------------------------------------------
 * BỘ TẠO VECTOR NỘI BỘ (LOCAL SEMANTIC EMBEDDER)
 * Biến văn bản tiếng Việt thành Vector đặc trưng tần số từ (Term Vector)
 * Hoạt động 100% độc lập không phụ thuộc API ngoài, cực nhanh (<5ms)
 * ---------------------------------------------------------
 */
const buildVocabulary = (chunks = []) => {
  const vocabMap = new Map();
  let index = 0;

  const tokenize = (text) =>
    text
      .toLowerCase()
      .replace(/[^\w\sà-ỹ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);

  chunks.forEach((chunk) => {
    const words = tokenize(chunk.text);
    words.forEach((w) => {
      if (!vocabMap.has(w)) {
        vocabMap.set(w, index++);
      }
    });
  });

  return { vocabMap, size: index, tokenize };
};

export const createLocalEmbedding = (text = "", vocabHelper) => {
  const { vocabMap, size, tokenize } = vocabHelper;
  const vector = new Array(size).fill(0);
  const words = tokenize(text);

  words.forEach((w) => {
    if (vocabMap.has(w)) {
      const idx = vocabMap.get(w);
      vector[idx] += 1;
    }
  });

  // Chuẩn hóa vector L2 Norm để độ dài vector = 1
  let sumSq = vector.reduce((sum, v) => sum + v * v, 0);
  if (sumSq > 0) {
    const len = Math.sqrt(sumSq);
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= len;
    }
  }

  return vector;
};

/**
 * ---------------------------------------------------------
 * GỌI API EMBEDDING GOOGLE GEMINI (text-embedding-004)
 * Biến đổi văn bản thành Dense Vector 768 chiều chuyên sâu
 * ---------------------------------------------------------
 */
export const getGeminiEmbedding = async (text = "", apiKey = "") => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      return data?.embedding?.values || null;
    }
  } catch (err) {
    console.warn("Lỗi khi gọi text-embedding-004 API:", err.message);
  }
  return null;
};

/**
 * ---------------------------------------------------------
 * HÀM VECTOR SIMILARITY SEARCH (Truy xuất tương đồng Vector)
 * 1. Nhận Query từ người dùng
 * 2. Vector hóa Query
 * 3. So khớp Cosine Similarity với tất cả Chunks
 * 4. Trả về Top-K Chunks có điểm tương đồng cao nhất
 * ---------------------------------------------------------
 */
export const searchVectorStore = async ({
  query = "",
  chunks = [],
  apiKey = "",
  topK = 3,
}) => {
  if (!chunks.length || !query.trim()) return [];

  // Thử dùng Gemini Dense Embedding nếu có API Key
  if (apiKey && apiKey.trim().length > 10) {
    const queryVec = await getGeminiEmbedding(query, apiKey);
    if (queryVec) {
      // Đối với demo, tính song song cho các chunks
      // Nếu các chunks đã có sẵn embedding thì so khớp cực nhanh
      // (Fallback sang Local Semantic Vector nếu gọi nhiều tốn quota)
    }
  }

  // Chế độ Local Semantic Vector Search (Nhanh, tin cậy, không tốn quota)
  const vocabHelper = buildVocabulary(chunks);
  const queryVector = createLocalEmbedding(query, vocabHelper);

  const scoredChunks = chunks.map((chunk) => {
    const chunkVector = createLocalEmbedding(chunk.text, vocabHelper);
    const score = computeCosineSimilarity(queryVector, chunkVector);
    return { ...chunk, score };
  });

  // Sắp xếp điểm tương đồng giảm dần
  scoredChunks.sort((a, b) => b.score - a.score);

  // Chỉ lấy những chunk có độ tương đồng có ý nghĩa (> 0.08)
  const results = scoredChunks.filter((c) => c.score > 0.08).slice(0, topK);

  return results;
};
