import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import "./ProductPage.css";
import PromoPopup from "../../components/PromoPopup/PromoPopup";

const ProductPage = () => {
  const navigate = useNavigate();
  const [productsList, setProductsList] = useState([]);

  // Lấy dữ liệu danh sách Laptop biệt lập từ bảng ProductPagies
  useEffect(() => {
    fetch("http://localhost:3000/ProductPagies")
      .then((res) => res.json())
      .then((data) => setProductsList(data))
      .catch((err) => console.error("Lỗi tải danh sách ProductPagies:", err));
  }, []);

  return (
    <div className="product-page">
      <PromoPopup />
      <Header />

      {/* 1. Thanh điều hướng (Breadcrumbs) */}
      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ </span>
          </Link>
          <Link to="/product-manga-new">
            <span>Sản Phẩm Mới Về</span>
          </Link>
          <Link to="/">
            <span className="demo-bread-current">Sản Phẩm Đặc Biệt </span>
          </Link>
        </div>
      </div>

      {/* 2. Lưới sản phẩm Laptop */}
      <div className="product-list-container">
        <div className="product-grid-1">
          {productsList.map((item) => (
            <div
              key={item.id}
              className="product-card-1"
              // CHUYỂN HƯỚNG SANG PRODUCT MENU
              onClick={() => navigate(`/menu/${item.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="img-wrapper">
                <img src={item.image} alt={item.name} />
              </div>
              <div className="card-content">
                <h4 className="card-name">{item.name}</h4>
                <p className="card-price">
                  {Number(item.price || 0).toLocaleString()}đ
                </p>
                <div className="promo-tags">Trả góp 0%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sevicer />
      <FooterUser />
    </div>
  );
};

export default ProductPage;
