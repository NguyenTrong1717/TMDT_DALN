import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import "./Prodemo.css";
import ShowroomSystem from "../../pages/ShowroomSystem";
import ProductReviews from "../../pages/ProductReviews";

const trustPoints = [
  "Đã kiểm định chất lượng",
  "Hoạt động ổn định",
  "Ngoại hình đẹp",
  "Ít trầy xước",
  "Chính hãng",
];

const Prodemo = () => {
  const navigate = useNavigate();
  const [prodemoList, setProdemoList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lấy dữ liệu danh sách Laptop biệt lập từ bảng demoUnits
  useEffect(() => {
    fetch("http://localhost:3000/demoUnits")
      .then((res) => res.json())
      .then((data) => setProdemoList(data))
      .catch((err) => console.error("Lỗi tải danh sách demoUnits:", err))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "Liên hệ";
    }
    return price.toLocaleString("vi-VN") + "đ";
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
          <Link>
            <span className="demo-bread-current">Đồ Gia Dụng</span>
          </Link>
          <Link to="/product-manga-new">
            <span className="demo-bread-current">Sản Phẩm Mới Về</span>
          </Link>
        </div>
      </div>

      {/* 2. Lưới sản phẩm Laptop */}
      <div className="demo-list-container">
        {loading && <p className="demo-loading">Đang tải sản phẩm...</p>}

        {!loading && prodemoList.length === 0 && (
          <p className="demo-empty">Chưa có sản phẩm trưng bày.</p>
        )}

        <div className="demo-grid-1">
          {prodemoList.map((item) => (
            <div
              key={item.id}
              className="demo-card-1"
              //   onClick={() => navigate(`/menu/${item.id}`)}
            >
              <div className="img-demo">
                <img src={item.image} alt={item.name} />
                {item.specBadge && (
                  <div className="demo-spec-overlay">
                    <span className="demo-spec-main">{item.specBadge}</span>
                    <span className="demo-spec-sub">{item.specDetail}</span>
                  </div>
                )}
              </div>
              <div className="demo-content">
                <h4 className="demo-name">{item.name}</h4>

                <p className="demo-summary">
                  {item.cpu || "Đang cập nhật"} ... {item.ram || "0"}/
                  {item.storage || "0"}
                </p>

                <div className="demo-chips">
                  <span className="demo-chip">
                    Bảo hành {item.warranty || "12 tháng"}
                  </span>
                </div>

                <ul className="demo-trust-list">
                  {trustPoints.map((point, i) => (
                    <li key={i} className="demo-trust-item">
                      {point}
                    </li>
                  ))}
                </ul>

                {/* <p className="demo-price">{formatPrice(item.price)}</p> */}
                <div className="promo-tags">Trả góp 0%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProductReviews />
      <Sevicer />
      <ShowroomSystem />
      <FooterUser />
    </div>
  );
};

export default Prodemo;
