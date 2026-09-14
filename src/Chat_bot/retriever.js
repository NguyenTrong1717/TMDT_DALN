/**
 * =========================================================
 * TẦNG 2: RETRIEVAL LAYER (BỘ TRUY XUẤT THÔNG TIN - RAG)
 * File: src/Chat_bot/retriever.js
 * Nhiệm vụ: Tìm kiếm thông tin khớp nhất từ Knowledge Base dựa trên câu hỏi
 * =========================================================
 */

import { STORE_POLICIES } from "./knowledge.js";
import { createSemanticChunks, searchVectorStore } from "./vectorStore.js";

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
 * Bóc tách ngân sách và danh mục từ câu hỏi người dùng
 * Hỗ trợ: "dưới 15tr", "tầm 15 triệu", "15 cu", "15tr", "pc", "laptop", "linh kiện"
 */
export const parseBudgetAndCategory = (query = "") => {
  const norm = normalizeText(query);
  let maxPrice = null;
  let targetPrice = null;

  // 1. Nhận diện ngân sách chặn trên: "dưới 15tr", "< 15tr", "thấp hơn 15 triệu"
  const underMatch = norm.match(/(?:duoi|<|thap hon)\s*(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|cu|m)?/);
  if (underMatch) {
    let num = parseFloat(underMatch[1].replace(",", "."));
    if (num < 1000) num *= 1000000;
    maxPrice = num;
  } else {
    // 2. Nhận diện ngân sách mục tiêu: "tầm 15tr", "khoảng 15 triệu", "15tr", "15 củ"
    const generalMatch =
      norm.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|cu|m)\b/) ||
      norm.match(/(?:tam|khoang|gia)\s*(\d+(?:[.,]\d+)?)/);
    if (generalMatch) {
      let num = parseFloat(generalMatch[1].replace(",", "."));
      if (num < 1000) num *= 1000000;
      targetPrice = num;
    }
  }

  // 3. Nhận diện phân loại danh mục
  let category = null;
  if (/\b(pc|may tinh ban|case|dan may)\b/.test(norm)) {
    category = "pc";
  } else if (/\b(laptop|macbook|may tinh xach tay)\b/.test(norm)) {
    category = "laptop";
  } else if (/\b(linh kien|vga|cpu|ram|ssd|man hinh|chuot|ban phim|tan nhiet|nguon)\b/.test(norm)) {
    category = "component";
  }

  return { maxPrice, targetPrice, category };
};

/**
 * HÀM RETRIEVAL KẾT HỢP (HYBRID RETRIEVER: VECTOR SIMILARITY + METADATA FILTER)
 * 1. Semantic Chunking kho tri thức
 * 2. So khớp chính sách (Policies) theo từ khóa trọng yếu
 * 3. Tính Vector Similarity qua Cosine Similarity
 * 4. Bổ trợ Metadata Reranking (Phân loại danh mục + Tối ưu tầm giá)
 */
export const retrieveContexts = async (userQuery = "", catalog = [], apiKey = "") => {
  const normQuery = normalizeText(userQuery);

  // 1. Kiểm tra chính sách cửa hàng trước (bảo hành, giao hàng, trả góp, khuyến mãi...)
  const policyHits = [];
  for (const policy of STORE_POLICIES) {
    const isMatched = policy.keywords.some((kw) =>
      normQuery.includes(normalizeText(kw))
    );
    if (isMatched) {
      policyHits.push({
        type: "policy",
        text: policy.content,
        score: 1.0,
      });
    }
  }

  // 2. Phân tích ngữ nghĩa sản phẩm
  const allChunks = createSemanticChunks(catalog);
  const { maxPrice, targetPrice, category } = parseBudgetAndCategory(userQuery);

  // 3. Tìm kiếm Vector tương đồng
  const vectorHits = await searchVectorStore({
    query: userQuery,
    chunks: allChunks,
    apiKey,
    topK: 12,
  });

  // 4. Reranking thông minh bằng Metadata Filter (Category + Budget)
  const rerankedHits = vectorHits.map((hit) => {
    let score = hit.score;
    const meta = hit.metadata || {};

    // Boost sản phẩm cùng loại người dùng tìm kiếm (PC / Laptop / Linh kiện)
    if (category && meta.category === category) {
      score += 0.35;
    }

    // Boost sản phẩm sát với ngân sách
    if (meta.price) {
      const price = Number(meta.price);
      if (maxPrice) {
        if (price <= maxPrice) {
          // Nằm trong ngân sách -> điểm cộng lớn, sản phẩm giá càng tiệm cận càng ưu tiên
          score += 0.45 + (price / maxPrice) * 0.1;
        } else {
          // Vượt quá ngân sách -> trừ điểm tỷ lệ
          score -= Math.min(0.5, ((price - maxPrice) / maxPrice) * 0.5);
        }
      } else if (targetPrice) {
        const diffRatio = Math.abs(price - targetPrice) / targetPrice;
        if (diffRatio <= 0.25) {
          score += (0.25 - diffRatio) * 1.8;
        } else {
          score -= Math.min(0.4, diffRatio * 0.2);
        }
      }
    }

    return { ...hit, score };
  });

  // Sắp xếp điểm tổng hợp giảm dần
  rerankedHits.sort((a, b) => b.score - a.score);

  // Lấy Top 3 sản phẩm phù hợp nhất
  const topProducts = rerankedHits
    .filter((h) => h.type === "product")
    .slice(0, 3)
    .map((hit) => ({
      type: hit.type,
      text: hit.text,
      score: hit.score,
      metadata: hit.metadata,
    }));

  return [...policyHits, ...topProducts];
};
