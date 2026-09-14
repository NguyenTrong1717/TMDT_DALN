/**
 * =========================================================
 * TẦNG 4: PRESENTATION LAYER (GIAO DIỆN HỘI THOẠI FLAGSHIP)
 * File: src/Chat_bot/ChatBot.jsx
 * =========================================================
 */

import { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaPaperPlane,
  FaUser,
  FaTrashAlt,
  FaRobot,
  FaFire,
  FaRegLightbulb,
} from "react-icons/fa";
import { SiProbot } from "react-icons/si";
import { BsStars } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi";
import { fetchStoreCatalog } from "./knowledge.js";
import { executeRAG } from "./ragEngine.js";
import "./ChatBot.css";

// Hàm định dạng cơ bản: hiển thị **in đậm** và ngắt dòng tự nhiên
const renderMessageText = (rawText) => {
  if (!rawText) return "";
  const parts = rawText.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const API_URL = "http://localhost:3000";

// Các gợi ý câu hỏi thông minh theo nhu cầu thực tế
const QUICK_PROMPTS = [
  { icon: "💻", text: "Tư vấn PC Gaming tầm giá 15 triệu" },
  { icon: "🎮", text: "Laptop Gaming trang bị RTX 4060" },
  { icon: "🛡️", text: "Chính sách bảo hành và 1 đổi 1" },
  { icon: "💳", text: "Thủ tục mua trả góp 0% qua CCCD" },
  { icon: "🔥", text: "Mã khuyến mãi & giảm giá hôm nay" },
];

const getVisitorId = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (currentUser?.id) return `user_${currentUser.id}`;
  } catch {
    // bỏ qua lỗi parse
  }

  // Đối với khách vãng lai (Guest): Lưu trong sessionStorage
  // -> F5 / Reload trang: VẪN GIỮ NGUYÊN lịch sử chat trong phiên làm việc
  // -> Đóng tab / tắt trình duyệt: TỰ ĐỘNG XÓA SẠCH để bảo vệ quyền riêng tư
  let guestId = sessionStorage.getItem("guestChatId");
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    sessionStorage.setItem("guestChatId", guestId);
  }
  return guestId;
};

const formatTime = (isoString) => {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const INITIAL_BOT_MESSAGE = {
  id: "init-welcome",
  sender: "bot",
  text: "Dạ em chào anh/chị 👋 Em là Trợ lý AI của HCore Store!\n\nEm có thể giúp anh/chị:\n• Tư vấn cấu hình PC Gaming / Đồ họa tối ưu ngân sách\n• Tra cứu giá bán và cấu hình Laptop mới nhất\n• Giải đáp chính sách bảo hành 36 tháng & trả góp 0%\n\nAnh/chị cứ đặt câu hỏi hoặc bấm vào gợi ý bên dưới nhé!",
  createdAt: new Date().toISOString(),
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [visitorId, setVisitorId] = useState(getVisitorId);
  const [messages, setMessages] = useState([INITIAL_BOT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [apiKey] = useState(
    import.meta.env.VITE_GEMINI_API_KEY ||
      localStorage.getItem("gemini_api_key") ||
      "",
  );

  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const isSendingRef = useRef(false);

  // 1. Tự động đồng bộ và cô lập lịch sử chat khi Đăng nhập / Đăng xuất tài khoản
  useEffect(() => {
    const handleAuthSync = () => {
      const currentId = getVisitorId();
      setVisitorId((prevId) => {
        if (prevId !== currentId) {
          // Lập tức làm sạch màn hình chat để chống rò rỉ dữ liệu giữa 2 tài khoản
          setMessages([INITIAL_BOT_MESSAGE]);
          return currentId;
        }
        return prevId;
      });
    };

    window.addEventListener("authChange", handleAuthSync);
    window.addEventListener("storage", handleAuthSync);

    return () => {
      window.removeEventListener("authChange", handleAuthSync);
      window.removeEventListener("storage", handleAuthSync);
    };
  }, []);

  // 2. Tải dữ liệu sản phẩm làm Knowledge Base cho RAG
  useEffect(() => {
    fetchStoreCatalog().then((data) => setCatalog(data || []));
  }, []);

  // 3. Tải lịch sử chat chính xác theo visitorId của tài khoản hiện tại
  useEffect(() => {
    let ignore = false;
    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${API_URL}/chatMessages?visitorId=${visitorId}&_sort=createdAt`,
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
        console.warn("Chưa kết nối server chatMessages:", err.message);
      }
      if (!ignore) {
        setMessages([INITIAL_BOT_MESSAGE]);
      }
    };

    loadHistory();
    return () => {
      ignore = true;
    };
  }, [visitorId]);

  // 4. Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({
        top: bodyRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping, isOpen]);

  // Focus ô nhập khi mở khung chat
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // Lưu tin nhắn vào db.json theo đúng visitorId
  const persistMessage = async (msg) => {
    try {
      await fetch(`${API_URL}/chatMessages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch (err) {
      console.warn("Lưu tin nhắn thất bại:", err.message);
    }
  };

  // Xóa toàn bộ lịch sử trò chuyện của tài khoản hiện tại
  const handleClearHistory = async () => {
    if (window.confirm("Bạn có muốn làm mới cuộc trò chuyện này không?")) {
      setMessages([INITIAL_BOT_MESSAGE]);
      try {
        const res = await fetch(
          `${API_URL}/chatMessages?visitorId=${visitorId}`,
        );
        if (res.ok) {
          const allMsgs = await res.json();
          await Promise.all(
            allMsgs.map((m) =>
              fetch(`${API_URL}/chatMessages/${m.id}`, { method: "DELETE" }),
            ),
          );
        }
      } catch {
        // bỏ qua
      }
    }
  };

  // Gửi tin nhắn và kích hoạt RAG Engine
  const handleSendMessage = async (customQuery = null) => {
    const query = (customQuery || input).trim();
    if (!query || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMessage = {
      visitorId,
      sender: "user",
      text: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customQuery) setInput("");
    persistMessage(userMessage);

    setIsTyping(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 500 + Math.random() * 400),
      );

      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      const botReplyText = await executeRAG({
        userQuery: query,
        catalog,
        apiKey,
        currentUser,
      });

      const botMessage = {
        visitorId,
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
    <div className="hcore-chatbot-wrapper">
      {isOpen && (
        <div className="hcore-chat-window">
          {/* HEADER CHÍNH - SẮC NÉT ĐỎ HCORE GRADIENT */}
          <div className="hcore-chat-header">
            <div className="hcore-chat-header-main">
              <div className="hcore-chat-avatar-glow">
                <SiProbot className="hcore-chat-avatar-icon" />
                <span className="hcore-status-pulse" />
              </div>
              <div className="hcore-chat-title-group">
                <div className="hcore-chat-name-row">
                  <span className="hcore-chat-name">HCore AI Assistant</span>
                  <span className="hcore-badge-rag">
                    <HiSparkles /> RAG 2.0
                  </span>
                </div>
                <span className="hcore-chat-sub">
                  ● Trực tuyến • Tư vấn PC, Laptop & Bảo hành 24/7
                </span>
              </div>
            </div>

            <div className="hcore-chat-header-actions">
              <button
                type="button"
                className="hcore-header-action-btn"
                title="Làm mới cuộc trò chuyện"
                onClick={handleClearHistory}
              >
                <FaTrashAlt />
              </button>
              <button
                type="button"
                className="hcore-header-action-btn hcore-btn-close"
                title="Đóng cửa sổ chat"
                onClick={() => {
                  setIsOpen(false);
                  setHasUnread(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* DẢI BANNER BẢO HÀNH & CAM KẾT CHÍNH HÃNG */}
          <div className="hcore-chat-promo-ribbon">
            <span>🛡️ 100% Hàng Chính Hãng</span>
            <span>•</span>
            <span>⚡ 1 Đổi 1 trong 30 Ngày</span>
            <span>•</span>
            <span>🚀 Trả Góp 0% Duyệt 5P</span>
          </div>

          {/* VÙNG HIỂN THỊ NỘI DUNG TIN NHẮN */}
          <div className="hcore-chat-body" ref={bodyRef}>
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`hcore-msg-row ${
                  msg.sender === "user"
                    ? "hcore-msg-row--user"
                    : "hcore-msg-row--bot"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="hcore-msg-avatar hcore-msg-avatar--bot">
                    <SiProbot />
                  </div>
                )}

                <div className="hcore-msg-bubble-wrap">
                  <div
                    className={`hcore-msg-bubble ${
                      msg.sender === "user"
                        ? "hcore-msg-bubble--user"
                        : "hcore-msg-bubble--bot"
                    }`}
                  >
                    {msg.sender === "bot" && (
                      <div className="hcore-bubble-badge">
                        <BsStars className="badge-sparkle" /> HCore Store AI
                      </div>
                    )}
                    <div className="hcore-bubble-text">
                      {renderMessageText(msg.text)}
                    </div>
                  </div>
                  <span className="hcore-msg-timestamp">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>

                {msg.sender === "user" && (
                  <div className="hcore-msg-avatar hcore-msg-avatar--user">
                    <FaUser />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="hcore-msg-row hcore-msg-row--bot">
                <div className="hcore-msg-avatar hcore-msg-avatar--bot">
                  <SiProbot />
                </div>
                <div className="hcore-msg-bubble hcore-msg-bubble--bot hcore-typing-bubble">
                  <span className="hcore-typing-text">
                    HCore AI đang truy xuất kho dữ liệu
                  </span>
                  <div className="hcore-typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* THANH GỢI Ý CÂU HỎI NHANH (QUICK CHIPS) */}
          <div className="hcore-chat-quick-suggestions">
            <div className="hcore-quick-label">
              <FaRegLightbulb /> Gợi ý hỏi nhanh:
            </div>
            <div className="hcore-quick-chips-scroll">
              {QUICK_PROMPTS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="hcore-quick-chip"
                  onClick={() => handleSendMessage(q.text)}
                  disabled={isTyping}
                >
                  <span className="chip-icon">{q.icon}</span>
                  <span className="chip-text">{q.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* KHUNG NHẬP LIỆU FOOTER */}
          <div className="hcore-chat-footer">
            <div className="hcore-input-container">
              <input
                ref={inputRef}
                type="text"
                className="hcore-chat-input"
                placeholder="Hỏi về PC, laptop, linh kiện, bảo hành... (Enter)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
              />
              <button
                type="button"
                className="hcore-send-btn"
                onClick={() => handleSendMessage()}
                disabled={isTyping || !input.trim()}
                title="Gửi câu hỏi"
              >
                <FaPaperPlane />
              </button>
            </div>
            <div className="hcore-chat-watermark">
              <span>⚡ Trợ lý AI thông minh HCore • Phản hồi chính xác tức thì</span>
            </div>
          </div>
        </div>
      )}

      {/* NÚT KÍCH HOẠT NỔI Ở GÓC MÀN HÌNH - PHỐI HỢP CÙNG NÚT LÊN ĐẦU */}
      <button
        type="button"
        className={`hcore-floating-trigger ${isOpen ? "hcore-floating-trigger--active" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setHasUnread(false);
        }}
        title="Chat với Trợ lý AI HCore"
      >
        <div className="hcore-trigger-icon-wrap">
          {isOpen ? (
            <FaTimes className="trigger-icon trigger-icon-close" />
          ) : (
            <SiProbot className="trigger-icon trigger-icon-robot" />
          )}
          {!isOpen && <span className="trigger-pulse-ring" />}
        </div>

        {!isOpen && (
          <div className="hcore-trigger-label-group">
            <span className="trigger-label-main">Tư vấn AI 24/7</span>
            <span className="trigger-label-sub">
              <span className="online-green-dot" /> Trực tuyến
            </span>
          </div>
        )}

        {!isOpen && hasUnread && <span className="hcore-unread-badge">1</span>}
      </button>
    </div>
  );
};

export default ChatBot;
