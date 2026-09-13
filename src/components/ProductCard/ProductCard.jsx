import { useState } from "react";
import "./ProductCard.css";
import { PiShoppingCartDuotone, PiHeartFill, PiHeartDuotone } from "react-icons/pi";
import { AiFillCheckCircle, AiFillThunderbolt } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ProductCard = ({ product, onCardClick }) => {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleGoToDetail = () => {
    if (onCardClick) {
      onCardClick(product.id);
    }
    navigate(`/page/${product.id}`);
  };

  const handleQuickAddToCart = async (e) => {
    e.stopPropagation();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để thêm vào giỏ hàng!");
      navigate("/login");
      return;
    }

    try {
      setIsAdding(true);
      const cartRes = await fetch(`http://localhost:3000/cart?userId=${currentUser.id}`);
      let cartItems = [];
      if (cartRes.ok) cartItems = await cartRes.json();

      const existingItem = cartItems.find(
        (item) => String(item.productId) === String(product.id)
      );

      if (existingItem) {
        await fetch(`http://localhost:3000/cart/${existingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: Number(existingItem.quantity || 1) + 1 }),
        });
      } else {
        await fetch("http://localhost:3000/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `cart-${product.id}-${Date.now()}`,
            userId: currentUser.id,
            productId: String(product.id),
            quantity: 1,
            fromTable: "products",
          }),
        });
      }

      toast.success(`Đã thêm "${product.name?.slice(0, 26)}..." vào giỏ!`);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error(err);
      toast.error("Không thể thêm vào giỏ hàng");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleWishlist = (e) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast(isWishlisted ? "Đã xóa khỏi yêu thích" : "Đã thêm vào mục yêu thích!");
  };

  const formattedPrice = product?.price ? Number(product.price).toLocaleString("vi-VN") : "0";
  const oldPrice = product?.oldPrice || (product?.discount ? Math.round(product.price / (1 - product.discount / 100)) : null);

  return (
    <div
      className="product-card"
      onClick={handleGoToDetail}
      role="button"
      tabIndex={0}
    >
      <div className="product-card-top-tags">
        {product?.discount ? (
          <span className="badge-sale">
            <AiFillThunderbolt className="badge-icon" /> -{product.discount}%
          </span>
        ) : (
          <span className="badge-hot">HOT</span>
        )}
        <button
          className={`wishlist-btn-pill ${isWishlisted ? "active" : ""}`}
          onClick={handleToggleWishlist}
          title="Yêu thích"
          type="button"
        >
          {isWishlisted ? <PiHeartFill /> : <PiHeartDuotone />}
        </button>
      </div>

      <div className="product-card-img">
        <img
          src={product?.image || "/images/MT.jpg"}
          alt={product?.name || "Sản phẩm công nghệ"}
          loading="lazy"
          onError={(e) => {
            e.target.src = "/images/pc.jpg";
          }}
        />
      </div>

      <div className="product-card-info">
        <p className="status-stock">
          <AiFillCheckCircle className="icon-stock" />
          {product?.status || "Sẵn sàng giao"}
        </p>
        <h4 title={product?.name}>{product?.name}</h4>

        <div className="price-row">
          <div className="price-box">
            <span className="current-price">{formattedPrice}đ</span>
            {oldPrice && (
              <span className="old-price">
                {Number(oldPrice).toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
          <button
            className={`add-cart-btn-circle ${isAdding ? "adding" : ""}`}
            onClick={handleQuickAddToCart}
            title="Thêm nhanh vào giỏ"
            type="button"
          >
            <PiShoppingCartDuotone />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
