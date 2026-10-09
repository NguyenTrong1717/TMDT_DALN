import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";
import ProductGrid from "../components/ProductGrid/ProductGrid";
import Catenogy from "../components/Catenogy/Catenogy";
import EventList, { FALLBACK_COMPONENTS } from "../components/Events/EventList";
import LaptopUser from "../components/Newlaptop/LaptopUser";
import Sevicer from "../components/Sevicer/Sevicer";
import FooterUser from "../components/Footer/FooterUser";
import ShowroomSystem from "./ShowroomSystem";
import ProductCard from "../components/ProductCard/ProductCard";
import SeoArticleSection from "../components/SeoContent/SeoArticleSection";
import BannerCarousel from "../components/Banners/BannerCarousel";
import BannerGrid from "../components/Banners/BannerGrid";
import PromoTiles from "../components/Banners/PromoTiles";
import StripBanner from "../components/Banners/StripBanner";
import CategoryPromo from "../components/Banners/CategoryPromo";
import SkyscraperBanner from "../components/Banners/SkyscraperBanner";
import { getImageUrl } from "../utils/imageUtils";
import { API_URL } from "../utils/api";
import { toast } from "sonner";
import "./Home.css";

import {
  FaFire,
  FaCrown,
  FaChevronLeft,
  FaChevronRight,
  FaMedal,
  FaCheckCircle,
  FaStar,
  FaTicketAlt,
} from "react-icons/fa";
import { BsCreditCard2Front, BsArrowRightShort } from "react-icons/bs";

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
        const fetchEndpoint = async (endpoint, fallback = []) => {
          try {
            const base = API_URL || "http://127.0.0.1:3000";
            let res = await fetch(`${base}${endpoint}`).catch(() => null);
            if (!res || !res.ok) {
              res = await fetch(`http://localhost:3000${endpoint}`).catch(() => null);
            }
            if (res && res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) return data;
            }
          } catch (e) {
            console.warn(`[Home] Lỗi fetch ${endpoint}:`, e.message);
          }
          return fallback;
        };

        const [pData, cData, eData, lData] = await Promise.all([
          fetchEndpoint("/products", []),
          fetchEndpoint("/catenogies", []),
          fetchEndpoint("/eventList", FALLBACK_COMPONENTS),
          fetchEndpoint("/LaptopUser", []),
        ]);

        if (pData.length) setProducts(pData);
        if (cData.length) setCatenogies(cData);
        setEventList(eData.length ? eData : FALLBACK_COMPONENTS);
        if (lData.length) setLaptopUser(lData);
      } catch (err) {
        console.error(err);
        setEventList(FALLBACK_COMPONENTS);
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

  // Flash sale products (take 8 featured items for horizontal slider)
  const flashSaleItems = useMemo(() => {
    const list = [];
    if (catenogies && catenogies.length > 0) {
      list.push(...catenogies.map((i) => ({ ...i, fromTable: "catenogies" })));
    }
    if (products && products.length > 0) {
      list.push(...products.map((i) => ({ ...i, fromTable: "products" })));
    }
    return list.slice(0, 8);
  }, [catenogies, products]);

  // Spotlight Deal (Cột trái nổi bật của ngày)
  const spotlightItem = useMemo(() => {
    if (products && products.length > 0) {
      return (
        products.find((p) => p.price > 20000000) || products[0]
      );
    }
    return null;
  }, [products]);

  // 4 items bên phải của khối Spotlight
  const sideDeals = useMemo(() => {
    if (products && products.length > 1) {
      return products.slice(1, 5);
    }
    return [];
  }, [products]);

  // Leaderboard Top 3 (Bục vinh quang 3 sản phẩm bán chạy nhất)
  const topLeaderboard = useMemo(() => {
    if (!products || products.length < 3) return [];
    return [
      { ...products[1], rank: 2, sold: "1,248 đã bán", badge: "🥈 Top 2 Bán Chạy" },
      { ...products[0], rank: 1, sold: "2,510 đã bán", badge: "👑 Quán Quân Tuần", king: true },
      { ...products[2], rank: 3, sold: "986 đã bán", badge: "🥉 Top 3 Bán Chạy" },
    ];
  }, [products]);

  // Horizontal scroll controller for Flash Sale
  const flashSliderRef = useRef(null);
  const scrollFlash = (direction) => {
    if (flashSliderRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      flashSliderRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Quick claim voucher handler
  const [claimedVouchers, setClaimedVouchers] = useState({});
  const handleClaimVoucher = (code, value) => {
    setClaimedVouchers((prev) => ({ ...prev, [code]: true }));
    toast.success(`Đã lưu mã giảm ${value} [${code}] vào ví thành công!`);
  };

  return (
    <div className="home-page">
      <SkyscraperBanner />
      <Header />

      {/* 2. TOP HERO & SIDEBAR CATEGORIES */}
      <div className="layout">
        <Sidebar />
        
        {/* Banner Hero Section chuẩn CellphoneS: Cột trái Banner Carousel lớn + Cột phải 3 Banner Grid */}
        <div className="home-hero-banners-grid">
          <div className="hero-main-carousel-col">
            <BannerCarousel />
          </div>
          <div className="hero-side-banners-col">
            <BannerGrid />
          </div>
        </div>

        {/* 2.1 HÀNG 6 Ô LỐI TẮT KHUYẾN MÃI (PROMO TILES) */}
        <PromoTiles />
      </div>

      {/* 3. FLASH SALE COUNTDOWN SECTION (LAYOUT BĂNG CHUYỀN SLIDER NGANG ĐỘC ĐÁO) */}
      <div className="flash-sale-section">
        <div className="flash-sale-container">
          <div className="flash-sale-header">
            <div className="flash-sale-title-group">
              <div className="flash-flame-wrapper">
                <FaFire className="flash-flame-icon animated-flame" />
              </div>
              <div className="flash-title-texts">
                <h2 className="flash-sale-title">GIỜ VÀNG FLASH SALE</h2>
                <span className="flash-sub-title">Săn deal giá sốc — Số lượng có hạn</span>
              </div>
              <div className="flash-countdown-box">
                <span className="timer-badge">KẾT THÚC TRONG</span>
                <span className="timer-unit">{String(timeLeft.hours).padStart(2, "0")}</span>
                <span className="timer-colon">:</span>
                <span className="timer-unit">{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="timer-colon">:</span>
                <span className="timer-unit">{String(timeLeft.seconds).padStart(2, "0")}</span>
              </div>
            </div>

            <div className="flash-header-actions">
              <div className="flash-nav-arrows">
                <button
                  className="flash-arrow-btn"
                  onClick={() => scrollFlash("left")}
                  title="Xem trước"
                >
                  <FaChevronLeft />
                </button>
                <button
                  className="flash-arrow-btn"
                  onClick={() => scrollFlash("right")}
                  title="Xem tiếp"
                >
                  <FaChevronRight />
                </button>
              </div>
              <button
                className="flash-sale-view-all"
                onClick={() => navigate("/san-sale")}
              >
                Xem tất cả ({flashSaleItems.length}+) &rsaquo;
              </button>
            </div>
          </div>

          {/* Slider cuộn ngang mượt mà */}
          <div className="flash-sale-slider" ref={flashSliderRef}>
            {flashSaleItems.map((item, index) => (
              <div key={item.id || index} className="flash-sale-slider-card">
                <div className="flash-sale-card-wrapper">
                  <ProductCard
                    product={item}
                    targetUrl={item.fromTable === "catenogies" ? `/product/${item.id}` : `/page/${item.id}`}
                    fromTable={item.fromTable || "catenogies"}
                  />
                  <div className="flash-deal-progress">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(95, 65 + (index * 7) % 30)}%` }}
                    ></div>
                    <span className="progress-label">
                      🔥 Đã bán {65 + ((index * 7) % 30)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3.1 BỐ CỤC BẤT ĐỐI XỨNG: TÂM ĐIỂM DEAL CÔNG NGHỆ (1 Thẻ Lớn Hero + 4 Thẻ Phụ Bên Phải) */}
      {spotlightItem && (
        <div className="home-spotlight-section">
          <div className="home-spotlight-container">
            <div className="spotlight-header-row">
              <div className="spotlight-header-left">
                <span className="spotlight-kicker">✨ DEAL ĐỘC QUYỀN HÔM NAY</span>
                <h2 className="spotlight-main-heading">TÂM ĐIỂM CÔNG NGHỆ — TRỢ GIÁ ĐẾN 35%</h2>
              </div>
              <span className="spotlight-deadline">⚡ Áp dụng độc quyền trực tuyến cho 50 khách hàng đầu tiên</span>
            </div>

            <div className="spotlight-asymmetric-layout">
              {/* Thẻ Cột Trái: Spotlight Hero Card khổng lồ (38% width) */}
              <div
                className="spotlight-hero-card"
                onClick={() => navigate(`/page/${spotlightItem.id}`)}
              >
                <div className="spotlight-glass-badge">
                  <FaStar className="star-icon" /> BEST DEAL TRONG NGÀY
                </div>
                <div className="spotlight-img-box">
                  <img
                    src={getImageUrl(spotlightItem.image || spotlightItem.img)}
                    alt={spotlightItem.name}
                    className="spotlight-hero-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/pc3.png";
                    }}
                  />
                  <span className="spotlight-discount-ribbon">TIẾT KIỆM 4.5TR</span>
                </div>

                <div className="spotlight-hero-info">
                  <div className="spotlight-specs-chips">
                    <span>Core i7 / i9</span>
                    <span>RTX 40-Series</span>
                    <span>Ram 32GB RGB</span>
                  </div>
                  <h3 className="spotlight-hero-title">{spotlightItem.name}</h3>
                  <p className="spotlight-hero-desc">
                    Cấu hình tối ưu đồ họa dựng phim 4K, Render 3D và chiến max-setting mọi tựa game AAA.
                  </p>
                  
                  <div className="spotlight-price-row">
                    <div className="price-stack">
                      <span className="current-price">
                        {Number(spotlightItem.price || 0).toLocaleString("vi-VN")}đ
                      </span>
                      <span className="old-price">
                        {Number((spotlightItem.price || 0) * 1.25).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <button className="spotlight-action-btn">
                      SỞ HỮU NGAY <BsArrowRightShort />
                    </button>
                  </div>

                  <div className="spotlight-perks-list">
                    <div className="perk-item"><FaCheckCircle /> Tặng bàn phím cơ + Chuột Gaming RGB trị giá 1.450.000đ</div>
                    <div className="perk-item"><FaCheckCircle /> Bảo hành chính hãng tận nơi 36 tháng</div>
                  </div>
                </div>
              </div>

              {/* Lưới 4 Card Bên Phải (62% width) */}
              <div className="spotlight-side-grid">
                {sideDeals.map((item) => (
                  <div key={item.id} className="spotlight-mini-card">
                    <ProductCard
                      product={item}
                      targetUrl={`/page/${item.id}`}
                      fromTable="products"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.2 BẢNG XẾP HẠNG DOANH SỐ (Leaderboard Podium Top 1-2-3 Tuần Này) */}
      {topLeaderboard.length === 3 && (
        <div className="home-leaderboard-section">
          <div className="home-leaderboard-container">
            <div className="leaderboard-header">
              <div className="leaderboard-title-group">
                <FaCrown className="crown-header-icon" />
                <h2>BẢNG VÀNG DOANH SỐ — TOP SẢN PHẨM BÁN CHẠY NHẤT</h2>
              </div>
              <span className="leaderboard-sub">Thống kê tự động từ hơn 10.000+ đơn hàng đã giao thành công tuần qua</span>
            </div>

            <div className="leaderboard-podium">
              {/* Top 2 Bạc (Bên trái) */}
              <div
                className="podium-card rank-2"
                onClick={() => navigate(`/page/${topLeaderboard[0].id}`)}
              >
                <div className="podium-badge silver">
                  <FaMedal /> {topLeaderboard[0].badge}
                </div>
                <img
                  src={getImageUrl(topLeaderboard[0].image || topLeaderboard[0].img)}
                  alt={topLeaderboard[0].name}
                  className="podium-full-img"
                  onError={(e) => { e.target.src = "/images/pc.jpg"; }}
                />
                <div className="podium-info-overlay">
                  <h4 className="podium-name">{topLeaderboard[0].name}</h4>
                  <div className="podium-price">
                    {Number(topLeaderboard[0].price || 0).toLocaleString("vi-VN")}đ
                  </div>
                  <span className="podium-sold-count">🔥 {topLeaderboard[0].sold}</span>
                  <button className="podium-action-btn">XEM CHI TIẾT &rsaquo;</button>
                </div>
              </div>

              {/* Top 1 Vàng (Ở giữa cao nhất) */}
              <div
                className="podium-card rank-1-king"
                onClick={() => navigate(`/page/${topLeaderboard[1].id}`)}
              >
                <div className="king-crown-halo">👑</div>
                <div className="podium-badge gold">
                  <FaCrown /> {topLeaderboard[1].badge}
                </div>
                <img
                  src={getImageUrl(topLeaderboard[1].image || topLeaderboard[1].img)}
                  alt={topLeaderboard[1].name}
                  className="podium-full-img"
                  onError={(e) => { e.target.src = "/images/pc3.png"; }}
                />
                <div className="podium-info-overlay">
                  <span className="king-tag">ĐƯỢC YÊU THÍCH NHẤT</span>
                  <h4 className="podium-name">{topLeaderboard[1].name}</h4>
                  <div className="podium-price king-price">
                    {Number(topLeaderboard[1].price || 0).toLocaleString("vi-VN")}đ
                  </div>
                  <span className="podium-sold-count king-sold">🔥 {topLeaderboard[1].sold}</span>
                  <button className="podium-action-btn king-btn">XEM NGAY QUÁN QUÂN &rsaquo;</button>
                </div>
              </div>

              {/* Top 3 Đồng (Bên phải) */}
              <div
                className="podium-card rank-3"
                onClick={() => navigate(`/page/${topLeaderboard[2].id}`)}
              >
                <div className="podium-badge bronze">
                  <FaMedal /> {topLeaderboard[2].badge}
                </div>
                <img
                  src={getImageUrl(topLeaderboard[2].image || topLeaderboard[2].img)}
                  alt={topLeaderboard[2].name}
                  className="podium-full-img"
                  onError={(e) => { e.target.src = "/images/MT.jpg"; }}
                />
                <div className="podium-info-overlay">
                  <h4 className="podium-name">{topLeaderboard[2].name}</h4>
                  <div className="podium-price">
                    {Number(topLeaderboard[2].price || 0).toLocaleString("vi-VN")}đ
                  </div>
                  <span className="podium-sold-count">🔥 {topLeaderboard[2].sold}</span>
                  <button className="podium-action-btn">XEM CHI TIẾT &rsaquo;</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.3 SĂN VOUCHER TIỀN MẶT (Layout vé cào răng cưa nhận ngay) */}
      <div className="home-voucher-strip-section">
        <div className="home-voucher-strip-container">
          <div className="voucher-strip-header">
            <div className="voucher-title-left">
              <FaTicketAlt className="voucher-icon" />
              <h3>VÍ VOUCHER SIÊU TIẾT KIỆM — BẤM LƯU DÙNG NGAY KHI CHECKOUT</h3>
            </div>
            <button
              className="voucher-view-all-btn"
              onClick={() => navigate("/tri-an-khach-hang")}
            >
              Xem kho 20+ Voucher &rsaquo;
            </button>
          </div>

          <div className="voucher-tickets-grid">
            <div className="voucher-ticket-card">
              <div className="ticket-left">
                <span className="ticket-amount">500K</span>
                <span className="ticket-label">GIẢM NGAY</span>
              </div>
              <div className="ticket-divider"></div>
              <div className="ticket-right">
                <div className="ticket-info">
                  <strong>Đơn từ 10.000.000đ</strong>
                  <span>Áp dụng cho PC Gaming & Laptop</span>
                </div>
                <button
                  className={`ticket-claim-btn ${claimedVouchers["TECH500"] ? "claimed" : ""}`}
                  onClick={() => handleClaimVoucher("TECH500", "500.000đ")}
                  disabled={claimedVouchers["TECH500"]}
                >
                  {claimedVouchers["TECH500"] ? "Đã Lưu" : "LƯU MÃ"}
                </button>
              </div>
            </div>

            <div className="voucher-ticket-card">
              <div className="ticket-left color-cyan">
                <span className="ticket-amount">300K</span>
                <span className="ticket-label">GIẢM NGAY</span>
              </div>
              <div className="ticket-divider"></div>
              <div className="ticket-right">
                <div className="ticket-info">
                  <strong>Đơn từ 5.000.000đ</strong>
                  <span>Áp dụng toàn bộ Màn hình & VGA</span>
                </div>
                <button
                  className={`ticket-claim-btn ${claimedVouchers["SCREEN300"] ? "claimed" : ""}`}
                  onClick={() => handleClaimVoucher("SCREEN300", "300.000đ")}
                  disabled={claimedVouchers["SCREEN300"]}
                >
                  {claimedVouchers["SCREEN300"] ? "Đã Lưu" : "LƯU MÃ"}
                </button>
              </div>
            </div>

            <div className="voucher-ticket-card">
              <div className="ticket-left color-purple">
                <span className="ticket-amount">200K</span>
                <span className="ticket-label">VNPAY / MOMO</span>
              </div>
              <div className="ticket-divider"></div>
              <div className="ticket-right">
                <div className="ticket-info">
                  <strong>Thanh toán Online</strong>
                  <span>Quét mã QR qua cổng VNPAY/MoMo</span>
                </div>
                <button
                  className={`ticket-claim-btn ${claimedVouchers["ONLINE200"] ? "claimed" : ""}`}
                  onClick={() => handleClaimVoucher("ONLINE200", "200.000đ")}
                  disabled={claimedVouchers["ONLINE200"]}
                >
                  {claimedVouchers["ONLINE200"] ? "Đã Lưu" : "LƯU MÃ"}
                </button>
              </div>
            </div>

            <div className="voucher-ticket-card">
              <div className="ticket-left color-green">
                <span className="ticket-amount">FREESHIP</span>
                <span className="ticket-label">TOÀN QUỐC</span>
              </div>
              <div className="ticket-divider"></div>
              <div className="ticket-right">
                <div className="ticket-info">
                  <strong>Giao hỏa tốc 2H</strong>
                  <span>Miễn phí 100% chi phí vận chuyển</span>
                </div>
                <button
                  className={`ticket-claim-btn ${claimedVouchers["SHIP0D"] ? "claimed" : ""}`}
                  onClick={() => handleClaimVoucher("SHIP0D", "FreeShip")}
                  disabled={claimedVouchers["SHIP0D"]}
                >
                  {claimedVouchers["SHIP0D"] ? "Đã Lưu" : "LƯU MÃ"}
                </button>
              </div>
            </div>
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

          {/* Banner Khuyến Mãi Ngang Danh Mục PC */}
          <CategoryPromo category="pc" titleFallback="Dàn PC Gaming" />

          <main className="main-content">
            <div id="pc-gaming">
              <ProductGrid products={filteredProducts} />
            </div>
          </main>
        </div>
      </div>

      {/* 4.1 DẢI BANNER NGANG DÀI QUẢNG CÁO CHUẨN SÀN (~6:1) */}
      <StripBanner index={0} />

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
    </div>
  );
};

export default Home;
