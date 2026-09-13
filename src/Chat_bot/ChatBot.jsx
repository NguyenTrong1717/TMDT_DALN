/**
 * =========================================================
 * TẦNG 4: PRESENTATION LAYER (GIAO DIỆN HỘI THOẠI)
 * File: src/Chat_bot/ChatBot.jsx
 * Nhiệm vụ:
 * 1. Render giao diện chatbox gọn gàng, tự nhiên
 * 2. Gọi tầng RAG Engine (ragEngine.js) để lấy câu trả lời
 * 3. Đồng bộ và lưu lịch sử chat vào db.json
 * =========================================================
 */

import { useState, useEffect, useRef } from "react";
import { FaCommentDots, FaTimes, FaPaperPlane, FaUser } from "react-icons/fa";
import { SiProbot } from "react-icons/si";
import { fetchStoreCatalog } from "./knowledge";
import { executeRAG } from "./ragEngine";
import "./ChatBot.css";

const API_URL = "http://localhost:3000";

// Các gợi ý câu hỏi phổ biến để khách bấm nhanh
const SUGGESTED_QUESTIONS = [
  "Tư vấn PC tầm giá 15 triệu",
  "Có laptop nào làm đồ họa tốt không?",
  "Chính sách bảo hành của shop ra sao?",
  "Shop có hỗ trợ mua trả góp không?",
];

// Hàm lấy visitorId để phân biệt lịch sử chat từng người
const getVisitorId = () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser?.id) return `user_${currentUser.id}`;

  let guestId = localStorage.getItem("guestChatId");
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem("guestChatId", guestId);
  }
  return guestId;
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [apiKey] = useState(
    import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || ""
  );

  const bodyRef = useRef(null);
  const visitorId = useRef(getVisitorId());
  const isSendingRef = useRef(false);

  // 1. Tải kho dữ liệu sản phẩm làm Knowledge Base cho RAG
  useEffect(() => {
    fetchStoreCatalog().then((data) => setCatalog(data));
  }, []);

  // 2. Tải lịch sử chat từ db.json
  useEffect(() => {
    let ignore = false;
    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${API_URL}/chatMessages?visitorId=${visitorId.current}&_sort=createdAt`
        );
        if (ignore) return;

        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setMessages(data);
            return;
          }
        }
      } catch (err) {
        console.warn("Chưa kết nối được server chatMessages:", err.message);
      }

      // Lời chào mặc định ban đầu
      setMessages([
        {
          visitorId: visitorId.current,
          sender: "bot",
          text: "Dạ chào bạn 👋 Mình là Trợ lý AI HCore. Bạn cần tư vấn chọn máy, hỏi giá hay cần giải đáp bảo hành cứ nhắn mình nhé!",
          createdAt: new Date().toISOString(),
        },
      ]);
    };

    loadHistory();
    return () => {
      ignore = true;
    };
  }, []);

  // 3. Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  // 4. Lưu tin nhắn vào db.json
  const persistMessage = async (msg) => {
    try {
      await fetch(`${API_URL}/chatMessages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch (err) {
      console.warn("Lưu tin nhắn vào db.json thất bại:", err.message);
    }
  };

  // 5. Xử lý gửi câu hỏi và kích hoạt RAG Engine
  const handleSendMessage = async (customQuery = null) => {
    const query = (customQuery || input).trim();
    if (!query || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMessage = {
      visitorId: visitorId.current,
      sender: "user",
      text: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customQuery) setInput("");
    persistMessage(userMessage);

    setIsTyping(true);

    try {
      // Giả lập độ trễ 0.6s - 1s tạo cảm giác bot đang gõ tự nhiên
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

      // GỌI TẦNG RAG ENGINE
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      const botReplyText = await executeRAG({
        userQuery: query,
        catalog,
        apiKey,
        currentUser,
      });

      const botMessage = {
        visitorId: visitorId.current,
        sender: "bot",
        text: botReplyText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
      persistMessage(botMessage);
      if (!isOpen) setHasUnread(true);
    } catch (error) {
      console.error("Lỗi RAG Chatbot:", error);
    } finally {
      setIsTyping(false);
      isSendingRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="rag-chatbot-root">
      {isOpen && (
        <div className="rag-chatbox-window">
          {/* HEADER */}
          <div className="rag-chatbox-header">
            <div className="rag-header-left">
              <span className="rag-bot-icon">
                <SiProbot />
              </span>
              <div>
                <h4>Trợ Lý HCore Store</h4>
                <span className="rag-status-sub">Trực tuyến</span>
              </div>
            </div>

            <div className="rag-header-right">
              <button
                className="rag-header-btn"
                title="Đóng"
                onClick={() => {
                  setIsOpen(false);
                  setHasUnread(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* BODY TIN NHẮN */}
          <div className="rag-chatbox-body" ref={bodyRef}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`rag-msg-row ${
                  msg.sender === "user" ? "rag-msg-user-row" : "rag-msg-bot-row"
                }`}
              >
                {msg.sender === "bot" && (
                  <span className="rag-avatar rag-avatar-bot">
                    <SiProbot />
                  </span>
                )}

                <div
                  className={`rag-bubble ${
                    msg.sender === "user" ? "rag-bubble-user" : "rag-bubble-bot"
                  }`}
                >
                  {msg.text}
                </div>

                {msg.sender === "user" && (
                  <span className="rag-avatar rag-avatar-user">
                    <FaUser />
                  </span>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="rag-msg-row rag-msg-bot-row">
                <span className="rag-avatar rag-avatar-bot">
                  <SiProbot />
                </span>
                <div className="rag-bubble rag-bubble-bot rag-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {/* CÂU HỎI GỢI Ý NHANH */}
          <div className="rag-quick-questions">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                className="rag-question-chip"
                onClick={() => handleSendMessage(q)}
                disabled={isTyping}
              >
                {q}
              </button>
            ))}
          </div>

          {/* FOOTER INPUT */}
          <div className="rag-chatbox-footer">
            <input
              type="text"
              placeholder="Nhập câu hỏi bạn cần tư vấn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              className="rag-btn-send"
              onClick={() => handleSendMessage()}
              disabled={isTyping || !input.trim()}
              aria-label="Gửi"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}

      {/* NÚT BONG BÓNG MỞ CHAT */}
      <button
        className="rag-floating-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          setHasUnread(false);
        }}
      >
        {isOpen ? <FaTimes /> : <FaCommentDots />}
        {!isOpen && hasUnread && <span className="rag-unread-dot" />}
        {!isOpen && <span className="rag-trigger-label">Tư vấn trực tuyến</span>}
      </button>
    </div>
  );
};

export default ChatBot;
