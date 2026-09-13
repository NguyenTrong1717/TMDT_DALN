import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";
import ProductGrid from "../components/ProductGrid/ProductGrid";
import Catenogy from "../components/Catenogy/Catenogy";
import EventList from "../components/Events/EventList";
import LaptopUser from "../components/Newlaptop/LaptopUser";
import Sevicer from "../components/Sevicer/Sevicer";
import FooterUser from "../components/Footer/FooterUser";
import ShowroomSystem from "./ShowroomSystem";
import IntroVideoModal from "../components/IntroVideo/IntroVideoModal";
import ProductCard from "../components/ProductCard/ProductCard";
import SeoArticleSection from "../components/SeoContent/SeoArticleSection";
import "./Home.css";

import {
  FaShieldAlt,
  FaShippingFast,
  FaUndo,
  FaStore,
  FaFire,
} from "react-icons/fa";
import { BsCreditCard2Front, BsFillLightningChargeFill } from "react-icons/bs";

const Home = () => {
  const navigate = useNavigate();

  const [laptopUser, setLaptopUser] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [products, setProducts] = useState([]);
  const [catenogies, setCatenogies] = useState([]);
  const [, setLoading] = useState(true);
  const [footer] = useState([]);

  // Filter state for PC Gaming section
  const [priceFilter, setPriceFilter] = useState("all");

  // State for ad banners & live toast
  const [showLeftAd, setShowLeftAd] = useState(true);
  const [showRightAd, setShowRightAd] = useState(true);
  const [liveToast, setLiveToast] = useState({
    show: true,
    user: "Anh Hoàng (Cầu Giấy, HN)",
    product: "PC Gaming Core i5-13400F RTX 4060 8GB",
    time: "2 phút trước",
  });

  // Cycle real-time customer purchases
  useEffect(() => {
    const orderPool = [
      { user: "Anh Hoàng (Cầu Giấy, HN)", product: "PC Gaming Core i5-13400F RTX 4060 8GB", time: "Vừa xong" },
      { user: "Chị Mai (Quận 1, TP.HCM)", product: "Laptop Gaming Acer Nitro V 16 RTX 4050", time: "3 phút trước" },
      { user: "Anh Tuấn (Hải Châu, Đà Nẵng)", product: "Màn hình Asus TUF Gaming 27 inch 240Hz", time: "5 phút trước" },
      { user: "Bạn Linh (Ninh Kiều, Cần Thơ)", product: "Card Đồ Họa VGA RTX 4070 Super 12GB", time: "7 phút trước" },
      { user: "Anh Minh (Thanh Xuân, HN)", product: "PC Đồ Họa Intel Core i7-14700K 32GB RTX 4070", time: "8 phút trước" },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % orderPool.length;
      setLiveToast({ show: true, ...orderPool[idx] });
    }, 7500);
    return () => clearInterval(interval);
  }, []);

  // Flash sale countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    hours: 3,
    minutes: 42,
    seconds: 18,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, catenogiesRes, eventListRes, laptopRes] =
          await Promise.all([
            fetch("http://localhost:3000/products"),
            fetch("http://localhost:3000/catenogies"),
            fetch("http://localhost:3000/eventList"),
            fetch("http://localhost:3000/LaptopUser"),
          ]);

        setProducts(await productsRes.json());
        setCatenogies(await catenogiesRes.json());
        setEventList(await eventListRes.json());
        setLaptopUser(await laptopRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered PC products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (priceFilter === "under-15") return products.filter((p) => p.price < 15000000);
    if (priceFilter === "15-25")
      return products.filter((p) => p.price >= 15000000 && p.price <= 25000000);
    if (priceFilter === "above-25") return products.filter((p) => p.price > 25000000);
    return products;
  }, [products, priceFilter]);

  // Flash sale products (take 4 featured items)
  const flashSaleItems = useMemo(() => {
    if (catenogies && catenogies.length >= 4) return catenogies.slice(0, 4);
    if (products && products.length >= 4) return products.slice(0, 4);
    return [];
  }, [catenogies, products]);

  return (
    <div className="home-page">
      <IntroVideoModal />
      <Header />

      {/* 1. TOP COMMITMENT & BENEFIT BAR (CellphoneS / Hoàng Hà Style) */}
      <div className="home-trust-bar">
        <div className="home-trust-container">
          <div className="trust-item">
            <FaShieldAlt className="trust-icon" />
            <div className="trust-text">
              <strong>100% Chính Hãng</strong>
              <span>Cam kết bảo hành chính hãng</span>
            </div>
          </div>
          <div className="trust-item">
            <FaUndo className="trust-icon" />
            <div className="trust-text">
              <strong>1 Đổi 1 Trong 30 Ngày</strong>
              <span>Lỗi phần cứng đổi mới ngay</span>
            </div>
          </div>
          <div className="trust-item">
            <FaShippingFast className="trust-icon" />
            <div className="trust-text">
              <strong>Giao Nhanh 2 Giờ</strong>
              <span>Miễn phí giao hàng toàn quốc</span>
            </div>
          </div>
          <div className="trust-item">
            <BsCreditCard2Front className="trust-icon" />
            <div className="trust-text">
              <strong>Trả Góp 0% Lãi Suất</strong>
              <span>Duyệt 5 phút qua CCCD / Thẻ</span>
            </div>
          </div>
          <div className="trust-item">
            <FaStore className="trust-icon" />
            <div className="trust-text">
              <strong>15 Showroom Toàn Quốc</strong>
              <span>Trải nghiệm máy trên tay</span>
            </div>
          </div>
        </div>
      </div>


      {/* 1.2 HAI CÁNH GÀ BANNER QUẢNG CÁO DỌC 2 BÊN MÀN HÌNH (SKYSCRAPER WINGS) */}
      {showLeftAd && (
        <div
          className="home-skyscraper-ad left-wing"
          onClick={() => navigate("/category/top-ban-chay")}
          title="Xem ưu đãi siêu đại tiệc"
        >
          <button
            className="skyscraper-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowLeftAd(false);
            }}
            title="Đóng banner"
          >
            ✕
          </button>
          <div className="skyscraper-inner">
            <span className="skyscraper-badge">🔥 SIÊU ĐẠI TIỆC</span>
            <div className="skyscraper-title">PC GAMING & LAPTOP</div>
            <div className="skyscraper-discount">GIẢM 50%</div>
            <div className="skyscraper-perk">
              ✓ Trả góp 0% duyệt 5p<br />
              ✓ Tặng Gear 1.2Tr
            </div>
            <button className="skyscraper-btn">SĂN DEAL ▶</button>
          </div>
        </div>
      )}

      {showRightAd && (
        <div
          className="home-skyscraper-ad right-wing"
          onClick={() => navigate("/laptop/laptop-gaming")}
          title="Thu cũ đổi mới trợ giá khủng"
        >
          <button
            className="skyscraper-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowRightAd(false);
            }}
            title="Đóng banner"
          >
            ✕
          </button>
          <div className="skyscraper-inner">
            <span className="skyscraper-badge">🔥 THU CŨ ĐỔI MỚI</span>
            <div className="skyscraper-title">LÊN ĐỜI RTX 40</div>
            <div className="skyscraper-discount">TRỢ GIÁ 3TR</div>
            <div className="skyscraper-perk">
              ✓ Không lo bù tiền<br />
              ✓ Tặng quà 800k
            </div>
            <button className="skyscraper-btn">ĐỔI NGAY ▶</button>
          </div>
        </div>
      )}

      {/* 2. TOP HERO & SIDEBAR CATEGORIES */}
      <div className="layout">
        <Sidebar />
        
        {/* Hero Banner Promotion Grid */}
        <div className="home-hero-promos">
          <div className="hero-main-banner">
            <div className="hero-badge">ĐẠI TIỆC CÔNG NGHỆ 2026</div>
            <h2>MÁY TÍNH & LAPTOP GAMING THẾ HỆ MỚI</h2>
            <p>Trang bị RTX 40 Series & Core i7/i9 — Trợ giá học sinh sinh viên đến 3.000.000đ</p>
            <div className="hero-cta-row">
              <button
                className="hero-btn-primary"
                onClick={() => navigate("/category/top-ban-chay")}
              >
                <BsFillLightningChargeFill /> KHÁM PHÁ NGAY
              </button>
              <button
                className="hero-btn-secondary"
                onClick={() => navigate("/laptop/laptop-gaming")}
              >
                LAPTOP GAMING 0% LÃI SUẤT
              </button>
            </div>
          </div>

          <div className="hero-sub-banners">
            <div className="sub-banner sub-banner-1" onClick={() => navigate("/component/vga")}>
              <span className="sub-tag">CARD ĐỒ HỌA</span>
              <h4>RTX 4060 / 4070 Ti</h4>
              <p>Giảm sốc tới 2.500.000đ</p>
            </div>
            <div className="sub-banner sub-banner-2" onClick={() => navigate("/category/man-hinh")}>
              <span className="sub-tag">MÀN HÌNH GAMING</span>
              <h4>144Hz - 240Hz IPS 2K</h4>
              <p>Chỉ từ 2.890.000đ</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FLASH SALE COUNTDOWN SECTION */}
      <div className="flash-sale-section">
        <div className="flash-sale-container">
          <div className="flash-sale-header">
            <div className="flash-sale-title-group">
              <FaFire className="flash-flame-icon" />
              <h2 className="flash-sale-title">GIỜ VÀNG FLASH SALE</h2>
              <div className="flash-countdown-box">
                <span className="timer-unit">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="timer-colon">:</span>
                <span className="timer-unit">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="timer-colon">:</span>
                <span className="timer-unit">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>
            <button
              className="flash-sale-view-all"
              onClick={() => navigate("/category/top-ban-chay")}
            >
              Xem tất cả Flash Sale &rsaquo;
            </button>
          </div>

          <div className="flash-sale-grid">
            {flashSaleItems.map((item) => (
              <div key={item.id} className="flash-sale-card-wrapper">
                <ProductCard product={item} />
                <div className="flash-deal-progress">
                  <div className="progress-bar-fill" style={{ width: "78%" }}></div>
                  <span className="progress-label">🔥 Đã bán 78%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. PC GAMING SHOWCASE SECTION WITH FACETED FILTER */}
      <div className="home-section-wrapper" id="PC-gaming">
        <div className="home-section-container">
          <div className="home-section-header">
            <div className="header-left">
              <h2 className="home-section-title">DÀN PC GAMING & ĐỒ HỌA CAO CẤP</h2>
              <span className="home-section-sub">
                ⚡ Tối ưu hiệu năng high-setting — 100% Linh kiện mới chính hãng
              </span>
            </div>

            {/* Faceted Price Filter Chips */}
            <div className="home-filter-chips">
              <button
                className={`filter-chip ${priceFilter === "all" ? "active" : ""}`}
                onClick={() => setPriceFilter("all")}
              >
                Tất cả ({products.length})
              </button>
              <button
                className={`filter-chip ${priceFilter === "under-15" ? "active" : ""}`}
                onClick={() => setPriceFilter("under-15")}
              >
                Dưới 15 Triệu
              </button>
              <button
                className={`filter-chip ${priceFilter === "15-25" ? "active" : ""}`}
                onClick={() => setPriceFilter("15-25")}
              >
                15 - 25 Triệu
              </button>
              <button
                className={`filter-chip ${priceFilter === "above-25" ? "active" : ""}`}
                onClick={() => setPriceFilter("above-25")}
              >
                Trên 25 Triệu
              </button>
            </div>
          </div>

          <main className="main-content">
            <div id="pc-gaming">
              <ProductGrid products={filteredProducts} />
            </div>
          </main>
        </div>
      </div>

      {/* 4.1 DẢI BANNER ĐÔI BÁN LẺ SIÊU RỰC RỠ GIỮA TRANG */}
      <div className="home-mid-dual-banners">
        <div
          className="mid-banner-card banner-gaming"
          onClick={() => navigate("/component/vga")}
        >
          <div className="mid-banner-header">
            <span className="mid-banner-tag">🔥 ĐẠI CHIẾN ĐỒ HỌA</span>
            <span className="mid-banner-flame">🔥 CHỈ CÒN 12 SUẤT</span>
          </div>
          <h3>RTX 4060 / 4070 SUPER SERIES</h3>
          <p>Tặng kèm nguồn 750W 80 Plus Gold + Tản nhiệt nước AIO 240mm RGB</p>
          <div className="mid-banner-footer">
            <span className="mid-banner-price">Chỉ từ 7.890.000đ</span>
            <button className="mid-banner-cta">CHỐT DEAL NGAY &rsaquo;</button>
          </div>
        </div>

        <div
          className="mid-banner-card banner-monitor"
          onClick={() => navigate("/category/man-hinh")}
        >
          <div className="mid-banner-header">
            <span className="mid-banner-tag">🔥 XẢ KHO KHÔNG LỢI NHUẬN</span>
            <span className="mid-banner-flame">🔥 SỐ LƯỢNG CÓ HẠN</span>
          </div>
          <h3>MÀN HÌNH GAMING 240Hz 2K FAST-IPS</h3>
          <p>Tần số quét siêu tốc 240Hz 0.5ms — 1 Đổi 1 trong suốt 24 tháng</p>
          <div className="mid-banner-footer">
            <span className="mid-banner-price">Chỉ từ 2.990.000đ</span>
            <button className="mid-banner-cta">XEM NGAY &rsaquo;</button>
          </div>
        </div>
      </div>

      {/* 5. CATENOGY SECTION (TOP PC BÁN CHẠY / MÀN HÌNH) */}
      <div id="PC-van-phong">{""}</div>
      <div id="PC-do-hoa">{""}</div>
      <div>
        <Catenogy catenogies={catenogies} />
      </div>

      {/* 6. LAPTOP USER SECTION (GAMING, MỚI, VĂN PHÒNG) */}
      <div id="LapTop-new">{""}</div>
      <div id="LapTop-van-phong">{""}</div>
      <div id="LapTop-gia-uu-dai">{""}</div>
      <div>
        <LaptopUser laptopData={laptopUser} />
      </div>

      {/* 6.1 DẢI BANNER NGANG DÀI TUẦN LỄ XẢ KHO LAPTOP AI */}
      <div className="home-mid-strip-banner">
        <div
          className="strip-banner-box"
          onClick={() => navigate("/category/top-ban-chay")}
        >
          <div className="strip-content-left">
            <FaFire className="strip-fire-icon" />
            <div className="strip-texts">
              <h3>TUẦN LỄ XẢ KHO LAPTOP AI & LINH KIỆN MÁY TÍNH CHÍNH HÃNG</h3>
              <p>
                Giảm sốc tới 50% + Trợ giá Học Sinh - Sinh Viên đến 2.500.000đ +
                Tặng trọn bộ phụ kiện Gear 1.500.000đ
              </p>
            </div>
          </div>
          <button className="strip-btn-right">SĂN DEAL HỎA TỐC &rsaquo;</button>
        </div>
      </div>

      {/* 7. EVENT LIST SECTION (LINH KIỆN MÁY TÍNH) */}
      <div id="cpu-section">{""}</div>
      <div id="gpu-section">{""}</div>
      <div id="ram-section">{""}</div>
      <div id="ssd-section">{""}</div>
      <div id="card-section">{""}</div>
      <div id="mainboard-section">{""}</div>
      <div id="event-list">
        <EventList eventList={eventList} />
      </div>

      {/* 8. BANK PARTNERS & PAYMENT DISCOUNT PROMOTION */}
      <div className="bank-partner-section">
        <div className="bank-partner-container">
          <div className="bank-header">
            <BsCreditCard2Front className="bank-header-icon" />
            <h3>ƯU ĐÃI ĐỐI TÁC THANH TOÁN & TRẢ GÓP</h3>
          </div>
          <div className="bank-grid">
            <div className="bank-card">
              <div className="bank-logo-badge vib">VIB</div>
              <h4>Giảm thêm 1.000.000đ</h4>
              <p>Khi mở thẻ tín dụng Super Card hoặc thanh toán đơn từ 10tr</p>
            </div>
            <div className="bank-card">
              <div className="bank-logo-badge vpbank">VPBank</div>
              <h4>Giảm ngay 500.000đ</h4>
              <p>Cho hóa đơn mua Laptop, PC nguyên bộ từ 12.000.000đ</p>
            </div>
            <div className="bank-card">
              <div className="bank-logo-badge momo">MoMo</div>
              <h4>Nhập mã TECH200</h4>
              <p>Giảm ngay 200.000đ khi thanh toán qua ví MoMo QR</p>
            </div>
            <div className="bank-card">
              <div className="bank-logo-badge kredivo">Kredivo</div>
              <h4>Trả góp 0% duyệt 3 phút</h4>
              <p>Mua trước trả sau không cần chứng minh thu nhập</p>
            </div>
          </div>
        </div>
      </div>

      {/* 9. RETAIL SEO ARTICLE, TABLE & FAQ ACCORDION */}
      <SeoArticleSection categoryTitle="PC Gaming, Laptop & Linh Kiện Máy Tính" />

      {/* 10. SYSTEM SERVICES, SHOWROOMS & FOOTER */}
      <Sevicer />
      <ShowroomSystem />
      <div id="dich-vu">{""}</div>
      <div id="chi-tiet">{""}</div>
      <FooterUser footer={footer} />

      {/* 11. FLOATING LIVE ORDER TOAST (GÓC TRÁI DƯỚI) */}
      {liveToast.show && (
        <div className="home-live-order-toast">
          <FaFire className="toast-flame-icon" />
          <div className="toast-body">
            <span className="toast-user">🔥 {liveToast.user}</span>
            <span className="toast-product">Đã mua: {liveToast.product}</span>
            <span className="toast-time">{liveToast.time}</span>
          </div>
          <button
            className="toast-close-btn"
            onClick={() => setLiveToast({ ...liveToast, show: false })}
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
