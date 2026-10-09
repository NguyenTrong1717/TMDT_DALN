/**
 * HCORE STORE - RAG CLIENT
 * File: src/Chat_bot/ragEngine.js
 * Nhiệm vụ: Gọi microservice Python FastAPI (:8000) xử lý RAG.
 */

const CANDIDATE_ENDPOINTS = [
  import.meta.env.VITE_RAG_API_URL || "http://127.0.0.1:8000/api/chat",
  "http://localhost:8000/api/chat",
];

const RAG_REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_RAG_TIMEOUT_MS || 60000
);

export const executeRAG = async ({
  userQuery = "",
  apiKey = "",
  currentUser = null,
}) => {
  for (const endpoint of CANDIDATE_ENDPOINTS) {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), RAG_REQUEST_TIMEOUT_MS);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery,
          currentUser,
          apiKey: apiKey || undefined,
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.error || `RAG HTTP ${res.status}`);
      }

      if (data?.reply) {
        const products = (data.sources || [])
          .filter((source) => source?.type === "product" && source?.metadata?.id)
          .map((source) => source.metadata)
          .filter(
            (product, index, items) =>
              items.findIndex(
                (item) =>
                  String(item.id) === String(product.id) &&
                  item.source === product.source
              ) === index
          )
          .slice(0, 3);

        return { reply: data.reply, products };
      }
    } catch (err) {
      console.warn(`[ChatBot] Thử kết nối ${endpoint} thất bại:`, err.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Fallback an toàn khi chưa khởi động Python service (:8000)
  return {
    reply:
      "HCore AI Bot hiện đang kết nối với hệ thống. Nếu bạn chưa khởi động máy chủ AI, vui lòng chạy lệnh `npm run rag`. Trong lúc này bạn có thể gọi hotline 1900 8888 để được hỗ trợ ngay nhé!",
    products: [],
  };
};
