import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import { getImageUrl } from "../../utils/imageUtils";
import "./ProductMangaNew.css";
import ShowroomSystem from "../../pages/ShowroomSystem";

const trustBadges = [
  "Hàng chính hãng 100%",
  "Đóng gói cẩn thận",
  "Hỗ trợ đổi trả nhanh",
  "Giao hàng toàn quốc",
];

const ProductMangaNew = () => {
  const navigate = useNavigate();
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("http://localhost:3000/appliances")
      .then((res) => res.json())
      .then((data) => setProductList(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Lỗi tải danh sách đồ gia dụng:", err))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "Liên hệ";
    }
    return price.toLocaleString("vi-VN") + "đ";
  };

  // Tính giá gốc (trước giảm) từ price + discountPercent, giống hệt cách
  // trang chi tiết đang tính, để 2 nơi hiển thị nhất quán con số với nhau
  const getOldPrice = (item) => {
    if (!item.discountPercent || item.discountPercent <= 0) return null;
    return Math.round(item.price / (1 - item.discountPercent / 100));
  };

  return (
    <div className="Pro-demo">
      <Header />

      {/* 1. Thanh điều hướng (Breadcrumbs) */}
      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link to="/proDemo">
            <span className="demo-bread-current">Đồ Gia Dụng</span>
          </Link>
          <Link to="/product-manga-new">
            <span className="demo-bread-current">Sản Phẩm Mới Về</span>
          </Link>
        </div>
      </div>

      {/* 2. Lưới sản phẩm đồ gia dụng */}
      <div className="demo-list-container">
        {loading && <p className="demo-loading">Đang tải sản phẩm...</p>}

        {!loading && productList.length === 0 && (
          <p className="demo-empty">Chưa có sản phẩm trưng bày.</p>
        )}

        <div className="demo-grid-1">
          {productList.map((item) => {
            const oldPrice = getOldPrice(item);
            return (
              <div
                key={item.id}
                className="demo-card-1"
                onClick={() => navigate(`/appliance/${item.id}`)}
              >
                <div className="img-demo">
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getImageUrl(undefined);
                    }}
                  />
                  {item.discountPercent > 0 && (
                    <div className="demo-spec-overlay">
                      <span className="demo-spec-main">
                        -{item.discountPercent}%
                      </span>
                      <span className="demo-spec-sub">{item.shortSpec}</span>
                    </div>
                  )}
                </div>
                <div className="demo-content">
                  <h4 className="demo-name">{item.name}</h4>
                  <div className="demo-chips">
                    <span className="demo-chip">
                      Bảo hành {item.warranty || "12 tháng"}
                    </span>
                  </div>

                  <ul className="demo-trust-list">
                    {trustBadges.map((point, i) => (
                      <li key={i} className="demo-trust-item">
                        {point}
                      </li>
                    ))}
                  </ul>

                  <div className="demo-price-row">
                    {oldPrice && (
                      <span className="demo-price-old">
                        {formatPrice(oldPrice)}
                      </span>
                    )}
                    <p className="demo-price">{formatPrice(item.price)}</p>
                  </div>

                  <div className="promo-tags">Trả góp 0%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Sevicer />
      <ShowroomSystem />
      <FooterUser />
    </div>
  );
};

export default ProductMangaNew;
