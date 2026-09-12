import "./ProductCard.css";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { AiFillCheckCircle } from "react-icons/ai";
import { useNavigate } from "react-router-dom";

// Nhận thêm một prop là onCardClick từ Home truyền xuống

const ProductCard = ({ product, onCardClick }) => {
  const navigate = useNavigate();
  const handleGoToDetail = () => {
    // Nếu có hàm onCardClick truyền xuống thì kích hoạt nó và gửi kèm ID sản phẩm
    if (onCardClick) {
      onCardClick(product.id);
    }
    navigate(`/page/${product.id}`);
  };

  return (
    <div
      className="product-card"
      onClick={handleGoToDetail}
      style={{ cursor: "pointer" }}
    >
      {product?.discount && (
        <div className="badge-sale">-{product.discount}%</div>
      )}
      <div className="product-card-img">
        <img src={product?.image} alt={product?.name} />
      </div>
      <div className="product-card-info">
        <h4>{product?.name}</h4>
        <p className="status-stock">
          <AiFillCheckCircle className="icon-stock" />
          {product?.status || "Còn hàng"}
        </p>
        <div className="price-row">
          <div className="price-box">
            <span className="current-price">
              {product?.price?.toLocaleString()}đ
            </span>
          </div>
          <button
            className="add-cart-btn-circle"
            onClick={(e) => e.stopPropagation()} // Chặn nhảy trang khi bấm giỏ hàng
          >
            <PiShoppingCartDuotone />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
