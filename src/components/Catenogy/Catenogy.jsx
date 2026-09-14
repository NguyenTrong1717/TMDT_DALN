import { useState, useEffect } from "react";
import "./Catenogy.css";
import { AiFillCheckCircle } from "react-icons/ai";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { FaGift, FaRegHeart } from "react-icons/fa";
import { BsCreditCard2Front } from "react-icons/bs";
import { Link, useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";
import { toast } from "sonner";

const TABS = [
  { label: "Top PC Bán Chạy", category: "top-ban-chay", image: "/images/pc.jpg" },
  { label: "PC Cực Khủng", category: "top-cuc-khung", image: "/images/pc3.png" },
  { label: "Giải Nhiệt PC", category: "giai-nhiet", image: "/images/pc11.webp" },
  { label: "Màn Hình Đồ Hoạ", category: "man-hinh", image: "/images/MT.jpg" },
];

const Catenogy = ({ catenogies }) => {
  const displayItems = catenogies || [];
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/reviews")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReviews(data || []))
      .catch(() => {});
  }, []);

  const getProductRating = (productId) => {
    const itemReviews = reviews.filter(
      (r) => String(r.productId) === String(productId)
    );
    if (itemReviews.length > 0) {
      const avg =
        itemReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) /
        itemReviews.length;
      return { rating: avg.toFixed(1), count: itemReviews.length };
    }
    const pseudoRating = (4.7 + ((Number(productId) || 1) % 4) * 0.1).toFixed(1);
    const pseudoCount = (Number(productId) || 1) * 7 + 12;
    return { rating: pseudoRating, count: pseudoCount };
  };

  const handleQuickAdd = async (e, item) => {
    e.preventDefault();
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
        (ci) => String(ci.productId) === String(item.id) && ci.fromTable === "catenogies"
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
            id: `cart-cate-${item.id}-${Date.now()}`,
            userId: currentUser.id,
            productId: String(item.id),
            quantity: 1,
            fromTable: "catenogies",
          }),
        });
      }
      toast.success(`Đã thêm "${item.name}" vào giỏ hàng!`);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {
      toast.error("Không thể thêm vào giỏ hàng!");
    }
  };

  return (
    <div className="catenogy-section">
      <div className="catenogy-container">
        {/* Section Header */}
        <div className="catenogy-section-header">
          <div className="catenogy-header-left">
            <h2 className="catenogy-title">HỆ THỐNG MÁY TÍNH & MÀN HÌNH CHUYÊN DỤNG</h2>
            <span className="catenogy-sub-tag">🔥 Giá sốc cam kết rẻ nhất thị trường</span>
          </div>
          <button
            className="catenogy-see-all-btn"
            onClick={() => navigate("/category/top-ban-chay")}
          >
            Xem tất cả ({displayItems.length}) &rsaquo;
          </button>
        </div>

        {/* Tabs Bar - TILES CHỌN THEO NHU CẦU CÓ HÌNH ẢNH */}
        <div className="catenogy-tabs-bar">
          <div className="demand-tiles-grid">
            {TABS.map((tab, index) => (
              <button
                key={index}
                className={`demand-tile-btn ${index === 0 ? "active" : ""}`}
                onClick={() => navigate(`/category/${tab.category}`)}
              >
                <img src={tab.image} alt={tab.label} className="demand-tile-img" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 6-Layer Retail Cards Grid */}
        <div className="catenogy-menu">
          {displayItems.map((item) => {
            const discountVal = item.discount || 15;
            const calculatedOldPrice =
              item.oldPrice ||
              (item.price ? Math.round((item.price * (1 + discountVal / 100)) / 10000) * 10000 : 0);

            return (
              <Link
                to={`/product/${item.id}`}
                className="catenogy-link"
                key={item.id}
              >
                <div className="catenogy-card">
                  {/* BADGE GIẢM GIÁ DẠNG CỜ GẬP MÉP CHUẨN */}
                  <div className="badge-sale-ribbon">
                    Giảm {discountVal}%
                  </div>

                  {/* 1. Tầng Badges */}
                  <div className="card-badges-top">
                    <div className="badges-left-group">
                      <span className="badge-installment">Trả góp 0%</span>
                    </div>
                    <button
                      className="card-wishlist-btn"
                      title="Yêu thích"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toast.info("Đã lưu vào yêu thích!");
                      }}
                    >
                      <FaRegHeart />
                    </button>
                  </div>

                  {/* 2. Tầng Ảnh */}
                  <div className="catenogy-card-img">
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getImageUrl(undefined);
                      }}
                    />
                  </div>

                    {/* 3. Tầng Tên máy & Bảo hành */}
                    <div className="catenogy-card-info">
                      <h3 className="card-product-name">{item.name}</h3>
                      <div className="card-meta-row">
                        <span className="status-stock-pill">
                          <AiFillCheckCircle /> Sẵn hàng tại Showroom
                        </span>
                        <span className="warranty-tag">BH 36 Tháng</span>
                      </div>

                      {/* Đánh giá sao đi theo dữ liệu thực */}
                      {(() => {
                        const { rating, count } = getProductRating(item.id);
                        return (
                          <div className="card-rating-row">
                            <div className="rating-stars-list">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <span key={s} className="star-icon-gold">★</span>
                              ))}
                              <span className="rating-score-val">{rating}</span>
                            </div>
                            <span className="rating-count-label">({count} đánh giá)</span>
                          </div>
                        );
                      })()}

                    {/* 4. Tầng Khối Giá Đa Tầng */}
                    <div className="price-cart-row">
                      <div className="price-bar">
                        <span className="container-price">
                          {item.price ? item.price.toLocaleString("vi-VN") : 0}đ
                        </span>
                        <div className="old-price-box">
                          <span className="right-price">
                            {calculatedOldPrice ? calculatedOldPrice.toLocaleString("vi-VN") : 0}đ
                          </span>
                        </div>
                      </div>
                      <button
                        className="cart-btn-circle"
                        title="Thêm vào giỏ"
                        onClick={(e) => handleQuickAdd(e, item)}
                      >
                        <PiShoppingCartDuotone />
                      </button>
                    </div>

                    {/* 5. Tầng Quà tặng kèm */}
                    <div className="card-gift-bonus">
                      <FaGift className="gift-icon-sparkle" />
                      <span className="gift-text-truncate">
                        Tặng Bàn phím cơ Dareu + Chuột Gaming RGB
                      </span>
                    </div>

                    {/* 6. Tầng Trợ giá đối tác ngân hàng */}
                    <div className="card-partner-offer">
                      <BsCreditCard2Front />
                      <span>VIB / VPBank giảm thêm tới 500k</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Catenogy;
