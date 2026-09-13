import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header/Header";
import ProductCard from "../components/ProductCard/ProductCard";
import Sevicer from "../components/Sevicer/Sevicer";
import FooterUser from "../components/Footer/FooterUser";
import ShowroomSystem from "./ShowroomSystem";
import IntroVideoModal from "../components/IntroVideo/IntroVideoModal";
import "./Home.css";

// Icons
import {
  HiSparkles,
  HiOutlineLightningBolt,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineCreditCard,
  HiOutlineSupport,
  HiArrowRight,
  HiChevronRight,
  HiChevronLeft,
} from "react-icons/hi";
import {
  MdOutlineComputer,
  MdOutlineLaptopChromebook,
  MdOutlineMemory,
  MdDiscount,
  MdStorefront,
} from "react-icons/md";
import { BsCpu, BsGpuCard } from "react-icons/bs";
import { AiFillFire } from "react-icons/ai";

const HERO_SLIDES = [
  {
    id: 1,
    tag: "FLAGSHIP 2026",
    title: "SIÊU PC GAMING THẾ HỆ MỚI",
    subtitle: "Trang bị RTX 4090 24GB & Intel Core i9-14900K",
    desc: "Tản nhiệt nước Custom ARGB - Khung nhôm nguyên khối, hiệu năng dẫn đầu mọi chiến trường ảo.",
    discountBadge: "TIẾT KIỆM ĐẾN 6.500.000Đ",
    ctaText: "Khám Phá Cấu Hình",
    ctaLink: "/category/top-cuc-khung",
    image: "/images/pc.jpg",
    specs: ["RTX 4090 24GB", "i9 14900K", "RAM 64GB DDR5", "SSD 2TB Gen4"],
  },
  {
    id: 2,
    tag: "CREATOR & AI",
    title: "LAPTOP ĐỒ HỌA & TRÍ TUỆ NHÂN TẠO",
    subtitle: "Màn hình 4K OLED 120Hz chuẩn màu 100% DCI-P3",
    desc: "Sức mạnh xử lý render 3D siêu tốc, pin trâu cả ngày làm việc di động.",
    discountBadge: "TẶNG BALO GAMING + CHUỘT WIRELESS",
    ctaText: "Xem Danh Sách Laptop",
    ctaLink: "/san-sale",
    image: "/images/lap01.png",
    specs: ["OLED 4K 120Hz", "Core Ultra 9", "RTX Studio", "Pin 99Wh"],
  },
  {
    id: 3,
    tag: "COMBO BUILD PC",
    title: "LINH KIỆN CAO CẤP - GIÁ ĐẠI LÝ",
    subtitle: "Mainboard Z790, Card Màn Hình RTX, Nguồn 850W Gold",
    desc: "Bảo hành 1 đổi 1 tận nơi trong 36 tháng. Đội ngũ kỹ thuật viên tư vấn build dàn máy miễn phí.",
    discountBadge: "TRỢ GIÁ TRẢ GÓP 0%",
    ctaText: "Xem Linh Kiện",
    ctaLink: "/lien-he",
    image: "/images/gpu.png",
    specs: ["VGA RTX Series", "Nguồn Chuẩn Gold", "Bảo hành 36T", "Free Lắp Ráp"],
  },
];

const CATEGORY_PILLS = [
  { label: "PC Gaming Khủng", id: "pc-gaming-section", icon: MdOutlineComputer },
  { label: "Laptop Chuyên Nghiệp", id: "laptop-section", icon: MdOutlineLaptopChromebook },
  { label: "Card Đồ Họa & GPU", id: "hardware-section", icon: BsGpuCard },
  { label: "Vi Xử Lý CPU", id: "hardware-section", icon: BsCpu },
  { label: "Bộ Nhớ RAM & SSD", id: "hardware-section", icon: MdOutlineMemory },
  { label: "Săn Sale Giá Sốc", path: "/san-sale", icon: MdDiscount, isHot: true },
  { label: "Hệ Thống Showroom", id: "showroom-section", icon: MdStorefront },
];

const Home = () => {
  const navigate = useNavigate();

  const [laptopUser, setLaptopUser] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [products, setProducts] = useState([]);
  const [catenogies, setCatenogies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [footer, setFooter] = useState([]);

  // Active Hero slide
  const [currentSlide, setCurrentSlide] = useState(0);

  // Active Tab for PC Category
  const [activePcTab, setActivePcTab] = useState("all");

  // Countdown timer for Flash Sale
  const [timeLeft, setTimeLeft] = useState({
    hours: 7,
    minutes: 42,
    seconds: 19,
  });

  // Ticking countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto switch hero slides
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(slideTimer);
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

        if (productsRes.ok) setProducts(await productsRes.json());
        if (catenogiesRes.ok) setCatenogies(await catenogiesRes.json());
        if (eventListRes.ok) setEventList(await eventListRes.json());
        if (laptopRes.ok) setLaptopUser(await laptopRes.json());
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu thị trường:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePillClick = (pill) => {
    if (pill.path) {
      navigate(pill.path);
      return;
    }
    if (pill.id) {
      const el = document.getElementById(pill.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Filtered PC products based on tab
  const filteredCatenogies =
    activePcTab === "all"
      ? catenogies
      : catenogies.filter((item) => item.category === activePcTab);

  // Flash sale products (combine items marked with flashSale or high discount)
  const flashSaleItems = [
    ...laptopUser.filter((item) => item.flashSale || (item.discount && item.discount >= 20)),
    ...eventList.filter((item) => item.flashSale || (item.discount && item.discount >= 20)),
    ...catenogies.filter((item) => item.flashSale || (item.discount && item.discount >= 10)),
  ].slice(0, 4);

  const activeSlideData = HERO_SLIDES[currentSlide];

  return (
    <div className="home-market-root">
      <IntroVideoModal />
      <Header />

      {/* 1. TOP MARKETPLACE TRUST STRIP */}
      <section className="market-trust-strip">
        <div className="market-container trust-grid">
          <div className="trust-item">
            <span className="trust-icon-wrap"><HiOutlineShieldCheck /></span>
            <div>
              <strong>100% CHÍNH HÃNG</strong>
              <p>Cam kết đền 200% nếu hàng giả</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon-wrap"><HiOutlineTruck /></span>
            <div>
              <strong>GIAO NHANH 2 GIỜ</strong>
              <p>Miễn phí vận chuyển toàn quốc</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon-wrap"><HiOutlineCreditCard /></span>
            <div>
              <strong>TRẢ GÓP 0% LÃI SUẤT</strong>
              <p>Thủ tục 5 phút qua CCCD/Thẻ</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-icon-wrap"><HiOutlineSupport /></span>
            <div>
              <strong>BẢO HÀNH 36 THÁNG</strong>
              <p>Hỗ trợ kỹ thuật 1 đổi 1 tận nơi</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HERO SHOWCASE & PROMO STACK */}
      <section className="market-hero-section">
        <div className="market-container hero-grid">
          {/* Main Hero Slider */}
          <div className="hero-main-banner">
            <div className="hero-ambient-glow" />
            <div className="hero-content-col">
              <div className="hero-badge-tag">
                <HiSparkles className="hero-badge-icon" />
                <span>{activeSlideData.tag}</span>
                <span className="badge-chip">{activeSlideData.discountBadge}</span>
              </div>
              <h1 className="hero-headline">{activeSlideData.title}</h1>
              <p className="hero-subhead">{activeSlideData.subtitle}</p>
              <p className="hero-desc">{activeSlideData.desc}</p>

              {/* Specs Pills */}
              <div className="hero-specs-list">
                {activeSlideData.specs.map((spec, i) => (
                  <span key={i} className="spec-pill">{spec}</span>
                ))}
              </div>

              <div className="hero-actions-row">
                <button
                  className="hero-cta-btn primary"
                  onClick={() => navigate(activeSlideData.ctaLink)}
                >
                  <span>{activeSlideData.ctaText}</span>
                  <HiArrowRight />
                </button>
                <button
                  className="hero-cta-btn secondary"
                  onClick={() => navigate("/san-sale")}
                >
                  <HiOutlineLightningBolt />
                  <span>Săn Ưu Đãi Giờ Vàng</span>
                </button>
              </div>
            </div>

            <div className="hero-image-col">
              <img
                key={activeSlideData.id}
                src={activeSlideData.image}
                alt={activeSlideData.title}
                className="hero-featured-img"
                onError={(e) => {
                  e.target.src = "/images/pc.jpg";
                }}
              />
            </div>

            {/* Slider Navigation Dots */}
            <div className="hero-dots">
              {HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  className={`dot-btn ${idx === currentSlide ? "active" : ""}`}
                  onClick={() => setCurrentSlide(idx)}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Prev/Next arrows */}
            <button
              className="slider-arrow prev"
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
            >
              <HiChevronLeft />
            </button>
            <button
              className="slider-arrow next"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
            >
              <HiChevronRight />
            </button>
          </div>

          {/* Right Side Stack: Mini Promos */}
          <div className="hero-side-promos">
            <div className="side-promo-card voucher-card" onClick={() => navigate("/tri-an-khach-hang")}>
              <div className="promo-tag">VOUCHER ĐỘC QUYỀN</div>
              <h3>GIẢM NGAY 500.000Đ</h3>
              <p>Áp dụng cho đơn build PC & Laptop Gaming từ 15 Triệu</p>
              <div className="voucher-code-pill">
                <span>MÃ: <strong>HCORE500K</strong></span>
                <span className="copy-link">Lưu Mã →</span>
              </div>
            </div>

            <div className="side-promo-card tradein-card" onClick={() => navigate("/lien-he")}>
              <div className="promo-tag tradein">THU CŨ ĐỔI MỚI</div>
              <h3>TRỢ GIÁ LÊN ĐẾN 2.000.000Đ</h3>
              <p>Đổi card màn hình, CPU, Laptop đời cũ lấy siêu máy tính mới</p>
              <span className="explore-text">Định giá máy ngay →</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORY EXPLORER PILLS */}
      <section className="category-pills-bar">
        <div className="market-container">
          <div className="pills-scroll-track">
            {CATEGORY_PILLS.map((pill, idx) => {
              const Icon = pill.icon;
              return (
                <button
                  key={idx}
                  className={`category-pill-item ${pill.isHot ? "is-hot" : ""}`}
                  onClick={() => handlePillClick(pill)}
                >
                  <Icon className="pill-icon" />
                  <span>{pill.label}</span>
                  {pill.isHot && <span className="hot-sparkle">HOT</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. LIVE FLASH SALE COUNTDOWN SECTION */}
      <section className="flash-sale-live-section" id="flash-sale-section">
        <div className="market-container">
          <div className="flash-sale-header-box">
            <div className="flash-title-group">
              <span className="flame-badge"><AiFillFire /> FLASH SALE</span>
              <h2>GIỜ VÀNG GIÁ SỐC</h2>
              <span className="live-pulse-dot">Đang diễn ra</span>
            </div>

            <div className="countdown-timer-wrap">
              <span className="timer-label">Kết thúc sau:</span>
              <div className="timer-digits">
                <div className="digit-box">
                  <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                  <small>Giờ</small>
                </div>
                <span className="timer-colon">:</span>
                <div className="digit-box">
                  <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <small>Phút</small>
                </div>
                <span className="timer-colon">:</span>
                <div className="digit-box">
                  <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <small>Giây</small>
                </div>
              </div>
            </div>

            <Link to="/san-sale" className="view-all-flash-link">
              <span>Xem Tất Cả Khuyến Mãi</span>
              <HiArrowRight />
            </Link>
          </div>

          {/* Flash sale products grid */}
          <div className="flash-products-grid">
            {flashSaleItems.map((item) => (
              <div key={item.id} className="flash-item-container">
                <ProductCard product={item} />
                <div className="flash-deal-progress">
                  <div className="progress-info">
                    <span>Đã bán {item.soldPercent || 65}%</span>
                    <span>Còn {item.stockLeft || 5} suất</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${item.soldPercent || 65}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PC GAMING & ĐỒ HỌA SHOWCASE (With Tabs) */}
      <section className="marketplace-section" id="pc-gaming-section">
        <div className="market-container">
          <div className="section-head-bar">
            <div>
              <span className="sub-tag">CẤU HÌNH TUYỂN CHỌN</span>
              <h2 className="section-title">PC GAMING & ĐỒ HỌA CHUYÊN NGHIỆP</h2>
            </div>

            {/* Filter Tabs */}
            <div className="section-filter-tabs">
              <button
                className={`tab-btn ${activePcTab === "all" ? "active" : ""}`}
                onClick={() => setActivePcTab("all")}
              >
                Tất Cả Dàn Máy
              </button>
              <button
                className={`tab-btn ${activePcTab === "top-ban-chay" ? "active" : ""}`}
                onClick={() => setActivePcTab("top-ban-chay")}
              >
                Top Bán Chạy
              </button>
              <button
                className={`tab-btn ${activePcTab === "top-cuc-khung" ? "active" : ""}`}
                onClick={() => setActivePcTab("top-cuc-khung")}
              >
                Cực Khủng
              </button>
              <button
                className={`tab-btn ${activePcTab === "giai-nhiet" ? "active" : ""}`}
                onClick={() => setActivePcTab("giai-nhiet")}
              >
                Giải Nhiệt Nước
              </button>
            </div>
          </div>

          {/* Grid Products */}
          <div className="market-cards-grid">
            {filteredCatenogies.length > 0 ? (
              filteredCatenogies.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))
            ) : (
              products.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6. LAPTOP GAMING & VĂN PHÒNG SECTION */}
      <section className="marketplace-section dark-accent" id="laptop-section">
        <div className="market-container">
          <div className="section-head-bar">
            <div>
              <span className="sub-tag cyan">HIỆU NĂNG DI ĐỘNG</span>
              <h2 className="section-title">LAPTOP GAMING & MÁY TRẠM CAO CẤP</h2>
            </div>
            <Link to="/laptop/gaming" className="view-more-btn">
              <span>Xem Tất Cả Laptop</span>
              <HiArrowRight />
            </Link>
          </div>

          <div className="market-cards-grid">
            {laptopUser.slice(0, 8).map((laptop) => (
              <ProductCard key={laptop.id} product={laptop} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. HARDWARE & LINH KIỆN BUILD PC SECTION */}
      <section className="marketplace-section" id="hardware-section">
        <div className="market-container">
          <div className="section-head-bar">
            <div>
              <span className="sub-tag amber">LINH KIỆN CHÍNH HÃNG</span>
              <h2 className="section-title">CARD ĐỒ HỌA, CPU & BỘ NHỚ</h2>
            </div>
            <Link to="/component/all" className="view-more-btn">
              <span>Xem Thư Viện Linh Kiện</span>
              <HiArrowRight />
            </Link>
          </div>

          <div className="market-cards-grid">
            {eventList.slice(0, 8).map((comp) => (
              <ProductCard key={comp.id} product={comp} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. SERVICES & SHOWROOM */}
      <div id="showroom-section">
        <Sevicer />
        <ShowroomSystem />
      </div>

      {/* 9. FOOTER */}
      <FooterUser footer={footer} />
    </div>
  );
};

export default Home;
