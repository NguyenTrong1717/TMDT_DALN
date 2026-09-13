import { useNavigate } from "react-router-dom";
import "./ProductCard.css";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { FaGift, FaRegHeart } from "react-icons/fa";
import { getImageUrl } from "../../utils/imageUtils";
import { toast } from "sonner";

const ComponentCard = ({ product }) => {
  const navigate = useNavigate();

  const handleGoToDetail = () => {
    navigate(`/component/${product.id}`);
  };

  const handleQuickAdd = async (e) => {
    e.stopPropagation();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để thêm vào giỏ hàng!");
      navigate("/login");
      return;
    }

    try {
      const cartRes = await fetch(
        `http://localhost:3000/cart?userId=${currentUser.id}`
      );
      let cartItems = [];
      if (cartRes.ok) cartItems = await cartRes.json();

      const existingItem = cartItems.find(
        (item) => String(item.productId) === String(product.id) && item.fromTable === "eventList"
      );

      if (existingItem) {
        await fetch(`http://localhost:3000/cart/${existingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: Number(existingItem.quantity) + 1 }),
        });
      } else {
        await fetch("http://localhost:3000/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `cart-comp-${product.id}-${Date.now()}`,
            userId: currentUser.id,
            productId: String(product.id),
            quantity: 1,
            fromTable: "eventList",
          }),
        });
      }
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {
      toast.error("Không thể thêm vào giỏ hàng!");
    }
  };

  const discountVal = product?.discount || 8;
  const calculatedOldPrice =
    product?.oldPrice ||
    (product?.price ? Math.round((product.price * (1 + discountVal / 100)) / 10000) * 10000 : 0);
  const savings =
    calculatedOldPrice - (product?.price || 0) > 0
      ? calculatedOldPrice - (product?.price || 0)
      : 300000;

  return (
    <div
      className="product-card"
      onClick={handleGoToDetail}
      style={{ cursor: "pointer" }}
    >
      {/* BADGE GIẢM GIÁ DẠNG CỜ GẬP MÉP CHUẨN CELLPHONES / THE GIOI DI DONG THEO HÌNH ẢNH */}
      <div className="badge-sale-ribbon">
        Giảm {discountVal}%
      </div>

      {/* TẦNG 1: Hình ảnh & Tag tình trạng + Trả góp 0% + Nút thả tim */}
      <div className="card-layer-1">
        <div className="card-badges-top">
          <div className="badges-left-group">
            <span className="badge-installment">Trả góp 0%</span>
            <span className="badge-hot-tag">
              <span className="flame-icon-bounce">🔥</span> GIÁ RẺ QUÁ
            </span>
          </div>
          <button
            type="button"
            className="card-wishlist-btn"
            title="Thêm vào yêu thích"
            onClick={(e) => {
              e.stopPropagation();
              toast.info("Đã lưu vào danh sách yêu thích!");
            }}
          >
            <FaRegHeart />
          </button>
        </div>

        <div className="product-card-img">
          <img
            src={getImageUrl(product?.image)}
            alt={product?.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getImageUrl(undefined);
            }}
          />
        </div>
      </div>

      {/* TẦNG 2: Tên máy & Đặc điểm cốt lõi (Có nhãn lửa HOT) */}
      <div className="card-layer-2">
        <h4>
          <span className="name-flame-pill">🔥 HOT</span>
          {product?.name}
        </h4>
      </div>

      {/* TẦNG 3: Khối giá đa tầng (Giá cuối to đậm + Giá gốc gạch ngang + Tag tiết kiệm lửa) */}
      <div className="card-layer-3">
        <div className="price-row-dense">
          <span className="current-price">
            {product?.price ? product.price.toLocaleString("vi-VN") : 0}đ
            <span className="flame-icon-bounce">🔥</span>
          </span>
          <div className="old-price-line">
            <span className="old-price">
              {calculatedOldPrice ? calculatedOldPrice.toLocaleString("vi-VN") : 0}đ
            </span>
          </div>
          <span className="flame-saving-chip">
            🔥 Tiết kiệm {savings.toLocaleString("vi-VN")}đ
          </span>
        </div>
      </div>

      {/* TẦNG 4: Hộp ưu đãi thành viên / Quà tặng gạch đầu dòng */}
      <div className="card-layer-4">
        <div className="card-gift-bonus">
          <div className="gift-bonus-line">
            <FaGift className="gift-icon-sparkle" />
            <span className="gift-text-truncate">
              🔥 KM: Miễn phí tra keo MX-4 + Cáp kết nối cao cấp
            </span>
          </div>
          <div className="smember-benefit-tag">
            <span>🔥 H-Member trợ giá thêm tới 300.000đ</span>
          </div>
        </div>
      </div>

      {/* TẦNG 5: Logo Đối tác & Ưu đãi Thanh toán */}
      <div className="card-layer-5">
        <div className="card-partner-offer">
          <div className="micro-partner-logos">
            <span className="partner-micro-badge vib">VIB</span>
            <span className="partner-micro-badge vpbank">VPBank</span>
          </div>
          <span className="partner-offer-text">
            🔥 Giảm thêm tới 500.000đ khi mở thẻ
          </span>
        </div>
      </div>

      {/* TẦNG 6: Trạng thái kho & Đánh giá + Nút giỏ hàng */}
      <div className="card-layer-6">
        <div className="stock-rating-row">
          <div className="stock-rating-left">
            <span className="stock-status-dot">● Sẵn hàng tại Showroom</span>
            <span className="rating-star-compact">
              <span className="stars-gold">★★★★★</span>
              <strong>{product?.rating || (4.8 + ((Number(product?.id) || 1) % 3) * 0.1).toFixed(1)}</strong>
              <span className="review-num">({product?.reviewsCount || (Number(product?.id) || 1) * 5 + 14})</span>
            </span>
          </div>
          <button
            type="button"
            className="add-cart-btn-circle"
            title="Thêm vào giỏ"
            onClick={handleQuickAdd}
          >
            <PiShoppingCartDuotone />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComponentCard;
