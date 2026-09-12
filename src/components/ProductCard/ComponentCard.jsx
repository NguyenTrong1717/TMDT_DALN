import { useNavigate } from "react-router-dom";
import "./ProductCard.css";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { AiFillCheckCircle } from "react-icons/ai";
import { getImageUrl } from "../../utils/imageUtils";

const ComponentCard = ({ product }) => {
  const navigate = useNavigate();

  const handleGoToDetail = () => {
    navigate(`/component/${product.id}`);
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
            onClick={(e) => e.stopPropagation()}
          >
            <PiShoppingCartDuotone />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComponentCard;
