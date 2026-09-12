import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaStar,
  FaRegStar,
  FaTrash,
  FaEyeSlash,
  FaEye,
  FaReply,
} from "react-icons/fa";
import "./ReviewManager.css";

const API_URL = "http://localhost:3000";

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Stars = ({ rating }) => (
  <span className="rm-stars">
    {[1, 2, 3, 4, 5].map((n) =>
      n <= rating ? <FaStar key={n} /> : <FaRegStar key={n} />,
    )}
  </span>
);

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "unreplied", label: "Chưa phản hồi" },
  { key: "hidden", label: "Đã ẩn" },
  { key: "low", label: "Đánh giá thấp (≤2★)" },
];

const ReviewManager = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reviews`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReviews(
        [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    } catch {
      toast.error("Không thể tải danh sách đánh giá!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleToggleHidden = async (review) => {
    try {
      const res = await fetch(`${API_URL}/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !review.hidden }),
      });
      if (!res.ok) throw new Error();
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, hidden: !review.hidden } : r,
        ),
      );
      toast.success(
        review.hidden ? "Đã hiện lại đánh giá!" : "Đã ẩn đánh giá!",
      );
    } catch {
      toast.error("Không thể cập nhật trạng thái!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn XÓA đánh giá này?")) return;
    try {
      const res = await fetch(`${API_URL}/reviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Đã xóa đánh giá!");
    } catch {
      toast.error("Không thể xóa đánh giá!");
    }
  };

  const handleSendReply = async (id) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: replyText,
          replyAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, reply: replyText, replyAt: new Date().toISOString() }
            : r,
        ),
      );
      toast.success("Đã gửi phản hồi!");
      setReplyingId(null);
      setReplyText("");
    } catch {
      toast.error("Không thể gửi phản hồi!");
    }
  };

  const filtered = useMemo(() => {
    switch (tab) {
      case "unreplied":
        return reviews.filter((r) => !r.reply);
      case "hidden":
        return reviews.filter((r) => r.hidden);
      case "low":
        return reviews.filter((r) => r.rating <= 2);
      default:
        return reviews;
    }
  }, [reviews, tab]);

  const avgRating = reviews.length
    ? (
        reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      ).toFixed(1)
    : "0.0";

  return (
    <div className="rm-page">
      <div className="admin-title">
        <FaStar />
        <span>Quản Lý Đánh Giá</span>
      </div>

      {/* Thống kê */}
      <div className="rm-stats">
        <div className="rm-stat-box">
          <span className="rm-stat-num">{reviews.length}</span>
          <span className="rm-stat-label">Tổng đánh giá</span>
        </div>
        <div className="rm-stat-box">
          <span className="rm-stat-num">{avgRating} ★</span>
          <span className="rm-stat-label">Điểm trung bình</span>
        </div>
        <div className="rm-stat-box rm-stat-box--warn">
          <span className="rm-stat-num">
            {reviews.filter((r) => r.rating <= 2).length}
          </span>
          <span className="rm-stat-label">Đánh giá thấp (≤2★)</span>
        </div>
        <div className="rm-stat-box rm-stat-box--muted">
          <span className="rm-stat-num">
            {reviews.filter((r) => r.hidden).length}
          </span>
          <span className="rm-stat-label">Đang ẩn</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rm-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`rm-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rm-list">
        {loading ? (
          <div className="rm-empty">Đang tải đánh giá...</div>
        ) : filtered.length === 0 ? (
          <div className="rm-empty">Không có đánh giá nào ở mục này.</div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className={`rm-card ${r.hidden ? "rm-card--hidden" : ""}`}
            >
              <div className="rm-card__head">
                <div>
                  <span className="rm-author">{r.userName || "Ẩn danh"}</span>
                  <Stars rating={r.rating} />
                </div>
                <span className="rm-date">{formatDate(r.createdAt)}</span>
              </div>

              <div className="rm-meta-line">
                Sản phẩm: <code>{r.collection || "—"}</code> · ID:{" "}
                <code>{r.productId || "—"}</code>
                {r.hidden && <span className="rm-badge-hidden">Đã ẩn</span>}
              </div>

              <p className="rm-comment">{r.comment}</p>

              {r.reply && (
                <div className="rm-reply">
                  <span className="rm-reply-label">Phản hồi từ shop</span>
                  <p>{r.reply}</p>
                  <span className="rm-reply-date">{formatDate(r.replyAt)}</span>
                </div>
              )}

              <div className="rm-actions">
                {!r.reply &&
                  (replyingId === r.id ? (
                    <div className="rm-reply-form">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập phản hồi..."
                      />
                      <div className="rm-reply-form__btns">
                        <button onClick={() => handleSendReply(r.id)}>
                          Gửi
                        </button>
                        <button
                          className="rm-cancel"
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText("");
                          }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="rm-btn rm-btn--reply"
                      onClick={() => {
                        setReplyingId(r.id);
                        setReplyText("");
                      }}
                    >
                      <FaReply /> Phản hồi
                    </button>
                  ))}

                <button
                  className="rm-btn rm-btn--toggle"
                  onClick={() => handleToggleHidden(r)}
                >
                  {r.hidden ? (
                    <>
                      <FaEye /> Hiện lại
                    </>
                  ) : (
                    <>
                      <FaEyeSlash /> Ẩn
                    </>
                  )}
                </button>

                <button
                  className="rm-btn rm-btn--delete"
                  onClick={() => handleDelete(r.id)}
                >
                  <FaTrash /> Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewManager;
