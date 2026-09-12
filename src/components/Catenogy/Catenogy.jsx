import "./Catenogy.css";
import { AiFillCheckCircle } from "react-icons/ai";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { Link, useNavigate } from "react-router-dom";

const TABS = [
  { label: "TOP PC BÁN CHẠY", category: "top-ban-chay" },
  { label: "TOP PC CỰC KHỦNG", category: "top-cuc-khung" },
  { label: "GIẢI NHIỆT PC", category: "giai-nhiet" },
  { label: "MÀN HÌNH ĐỒ HOẠ", category: "man-hinh" },
];

const Catenogy = ({ catenogies }) => {
  const displayItems = catenogies || [];
  const navigate = useNavigate();

  return (
    <div className="catenogy-section">
      <div className="catenogy-container">
        <div className="catenogy-tabs-bar">
          <nav className="catenogy-nav">
            {TABS.map((tab, index) => (
              <span
                key={index}
                className={`catenogy-item ${index === 0 ? "active" : ""}`}
                onClick={() => navigate(`/category/${tab.category}`)}
                style={{ cursor: "pointer" }}
              >
                {tab.label}
              </span>
            ))}
          </nav>
        </div>

        <div className="catenogy-menu">
          {displayItems.map((item) => (
            <Link
              to={`/product/${item.id}`}
              className="catenogy-link"
              key={item.id}
            >
              <div className="catenogy-card">
                {item.discount && (
                  <div className="badge-sale">-{item.discount}%</div>
                )}
                <div className="catenogy-card-img">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="catenogy-card-info">
                  <h4>{item.name}</h4>
                  <p className="sta-stock">
                    <AiFillCheckCircle className="icon-stock" />
                    {item.status || "Còn hàng"}
                  </p>
                  <div className="price-nav">
                    <div className="price-bar">
                      <span className="container-price">
                        {item.price ? item.price.toLocaleString() : 0} đ
                      </span>
                      {item.oldPrice && (
                        <span className="right-price">
                          {item.oldPrice.toLocaleString()} đ
                        </span>
                      )}
                    </div>
                    <button className="cart-btn-circle" title="Thêm vào giỏ">
                      <PiShoppingCartDuotone />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Catenogy;
