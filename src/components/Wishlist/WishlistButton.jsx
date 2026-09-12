import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "sonner";
import "./WishlistButton.css";

const API_URL = "http://localhost:3000";

const WishlistButton = ({ productId, fromTable, productName = "" }) => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [wishlistId, setWishlistId] = useState(null);
  const [checking, setChecking] = useState(true);

  const isFavorited = !!wishlistId;

  const fetchWishlistEntry = async () => {
    if (!currentUser || !productId) {
      setChecking(false);
      return;
    }
    try {
      let res = await fetch(`${API_URL}/wishlist?userId=${currentUser.id}`);
      let data = res.ok ? await res.json() : [];

      // Lệch kiểu dữ liệu String/Number thì lọc cứng lại bằng JS cho chắc
      if (!data || data.length === 0) {
        const resAll = await fetch(`${API_URL}/wishlist`);
        if (resAll.ok) {
          const all = await resAll.json();
          data = all.filter(
            (item) => String(item.userId) === String(currentUser.id),
          );
        }
      }

      const found = data.find(
        (item) =>
          String(item.productId) === String(productId) &&
          item.fromTable === fromTable,
      );
      setWishlistId(found ? found.id : null);
    } catch (err) {
      console.error("Lỗi kiểm tra yêu thích:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchWishlistEntry();
  }, [productId, fromTable]);

  const handleToggle = async () => {
    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để lưu sản phẩm yêu thích!");
      navigate("/login");
      return;
    }
    if (checking) return;

    try {
      if (isFavorited) {
        const res = await fetch(`${API_URL}/wishlist/${wishlistId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setWishlistId(null);
          toast.success("Đã bỏ khỏi danh sách yêu thích!");
          window.dispatchEvent(
            new CustomEvent("wishlistUpdated", {
              detail: { action: "removed", productName },
            }),
          );
        }
      } else {
        const newEntry = {
          id: `wl-${fromTable}-${productId}-${Date.now()}`,
          userId: currentUser.id,
          productId: String(productId),
          fromTable,
          addedAt: new Date().toISOString(),
        };
        const res = await fetch(`${API_URL}/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEntry),
        });
        if (res.ok) {
          setWishlistId(newEntry.id);
          toast.success("Đã thêm vào danh sách yêu thích!");
          window.dispatchEvent(
            new CustomEvent("wishlistUpdated", {
              detail: { action: "added", productName },
            }),
          );
        }
      }
    } catch (err) {
      console.error("Lỗi cập nhật yêu thích:", err);
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  return (
    <button
      type="button"
      className={`wishlist-btn ${isFavorited ? "is-active" : ""}`}
      onClick={handleToggle}
      title={isFavorited ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      aria-label="Yêu thích sản phẩm"
    >
      {isFavorited ? <FaHeart /> : <FaRegHeart />}
    </button>
  );
};

export default WishlistButton;
