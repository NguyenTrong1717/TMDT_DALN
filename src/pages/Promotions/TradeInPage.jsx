import { useState } from "react";
import { toast } from "sonner";
import {
  FaSyncAlt,
  FaCalculator,
  FaCheckCircle,
  FaShieldAlt,
  FaClock,
  FaLaptop,
  FaDesktop,
  FaApple,
  FaMobileAlt,
  FaPaperPlane,
  FaArrowRight,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import "./TradeInPage.css";

const DEVICE_TYPES = [
  { id: "laptop_gaming", name: "Laptop Gaming", icon: FaLaptop, baseEstimate: 14500000 },
  { id: "laptop_office", name: "Laptop Văn Phòng", icon: FaLaptop, baseEstimate: 8500000 },
  { id: "macbook", name: "Apple MacBook", icon: FaApple, baseEstimate: 16000000 },
  { id: "pc_desktop", name: "PC / Máy Tính Để Bàn", icon: FaDesktop, baseEstimate: 12000000 },
  { id: "smartphone", name: "Điện Thoại / Tablet", icon: FaMobileAlt, baseEstimate: 7500000 },
];

const BRANDS = ["ASUS ROG / TUF", "Acer Predator / Nitro", "Dell Alienware / Inspiron", "HP Omen / Victus", "Lenovo Legion / ThinkPad", "MSI Gaming", "Apple"];

const CONDITIONS = [
  {
    id: "grade_a",
    name: "Loại 1: Đẹp Như Mới (Like New 99%)",
    desc: "Ngoại hình không trầy xước, màn hình hoàn hảo, pin trên 85%, đầy đủ sạc zin",
    multiplier: 1.0,
    bonusTradeIn: 2500000,
  },
  {
    id: "grade_b",
    name: "Loại 2: Đã Qua Sử Dụng (95% - 98%)",
    desc: "Trầy xước răm nhẹ theo thời gian, màn hình sáng đẹp, mọi chức năng hoạt động hoàn hảo",
    multiplier: 0.82,
    bonusTradeIn: 2000000,
  },
  {
    id: "grade_c",
    name: "Loại 3: Cấn Viền Nhẹ (90% - 94%)",
    desc: "Vỏ có vết cấn nhẹ hoặc phím bóng, pin chai nhẹ nhưng phần cứng hoạt động ổn định",
    multiplier: 0.65,
    bonusTradeIn: 1500000,
  },
];

export default function TradeInPage() {
  const [selectedType, setSelectedType] = useState(DEVICE_TYPES[0]);
  const [selectedBrand, setSelectedBrand] = useState(BRANDS[0]);
  const [selectedCondition, setSelectedCondition] = useState(CONDITIONS[0]);
  const [deviceModel, setDeviceModel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("Hà Nội");

  // Tính toán giá trị ước tính
  const estimatedValue = Math.round(selectedType.baseEstimate * selectedCondition.multiplier);
  const tradeInBonus = selectedCondition.bonusTradeIn;
  const totalValue = estimatedValue + tradeInBonus;

  const handleSubmitConsult = (e) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      return toast.error("Vui lòng nhập số điện thoại liên hệ!");
    }
    toast.success(
      `Đã ghi nhận yêu cầu thu cũ ${selectedType.name}! Chuyên viên định giá HCore sẽ gọi cho bạn qua số ${customerPhone} trong vòng 5 phút.`
    );
    setCustomerName("");
    setCustomerPhone("");
    setDeviceModel("");
  };

  return (
    <div className="trade-in-page">
      <Header />

      <main className="trade-in-main">
        {/* 1. HERO BANNER SECTION */}
        <section className="trade-in-hero">
          <div className="trade-in-hero-container">
            <div className="trade-in-hero-grid">
              <div className="trade-in-hero-text">
                <span className="trade-in-hero-badge">
                  <FaSyncAlt /> CHƯƠNG TRÌNH ĐỘC QUYỀN HCORE STORE
                </span>
                <h1 className="trade-in-hero-title">
                  Thu Cũ Đổi Mới — Lên Đời Siêu Phẩm
                </h1>
                <p className="trade-in-hero-sub">
                  Trợ giá lên đến <strong className="highlight-price">3.000.000đ</strong> khi lên đời Laptop Gaming, PC hoặc MacBook tại HCore Store. Định giá minh bạch trong 60 giây, hỗ trợ sao lưu dữ liệu miễn phí.
                </p>

                <div className="trade-in-hero-perks">
                  <div className="perk-item">
                    <FaCheckCircle className="perk-icon" /> Không ép giá, định giá sát thị trường
                  </div>
                  <div className="perk-item">
                    <FaClock className="perk-icon" /> Kiểm tra & giải ngân chỉ 15 phút
                  </div>
                  <div className="perk-item">
                    <FaShieldAlt className="perk-icon" /> Thu mua cả máy xách tay & hết hạn bảo hành
                  </div>
                </div>

                <div className="trade-in-hero-cta">
                  <a href="#dinh-gia" className="btn-hero-calc">
                    <FaCalculator /> Định Giá Máy Cũ Của Bạn Ngay
                  </a>
                </div>
              </div>

              <div className="trade-in-hero-banner-visual">
                <div className="banner-img-frame">
                  <img
                    src="/images/banner_tradein_hero.jpg"
                    alt="Thu Cũ Đổi Mới HCore Store"
                    className="tradein-banner-graphic"
                  />
                  <div className="banner-floating-badge badge-top">
                    <span className="badge-spark">⚡</span> Trợ Giá Lên Đời: <strong>+3.000.000đ</strong>
                  </div>
                  <div className="banner-floating-badge badge-bottom">
                    <span className="badge-spark">🔄</span> 1 Đổi 1 Lên Đời Sau 15 Phút
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CÔNG CỤ TÍNH ĐỊNH GIÁ TRỰC TUYẾN */}
        <section id="dinh-gia" className="trade-in-calc-section">
          <div className="trade-in-container">
            <div className="section-head text-center">
              <span className="section-tag"><FaCalculator /> CÔNG CỤ ĐỊNH GIÁ TRỰC TUYẾN</span>
              <h2>Ước Tính Giá Trị Thu Máy & Trợ Giá Lên Đời</h2>
              <p>Chọn phân loại thiết bị hiện tại của bạn để nhận báo giá dự kiến ngay lập tức</p>
            </div>

            <div className="trade-in-calc-grid">
              {/* Cột trái: Tùy chọn thiết bị */}
              <div className="calc-controls-card">
                <div className="control-group">
                  <label className="control-label">1. Loại thiết bị của bạn:</label>
                  <div className="device-types-selector">
                    {DEVICE_TYPES.map((dt) => {
                      const Icon = dt.icon;
                      return (
                        <button
                          key={dt.id}
                          type="button"
                          className={`device-btn ${selectedType.id === dt.id ? "active" : ""}`}
                          onClick={() => setSelectedType(dt)}
                        >
                          <Icon className="device-icon" />
                          <span>{dt.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="control-group">
                  <label className="control-label">2. Hãng sản xuất:</label>
                  <select
                    className="calc-select"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                  >
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label className="control-label">3. Tên dòng máy chi tiết (Tùy chọn):</label>
                  <input
                    type="text"
                    className="calc-input"
                    placeholder="VD: Acer Nitro 5 Tiger, ASUS TUF A15 2023, MacBook Air M1..."
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">4. Tình trạng thực tế của máy:</label>
                  <div className="condition-radios">
                    {CONDITIONS.map((c) => (
                      <label
                        key={c.id}
                        className={`condition-option ${selectedCondition.id === c.id ? "active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="condition"
                          checked={selectedCondition.id === c.id}
                          onChange={() => setSelectedCondition(c)}
                        />
                        <div className="condition-info">
                          <strong>{c.name}</strong>
                          <span>{c.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cột phải: Bảng kết quả định giá */}
              <div className="calc-result-card">
                <div className="calc-result-header">
                  <h3>Bảng Định Giá Dự Kiến</h3>
                  <span className="live-badge">Ước tính tức thì</span>
                </div>

                <div className="result-breakdown">
                  <div className="result-row">
                    <span>Loại máy kiểm tra:</span>
                    <strong>{selectedType.name} ({selectedBrand})</strong>
                  </div>
                  <div className="result-row">
                    <span>Giá thu máy cũ dự kiến:</span>
                    <strong className="row-val-normal">
                      {estimatedValue.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                  <div className="result-row bonus-row">
                    <span>Trợ giá lên đời HCore VIP:</span>
                    <strong className="row-val-bonus">
                      + {tradeInBonus.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>

                  <div className="result-divider" />

                  <div className="total-trade-in-box">
                    <span className="total-label">Tổng giá trị được trừ khi lên đời:</span>
                    <div className="total-price">
                      {totalValue.toLocaleString("vi-VN")}đ
                    </div>
                    <span className="total-note">
                      * Đã bao gồm tiền thu máy cũ + trợ giá độc quyền từ HCore Store
                    </span>
                  </div>
                </div>

                {/* Form gửi yêu cầu tư vấn nhanh */}
                <form onSubmit={handleSubmitConsult} className="quick-consult-form">
                  <h4>Đăng Ký Giữ Mức Trợ Giá Này:</h4>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Họ và tên của bạn"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="form-control"
                    />
                    <input
                      type="tel"
                      placeholder="Số điện thoại (*)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <select
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="form-control"
                    >
                      <option value="Hà Nội">Khu vực: Hà Nội (Hỗ trợ tại nhà)</option>
                      <option value="TP. Hồ Chí Minh">Khu vực: TP. Hồ Chí Minh (Hỗ trợ tại nhà)</option>
                      <option value="Đà Nẵng">Khu vực: Đà Nẵng (Hỗ trợ tại nhà)</option>
                      <option value="Tỉnh thành khác">Tỉnh thành khác (Ship COD kiểm tra)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-submit-tradein">
                    <FaPaperPlane /> Đăng Ký Thu Cũ Nhận Trợ Giá Ngay
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* 3. QUY TRÌNH 4 BƯỚC ĐƠN GIẢN */}
        <section className="trade-in-steps-section">
          <div className="trade-in-container">
            <div className="section-head text-center">
              <span className="section-tag">TIỆN LỢI & NHANH CHÓNG</span>
              <h2>Quy Trình Thu Cũ Đổi Mới 4 Bước</h2>
            </div>

            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">01</div>
                <h4>Định Giá Online</h4>
                <p>Khách hàng sử dụng công cụ tính giá hoặc nhắn tin hotline/zalo để nhận giá dự kiến trong 1 phút.</p>
              </div>

              <div className="step-card">
                <div className="step-number">02</div>
                <h4>Ghé Cửa Hàng / Tận Nơi</h4>
                <p>Mang máy qua bất kỳ chi nhánh HCore Store hoặc yêu cầu nhân viên kỹ thuật tới thẩm định tại nhà.</p>
              </div>

              <div className="step-card">
                <div className="step-number">03</div>
                <h4>Kiểm Tra 10 Phút</h4>
                <p>Kỹ thuật viên test toàn diện phần cứng, màn hình, bàn phím và chốt mức giá cuối cùng minh bạch.</p>
              </div>

              <div className="step-card">
                <div className="step-number">04</div>
                <h4>Lên Đời / Nhận Tiền</h4>
                <p>Bù chênh lệch lấy máy mới ngay hoặc nhận chuyển khoản đủ 100% nếu bạn chỉ muốn bán máy cũ.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. GỢI Ý LÊN ĐỜI SIÊU PHẨM */}
        <section className="trade-in-cta-section">
          <div className="trade-in-container">
            <div className="cta-banner-box">
              <div className="cta-content">
                <h2>Bạn Đã Chọn Được Mẫu Máy Mới Ưng Ý Chưa?</h2>
                <p>Khám phá bộ sưu tập Laptop Gaming RTX 40 Series, PC Gaming thế hệ mới và Laptop văn phòng cao cấp đang có trợ giá tốt nhất tại HCore Store.</p>
                <div className="cta-actions">
                  <Link to="/laptop/laptop-gaming" className="btn-cta-primary">
                    Xem Laptop Gaming Lên Đời <FaArrowRight />
                  </Link>
                  <Link to="/category/top-ban-chay" className="btn-cta-secondary">
                    Xem PC Bán Chạy Nhất
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterUser />
    </div>
  );
}
