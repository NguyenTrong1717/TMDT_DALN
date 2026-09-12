import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { SiProbot } from "react-icons/si";

import { FaCommentDots, FaTimes, FaPaperPlane, FaUser } from "react-icons/fa";
import "./ChatBox.css";

const API_URL = "http://localhost:3000";

const AUTO_REPLIES = [
  {
    keywords: ["giá", "gia", "bao nhiêu", "tiền"],
    reply:
      "Bạn có thể xem giá chi tiết ngay tại trang sản phẩm. Nếu cần tư vấn chọn sản phẩm theo tầm giá, cứ nói mình biết ngân sách bạn đang cân nhắc nhé!",
  },
  {
    keywords: ["bảo hành", "bao hanh", "warranty"],
    reply:
      "Sản phẩm bên mình được bảo hành chính hãng theo từng loại (thường 12-24 tháng). Bạn có thể gửi yêu cầu bảo hành ở mục Hồ sơ > Yêu cầu dịch vụ.",
  },
  {
    keywords: ["giao hàng", "ship", "vận chuyển", "van chuyen"],
    reply:
      "Đơn hàng thường được giao trong 2-5 ngày tùy khu vực. Bạn có thể theo dõi trạng thái đơn ở mục Đơn hàng của tôi.",
  },
  {
    keywords: ["trả góp", "tra gop", "installment"],
    reply:
      "Mình có hỗ trợ mua trả góp ngay tại bước thanh toán, chỉ cần chọn 'Mua trả góp' và làm theo hướng dẫn nhé.",
  },
  {
    keywords: ["voucher", "mã giảm giá", "khuyến mãi", "sale"],
    reply:
      "Bạn kiểm tra mục 'Ví voucher' hoặc trang 'Flash Sale' để xem các ưu đãi hiện có nha!",
  },
  {
    keywords: ["hello", "chào", "chao", "hi", "alo"],
    reply: "Chào bạn 👋 Mình là trợ lý hỗ trợ. Bạn cần mình giúp gì hôm nay?",
  },
];

const getBotReply = (text) => {
  const lower = text.toLowerCase();
  const matched = AUTO_REPLIES.find((item) =>
    item.keywords.some((kw) => lower.includes(kw)),
  );
  if (matched) return matched.reply;
  return "Cảm ơn bạn đã nhắn tin! Nhân viên sẽ phản hồi sớm nhất. Trong lúc chờ, bạn có thể hỏi mình về giá, bảo hành, giao hàng, trả góp hoặc voucher nhé.";
};

// Lấy (hoặc tạo) một mã định danh cho khách chưa đăng nhập, để lưu lịch sử chat riêng từng người
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

const ChatBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bodyRef = useRef(null);
  const visitorId = useRef(getVisitorId());
  const isSendingRef = useRef(false); // chặn gửi trùng khi Enter/click bắn 2 lần

  // Tải lịch sử chat khi mở lần đầu
  useEffect(() => {
    let ignore = false; // chống việc effect chạy lại (React.StrictMode ở dev) ghi đè kết quả cũ/mới lộn xộn

    const loadHistory = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/chatMessages?visitorId=${visitorId.current}&_sort=createdAt`,
        );
        if (ignore) return;

        if (res.data.length === 0) {
          const welcomeMsg = {
            visitorId: visitorId.current,
            sender: "bot",
            text: "Xin chào 👋 Mình có thể giúp gì cho bạn về sản phẩm, đơn hàng, hoặc bảo hành?",
            createdAt: new Date().toISOString(),
          };
          setMessages([welcomeMsg]);
        } else {
          setMessages(res.data);
        }
      } catch (err) {
        if (ignore) return;
        console.warn("Không tải được lịch sử chat:", err.message);
        setMessages([
          {
            visitorId: visitorId.current,
            sender: "bot",
            text: "Xin chào 👋 Mình có thể giúp gì cho bạn về sản phẩm, đơn hàng, hoặc bảo hành?",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    };

    loadHistory();
    return () => {
      ignore = true;
    };
  }, []);

  // Tự cuộn xuống cuối mỗi khi có tin nhắn mới
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isBotTyping, isOpen]);

  const persistMessage = async (msg) => {
    try {
      await axios.post(`${API_URL}/chatMessages`, msg);
    } catch (err) {
      console.warn(
        "Không lưu được tin nhắn (json-server có đang chạy?):",
        err.message,
      );
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMsg = {
      visitorId: visitorId.current,
      sender: "user",
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    persistMessage(userMsg);

    setIsBotTyping(true);
    setTimeout(
      async () => {
        const botMsg = {
          visitorId: visitorId.current,
          sender: "bot",
          text: getBotReply(text),
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsBotTyping(false);
        persistMessage(botMsg);
        if (!isOpen) setHasUnread(true);
        isSendingRef.current = false;
      },
      700 + Math.random() * 500,
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setHasUnread(false);
  };

  return (
    <div className="chatbox-root">
      {isOpen && (
        <div className="chatbox-panel">
          <div className="chatbox-header">
            <span className="chatbox-header-title">
              <SiProbot /> Hỗ trợ trực tuyến
            </span>
            <button className="chatbox-close-btn" onClick={toggleOpen}>
              <FaTimes />
            </button>
          </div>

          <div className="chatbox-body" ref={bodyRef}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chatbox-msg-row ${
                  msg.sender === "user"
                    ? "chatbox-msg-row-user"
                    : "chatbox-msg-row-bot"
                }`}
              >
                {msg.sender === "bot" && (
                  <span className="chatbox-avatar chatbox-avatar-bot">
                    <SiProbot />
                  </span>
                )}
                <div
                  className={`chatbox-msg ${
                    msg.sender === "user"
                      ? "chatbox-msg-user"
                      : "chatbox-msg-bot"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === "user" && (
                  <span className="chatbox-avatar chatbox-avatar-user">
                    <FaUser />
                  </span>
                )}
              </div>
            ))}
            {isBotTyping && (
              <div className="chatbox-msg-row chatbox-msg-row-bot">
                <span className="chatbox-avatar chatbox-avatar-bot">
                  <SiProbot />
                </span>
                <div className="chatbox-msg chatbox-msg-bot chatbox-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          <div className="chatbox-footer">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isBotTyping}
            />
            <button
              onClick={handleSend}
              aria-label="Gửi"
              disabled={isBotTyping}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}

      <button className="chatbox-toggle-btn" onClick={toggleOpen}>
        {isOpen ? <FaTimes /> : <FaCommentDots />}
        {!isOpen && hasUnread && <span className="chatbox-badge" />}
      </button>
    </div>
  );
};

export default ChatBox;
