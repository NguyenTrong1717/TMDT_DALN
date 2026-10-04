/**
 * HCORE STORE - RAG CLIENT
 * File: src/Chat_bot/ragEngine.js
 * Nhiệm vụ: Gọi microservice Python FastAPI (:8000) xử lý RAG.
 */

// Ưu tiên 127.0.0.1 để tránh lỗi phân giải IPv6 ::1 trên Windows
const CANDIDATE_ENDPOINTS = [
  "http://127.0.0.1:8000/api/chat",
  "http://localhost:8000/api/chat",
];

export const executeRAG = async ({
  userQuery = "",
  apiKey = "",
  currentUser = null,
}) => {
  for (const endpoint of CANDIDATE_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.reply) return data.reply;
      }
    } catch (err) {
      console.warn(`[ChatBot] Thử kết nối ${endpoint} thất bại:`, err.message);
    }
  }

  // Fallback an toàn khi chưa khởi động Python service (:8000)
  return "HCore AI Bot hiện đang kết nối với hệ thống. Nếu bạn chưa khởi động máy chủ AI, vui lòng chạy lệnh `npm run rag`. Trong lúc này bạn có thể gọi hotline 1900 8888 để được hỗ trợ ngay nhé!";
};
