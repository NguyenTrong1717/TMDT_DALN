import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import "./ProductReviews.css";

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const StarDisplay = ({ rating, size = "md" }) => (
  <div
    className={`review-stars review-stars--${size}`}
    aria-label={`${rating} trên 5 sao`}
  >
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= Math.round(rating) ? "filled" : ""}>
        ★
      </span>
    ))}
  </div>
);

const StarSelector = ({ value, onChange }) => (
  <fieldset className="star-selector">
    <legend className="sr-only">Chọn số sao đánh giá</legend>
    {[5, 4, 3, 2, 1].map((n) => (
      <label key={n} title={`${n} sao`}>
        <input
          type="radio"
          name="rating"
          value={n}
          checked={Number(value) === n}
          onChange={() => onChange(n)}
        />
        <span aria-hidden="true">★</span>
      </label>
    ))}
  </fieldset>
);

const RatingSummary = ({ reviews }) => {
  const { average, distribution, total } = useMemo(() => {
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    const average = total ? sum / total : 0;
    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => Number(r.rating) === star).length;
      return { star, count, pct: total ? (count / total) * 100 : 0 };
    });
    return { average, distribution, total };
  }, [reviews]);

  if (total === 0) return null;

  return (
    <div className="rating-summary">
      <div className="rating-summary__score">
        <span className="rating-summary__number">{average.toFixed(1)}</span>
        <StarDisplay rating={average} size="sm" />
        <span className="rating-summary__count">{total} đánh giá</span>
      </div>
      <div className="rating-summary__bars">
        {distribution.map(({ star, count, pct }) => (
          <div className="rating-bar" key={star}>
            <span className="rating-bar__label">{star} sao</span>
            <div className="rating-bar__track">
              <div className="rating-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="rating-bar__count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductReviews = ({ productId, collectionName = "categories" }) => {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const listRef = useRef(null);
  const commentRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const isAdmin = currentUser?.role === "admin";

  const fetchReviews = async () => {
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      // Nếu có productId thì lọc theo sản phẩm, không thì lấy bình luận
      // chung của cả khu (dùng cho trang trưng bày / không gắn sản phẩm cụ thể)
      const url = productId
        ? `http://localhost:3000/reviews?productId=${productId}`
        : `http://localhost:3000/reviews`;
      const res = await fetch(url);
      const data = await res.json();
      const filtered = data
        .filter((item) => {
          const sameCollection = item.collection === collectionName;
          const sameProduct = productId
            ? String(item.productId) === String(productId)
            : true;
          return sameCollection && sameProduct && !item.hidden;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReviews(filtered);
      setStatus("ready");
    } catch (err) {
      console.error("Lỗi lấy bình luận:", err);
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, collectionName]);

  // Kiểm tra vị trí cuộn để ẩn/hiện nút lên - xuống
  const updateScrollButtons = () => {
    const el = listRef.current;
    if (!el) return;
    setShowScrollUp(el.scrollTop > 20);
    setShowScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 20);
  };

  useEffect(() => {
    updateScrollButtons();
  }, [reviews]);

  const scrollByAmount = (amount) => {
    listRef.current?.scrollBy({ top: amount, behavior: "smooth" });
  };

  const submitReview = async () => {
    if (submitting) return; // đang gửi rồi thì bỏ qua, tránh gửi trùng
    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để đánh giá!");
      return;
    }
    if (!comment.trim()) return;

    const newReview = {
      productId: productId !== undefined ? String(productId) : null,
      collection: collectionName,
      userId: currentUser.id,
      userName: currentUser.fullName,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
      id: Date.now().toString(),
      hidden: false,
    };

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:3000/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview),
      });
      if (res.ok) {
        toast.success("Đã gửi đánh giá!");
        setComment("");
        setRating(5);
        fetchReviews();
      } else {
        toast.error("Không thể gửi đánh giá, vui lòng thử lại!");
      }
    } catch {
      toast.error("Không thể gửi đánh giá!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitReview();
  };

  const handleReplySubmit = async (reviewId) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const res = await fetch(`http://localhost:3000/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: replyText.trim(),
          replyAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success("Đã gửi phản hồi!");
        setReplyingId(null);
        setReplyText("");
        fetchReviews();
      } else {
        toast.error("Không thể gửi phản hồi, vui lòng thử lại!");
      }
    } catch {
      toast.error("Không thể gửi phản hồi!");
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <div className="reviews-header__title">
          <h3>Đánh giá sản phẩm</h3>
          <span className="reviews-count-badge">{reviews.length}</span>
        </div>
      </div>

      <RatingSummary reviews={reviews} />

      <div className="reviews-body">
        <aside className="reviews-form-panel">
          <h4>Viết đánh giá</h4>

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <StarSelector value={rating} onChange={setRating} />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="review-comment">
                Nhận xét
                <span className="form-label__hint"></span>
              </label>
              <textarea
                id="review-comment"
                ref={commentRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  if (e.repeat) return;
                  e.preventDefault();
                  submitReview();
                }}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                maxLength={1000}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </form>
        </aside>

        <div className="reviews-list-wrapper">
          <div
            className="reviews-list-panel"
            ref={listRef}
            onScroll={updateScrollButtons}
          >
            {status === "loading" && (
              <div className="reviews-loading">
                {[1, 2, 3].map((n) => (
                  <div className="review-skeleton" key={n}>
                    <div className="skeleton-avatar" />
                    <div className="skeleton-lines">
                      <div className="skeleton-line skeleton-line--short" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line skeleton-line--medium" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status === "error" && (
              <div className="reviews-empty reviews-empty--error">
                <div className="empty-icon">⚠️</div>
                <p>Không tải được đánh giá. Vui lòng thử lại sau.</p>
                <button
                  type="button"
                  className="retry-btn"
                  onClick={fetchReviews}
                >
                  Thử lại
                </button>
              </div>
            )}

            {status === "ready" && reviews.length === 0 && (
              <div className="reviews-empty">
                <div className="empty-icon">💬</div>
                <p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
              </div>
            )}

            {status === "ready" &&
              reviews.map((rv) => (
                <div key={rv.id} className="review-card">
                  <div className="review-avatar" aria-hidden="true">
                    {getInitials(rv.userName)}
                  </div>
                  <div className="review-body">
                    <div className="review-meta">
                      <span className="review-author">{rv.userName}</span>
                      <StarDisplay rating={rv.rating} size="sm" />
                      <span className="review-date">
                        {formatDate(rv.createdAt)}
                      </span>
                    </div>
                    <p className="review-comment">{rv.comment}</p>

                    {rv.reply && (
                      <div className="review-reply">
                        <span className="review-reply-label">
                          Phản hồi từ shop
                        </span>
                        <p className="review-reply-text">{rv.reply}</p>
                        <span className="review-reply-date">
                          {formatDate(rv.replyAt)}
                        </span>
                      </div>
                    )}

                    {isAdmin && !rv.reply && (
                      <div className="review-reply-form">
                        {replyingId === rv.id ? (
                          <>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Nhập phản hồi cho khách hàng..."
                              autoFocus
                            />
                            <div className="review-reply-actions">
                              <button
                                type="button"
                                className="reply-send-btn"
                                onClick={() => handleReplySubmit(rv.id)}
                                disabled={replySubmitting}
                              >
                                {replySubmitting ? "Đang gửi..." : "Gửi"}
                              </button>
                              <button
                                type="button"
                                className="reply-cancel-btn"
                                onClick={() => {
                                  setReplyingId(null);
                                  setReplyText("");
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="reply-open-btn"
                            onClick={() => setReplyingId(rv.id)}
                          >
                            Phản hồi
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {status === "ready" && reviews.length > 0 && (
            <div className="scroll-controls">
              <button
                type="button"
                className={`scroll-btn${showScrollUp ? " is-visible" : ""}`}
                onClick={() => scrollByAmount(-200)}
                aria-label="Cuộn lên"
              >
                ↑
              </button>
              <button
                type="button"
                className={`scroll-btn${showScrollDown ? " is-visible" : ""}`}
                onClick={() => scrollByAmount(200)}
                aria-label="Cuộn xuống"
              >
                ↓
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReviews;
