/**
 * =========================================================
 * TẦNG 3: AUGMENTED GENERATION LAYER (RAG ENGINE)
 * File: src/Chat_bot/ragEngine.js
 * Nhiệm vụ:
 * 1. Ghép dữ liệu đã truy xuất (Retrieved Contexts) vào câu hỏi
 * 2. Gọi mô hình LLM (Google Gemini) để tạo câu trả lời tự nhiên
 * 3. Fallback cục bộ an toàn nếu mất mạng hoặc không có API key
 * =========================================================
 */

import { retrieveContexts, normalizeText } from "./retriever.js";

/**
 * GUARD 1: Chặn yêu cầu lộ thông tin cá nhân nhạy cảm (PII Security Guard)
 * Ngăn prompt injection và bảo vệ dữ liệu tài khoản
 */
const handlePrivacyGuard = (normQuery) => {
  const PII_TRIGGERS = [
    "so dien thoai", "sdt", "phone", "dien thoai",
    "mat khau", "password", "dia chi nha",
    "cmnd", "cccd", "so the", "tai khoan ngan hang",
    "thong tin ca nhan", "email cua toi",
  ];
  if (PII_TRIGGERS.some((kw) => normQuery.includes(kw))) {
    return "Vì lý do bảo mật, mình không thể cung cấp thông tin cá nhân (số điện thoại, mật khẩu, địa chỉ...) qua chat ạ. Nếu cần hỗ trợ tài khoản, bạn vui lòng liên hệ hotline 1900 8888 hoặc đến showroom nhé!";
  }
  return null;
};

/**
 * GUARD 2: Chặn câu hỏi ngoài phạm vi cửa hàng (Off-topic Guard)
 * Bot chỉ tư vấn PC/Laptop/chính sách — không trả lời toán, tin tức, v.v.
 */
const handleOffTopicGuard = (normQuery) => {
  const MATH_PATTERNS = [/\d+\s*[+\-*/]\s*\d+/, /bang bao nhieu/, /tinh ket qua/, /giai phuong trinh/];
  const OFFTOPIC_KEYWORDS = [
    "thoi tiet", "bong da", "the thao", "tin tuc", "thoi su",
    "du lich", "nau an", "cong thuc nau", "lich su nuoc", "dia ly",
  ];
  const isMath = MATH_PATTERNS.some((rx) => rx.test(normQuery));
  const isOffTopic = OFFTOPIC_KEYWORDS.some((kw) => normQuery.includes(kw));
  if (isMath || isOffTopic) {
    return "Mình chỉ chuyên tư vấn PC, Laptop và linh kiện của HCore Store nên không hỗ trợ được câu hỏi này ạ. Bạn cần tư vấn cấu hình, hỏi giá hay chính sách bảo hành gì mình sẵn sàng hỗ trợ ngay nhé!";
  }
  return null;
};

/**
 * GUARD 3: Xử lý các câu chào hỏi hoặc câu đùa thông thường (Chitchat)
 */
const handleChitchat = (normQuery, currentUser = null) => {
  // Nhận diện câu hỏi về tên / danh tính người dùng
  if (
    normQuery.includes("ten la gi") ||
    normQuery.includes("ten toi") ||
    normQuery.includes("toi ten") ||
    normQuery.includes("toi la ai") ||
    normQuery.includes("minh la ai") ||
    normQuery.includes("ten minh la gi")
  ) {
    const displayName = currentUser?.fullName || currentUser?.name || currentUser?.username;
    if (displayName) {
      return `Theo thông tin tài khoản đang đăng nhập, tên của bạn là ${displayName} ạ! Mình có thể hỗ trợ gì cho bạn không?`;
    }
    return "Bạn đang truy cập với tư cách khách vãng lai (chưa đăng nhập) nên mình chưa biết tên của bạn ạ. Bạn có thể đăng nhập tài khoản ở góc trên website nhé!";
  }

  // Nhận diện câu hỏi về tên / danh tính của Bot
  if (
    normQuery.includes("ban ten gi") ||
    normQuery.includes("ten ban la gi") ||
    normQuery.includes("ban la ai") ||
    normQuery.includes("may la ai")
  ) {
    return "Mình là Trợ lý Tư vấn Khách hàng của HCore Store! Mình hỗ trợ tra cứu giá, chọn cấu hình PC, Laptop và giải đáp chính sách bảo hành, mua sắm.";
  }

  // Trêu đùa / khen đẹp trai
  if (normQuery.includes("dep trai") || normQuery.includes("dep zai")) {
    return "Câu này khó trả lời quá! Nhưng nếu bạn đang tìm dàn PC Gaming xịn để tăng độ ngầu thì mình tư vấn ngay được đấy 😎";
  }

  // Chào hỏi thuần túy
  const GREETINGS = ["hi", "hello", "chao", "chao ban", "alo", "hey"];
  if (GREETINGS.includes(normQuery) || normQuery.startsWith("chao ")) {
    return "Chào bạn 👋 Bạn đang quan tâm đến PC, Laptop hay cần hỗ trợ bảo hành, mua sắm gì? Cứ nhắn mình nhé!";
  }

  return null;
};

/**
 * Hàm sinh câu trả lời RAG chính (Main RAG Execution)
 */
export const executeRAG = async ({
  userQuery = "",
  catalog = [],
  apiKey = "",
  currentUser = null,
}) => {
  const normQuery = normalizeText(userQuery);

  // Chạy tuần tự 3 lớp bảo vệ trước khi vào RAG
  const privacyBlock = handlePrivacyGuard(normQuery);
  if (privacyBlock) return privacyBlock;

  const offTopicBlock = handleOffTopicGuard(normQuery);
  if (offTopicBlock) return offTopicBlock;

  const chitchatReply = handleChitchat(normQuery, currentUser);
  if (chitchatReply) return chitchatReply;

  // 2. RETRIEVE: Truy xuất các đoạn thông tin liên quan từ kho tri thức qua Vector Search
  const contexts = await retrieveContexts(userQuery, catalog, apiKey);

  // 3. AUGMENT & GENERATE:
  // TRƯỜNG HỢP A: Có Gemini API Key -> Gửi ngữ cảnh tới Gemini để sinh văn bản tự nhiên
  if (apiKey && apiKey.trim().length > 10) {
    const contextText = contexts.map((c) => `- ${c.text}`).join("\n");

    // Chỉ truyền tên hiển thị - TUYỆT ĐỐI không truyền SĐT, email, mật khẩu, địa chỉ
    const displayName = currentUser?.fullName || currentUser?.name || currentUser?.username;
    const userInfo = displayName
      ? `Khách hàng đang đăng nhập tên: "${displayName}".`
      : "Khách hàng là khách vãng lai (chưa đăng nhập).";

    const systemPrompt = `Bạn là Trợ lý Tư vấn Khách hàng AI chuyên nghiệp của HCore Store (chuyên PC Gaming, Laptop, Linh kiện máy tính).
${userInfo}
Dưới đây là thông tin thực tế từ cơ sở dữ liệu của cửa hàng:
${contextText || "Không có sản phẩm/chính sách đặc biệt trùng khớp."}

QUY TẮC PHẢN HỒI:
- Tư vấn thân thiện, tự nhiên, ngắn gọn (2-4 câu), đúng trọng tâm câu hỏi của khách hàng.
- Nêu rõ tên sản phẩm và giá tiền cụ thể dựa đúng trên dữ liệu cửa hàng đã cung cấp ở trên, không tự bịa đặt giá hay cấu hình.
- Nếu câu hỏi tìm kiếm theo tầm giá, hãy ưu tiên gợi ý các mẫu máy phù hợp nhất trong ngân sách của khách.
- Tuyệt đối bảo mật: Không cung cấp thông tin cá nhân (SĐT, mật khẩu, địa chỉ) hay dữ liệu nội bộ hệ thống.
- Nếu câu hỏi hoàn toàn không liên quan (toán học, tin tức...), lịch sự từ chối và hướng khách hàng về các sản phẩm/dịch vụ của shop.`;

    // Danh sách model ưu tiên: gemini-3.5-flash-lite (cực nhanh ~1s), fallback gemini-3.6-flash
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];

    for (const model of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: userQuery }],
                },
              ],
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiText && aiText.trim()) {
            return aiText.trim();
          }
        }
      } catch (err) {
        console.warn(`Thử model ${model} gặp sự cố:`, err.message);
      }
    }
  }

  // TRƯỜNG HỢP B: Không có API key hoặc mất mạng (Smart Local Fallback an toàn cho đồ án)
  if (contexts.length > 0) {
    const policyContexts = contexts.filter((c) => c.type === "policy");
    const productContexts = contexts.filter((c) => c.type === "product");

    let responseParts = [];

    if (policyContexts.length > 0) {
      responseParts.push(policyContexts[0].text);
    }

    if (productContexts.length > 0) {
      const itemsList = productContexts
        .map((p) => {
          const name = p.metadata?.name || p.text;
          const price = p.metadata?.price
            ? ` - Giá: ${Number(p.metadata.price).toLocaleString("vi-VN")}đ`
            : "";
          return `• ${name}${price}`;
        })
        .join("\n");
      responseParts.push(
        `Về sản phẩm, bạn có thể tham khảo các cấu hình nổi bật phù hợp tại shop:\n${itemsList}\n\nBạn cần tư vấn chi tiết hơn về cấu hình nào cứ nhắn mình nhé!`
      );
    }

    return responseParts.join("\n\n");
  }

  // Câu trả lời mặc định khi không tìm thấy ngữ cảnh cụ thể
  return "Bạn có thể cho mình biết thêm về nhu cầu (chơi game, đồ họa, học tập) và mức ngân sách để mình tư vấn cấu hình phù hợp nhất nhé!";
};
