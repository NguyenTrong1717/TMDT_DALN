/**
 * =========================================================
 * TẦNG 2: RETRIEVAL LAYER (BỘ TRUY XUẤT THÔNG TIN - RAG)
 * File: src/Chat_bot/retriever.js
 * Nhiệm vụ: Tìm kiếm thông tin khớp nhất từ Knowledge Base dựa trên câu hỏi
 * =========================================================
 */

import { STORE_POLICIES } from "./knowledge";
import { createSemanticChunks, searchVectorStore } from "./vectorStore";

/**
 * Chuẩn hóa chuỗi tiếng Việt: loại bỏ dấu, viết thường
 * Giúp nhận diện được cả "bảo hành" lẫn "bao hanh", "15 triệu" lẫn "15tr"
 */
export const normalizeText = (str = "") => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
};

/**
 * HÀM RETRIEVAL KẾT HỢP (HYBRID RETRIEVER: VECTOR SIMILARITY + METADATA FILTER)
 * 1. Chuyển đổi dữ liệu thành các Semantic Chunks
 * 2. Tính Vector Similarity qua Cosine Similarity để tìm Top-K Chunks sát nghĩa nhất
 * 3. Bổ trợ lọc theo ngân sách nếu người dùng có nhập số tiền
 */
export const retrieveContexts = async (userQuery = "", catalog = [], apiKey = "") => {
  const normQuery = normalizeText(userQuery);

  // 1. Semantic Chunking kho tri thức
  const allChunks = createSemanticChunks(catalog);

  // 2. Tìm kiếm tương đồng Vector (Cosine Similarity)
  const vectorHits = await searchVectorStore({
    query: userQuery,
    chunks: allChunks,
    apiKey,
    topK: 3,
  });

  if (vectorHits && vectorHits.length > 0) {
    return vectorHits.map((hit) => ({
      type: hit.type,
      text: hit.text,
      score: hit.score,
    }));
  }

  // Fallback lọc từ khóa nếu câu hỏi quá ngắn hoặc điểm vector thấp
  const relevantContexts = [];
  for (const policy of STORE_POLICIES) {
    const isMatched = policy.keywords.some((kw) =>
      normQuery.includes(normalizeText(kw))
    );
    if (isMatched) {
      relevantContexts.push({
        type: "policy",
        text: policy.content,
      });
    }
  }

  return relevantContexts;
};
