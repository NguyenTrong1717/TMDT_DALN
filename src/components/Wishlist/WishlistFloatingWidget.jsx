import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import { FaHandHoldingHeart } from "react-icons/fa";
import { BsFillHeartPulseFill } from "react-icons/bs";
import "./WishlistFloatingWidget.css";

const API_URL = "http://localhost:3000";

const WishlistFloatingWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [count, setCount] = useState(0);
  const [bubble, setBubble] = useState(null); // { action, productName } | null
  const hideTimer = useRef(null);

  const fetchCount = async () => {
    if (!currentUser) {
      setCount(0);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/wishlist?userId=${currentUser.id}`);
      let data = res.ok ? await res.json() : [];

      if (!data || data.length === 0) {
        const resAll = await fetch(`${API_URL}/wishlist`);
        if (resAll.ok) {
          const all = await resAll.json();
          data = all.filter(
            (item) => String(item.userId) === String(currentUser.id),
          );
        }
      }
      setCount(data.length);
    } catch (err) {
      console.error("Lỗi tải số lượng yêu thích (widget nổi):", err);
    }
  };

  useEffect(() => {
    fetchCount();

    const handleUpdate = (e) => {
      fetchCount();
      const detail = e.detail || {};
      if (detail.action) {
        setBubble(detail);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setBubble(null), 4000);
      }
    };

    window.addEventListener("wishlistUpdated", handleUpdate);
    return () => {
      window.removeEventListener("wishlistUpdated", handleUpdate);
      clearTimeout(hideTimer.current);
    };
  }, [currentUser?.id]);

  // Không hiện widget nếu chưa đăng nhập, hoặc đang đứng ngay trên trang Yêu Thích rồi
  if (!currentUser || location.pathname === "/wishlist") return null;

  const goToWishlist = () => {
    setBubble(null);
    navigate("/wishlist");
  };

  return (
    <div className="wishlist-fw">
      {bubble && (
        <div className="wishlist-fw__bubble" onClick={goToWishlist}>
          <div className="wishlist-fw__bubble-icon">
            <BsFillHeartPulseFill />
          </div>
          <div className="wishlist-fw__bubble-text">
            <strong>
              {bubble.action === "added"
                ? "Đã thêm vào yêu thích!"
                : "Đã bỏ khỏi yêu thích"}
            </strong>
            {bubble.productName && <span>{bubble.productName}</span>}
            <em>Bấm để xem danh sách</em>
          </div>
        </div>
      )}

      <button
        className="wishlist-fw__trigger"
        onClick={goToWishlist}
        aria-label="Xem sản phẩm yêu thích"
      >
        <BsFillHeartPulseFill />
        {count > 0 && <span className="wishlist-fw__badge">{count}</span>}
      </button>
    </div>
  );
};

export default WishlistFloatingWidget;
