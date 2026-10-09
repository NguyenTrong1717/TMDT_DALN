import { useState } from "react";
import { toast } from "sonner";
import {
  FaCreditCard,
  FaIdCard,
  FaCalculator,
  FaCheckCircle,
  FaQuestionCircle,
  FaChevronDown,
  FaChevronUp,
  FaPaperPlane,
  FaUniversity,
} from "react-icons/fa";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import "./InstallmentPage.css";

const BANKS = [
  "Vietcombank", "Techcombank", "VPBank", "MB Bank", "ACB",
  "TPBank", "Sacombank", "VIB", "BIDV", "VietinBank", "HSBC", "Shinhan Bank"
];

const FAQS = [
  {
    q: "Mua trả góp qua thẻ tín dụng và CCCD khác nhau như thế nào?",
    a: "Trả góp qua thẻ tín dụng: 0% lãi suất, không cần xét duyệt hồ sơ, không gọi người thân, hạn mức thẻ sẽ bị khóa tạm thời tương ứng số tiền mua. Trả góp qua CCCD: Dành cho khách không có thẻ tín dụng, xét duyệt qua các đối tác tài chính (FE Credit, Home Credit, HD Saison) chỉ cần CCCD gắn chip từ 18 tuổi."
  },
  {
    q: "Tôi có bị giữ giấy tờ gốc khi trả góp qua CCCD không?",
    a: "Hoàn toàn KHÔNG! Nhân viên HCore Store chỉ chụp ảnh đối chiếu CCCD và trả lại ngay sau 2 phút, không giữ bất kỳ giấy tờ gốc nào của khách hàng."
  },
  {
    q: "Thời gian xét duyệt hồ sơ trả góp mất bao lâu?",
    a: "Với thẻ tín dụng: Thực hiện quẹt thẻ online hoặc tại quầy trong 60 giây. Với CCCD: Hệ thống thẩm định tự động qua VNeID trả kết quả phê duyệt trong 3 - 5 phút."
  },
  {
    q: "Tôi có thể tất toán hợp đồng trả góp trước hạn được không?",
    a: "Có! Bạn hoàn toàn có thể thanh toán dứt điểm khoản vay bất cứ lúc nào qua ứng dụng ngân hàng hoặc ví điện tử (MoMo, ZaloPay, Viettel Money)."
  }
];

export default function InstallmentPage() {
  const [method, setMethod] = useState("card"); // "card" | "idcard"
  const [productPrice, setProductPrice] = useState(25000000);
  const [prepayPercent, setPrepayPercent] = useState(30);
  const [termMonths, setTermMonths] = useState(6);
  const [selectedBank, setSelectedBank] = useState("Techcombank");
  const [openFaq, setOpenFaq] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productWish, setProductWish] = useState("");

  // Tính toán
  const prepayAmount = Math.round((productPrice * prepayPercent) / 100);
  const loanAmount = productPrice - prepayAmount;
  const interestRate = method === "card" ? 0 : 0.015; // 0% cho thẻ, 1.5%/tháng cho CCCD
  const totalInterest = loanAmount * interestRate * termMonths;
  const totalPay = loanAmount + totalInterest;
  const monthlyPay = Math.round(totalPay / termMonths);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!customerPhone.trim()) return toast.error("Vui lòng nhập số điện thoại!");
    toast.success(
      `Đã ghi nhận yêu cầu trả góp! Chuyên viên tài chính HCore Store sẽ liên hệ số ${customerPhone} để hướng dẫn hoàn tất thủ tục.`
    );
    setCustomerName("");
    setCustomerPhone("");
    setProductWish("");
  };

  return (
    <div className="installment-page">
      <Header />

      <main className="installment-main">
        {/* HERO */}
        <section className="installment-hero">
          <div className="installment-container">
            <span className="inst-badge">
              <FaCreditCard /> TÀI CHÍNH THÔNG MINH
            </span>
            <h1>Trả Góp 0% Lãi Suất — Duyệt Nhanh 3 Phút</h1>
            <p className="inst-sub">
              Sở hữu ngay Laptop Gaming, PC Flagship và linh kiện công nghệ đỉnh cao mà không cần trả hết một lần. Hỗ trợ trả góp qua thẻ tín dụng và CCCD không giữ giấy tờ.
            </p>
          </div>
        </section>

        {/* 2 PHƯƠNG THỨC TRẢ GÓP */}
        <section className="inst-methods-section">
          <div className="installment-container">
            <div className="methods-grid">
              <div
                className={`method-card ${method === "card" ? "active" : ""}`}
                onClick={() => setMethod("card")}
              >
                <div className="method-icon-wrap">
                  <FaCreditCard />
                </div>
                <h3>Qua Thẻ Tín Dụng (Credit Card)</h3>
                <span className="method-rate">0% Lãi Suất Thực Sự</span>
                <ul>
                  <li><FaCheckCircle /> Áp dụng hơn 25 ngân hàng liên kết toàn quốc</li>
                  <li><FaCheckCircle /> 0% phí hồ sơ, không cần chứng minh tài chính</li>
                  <li><FaCheckCircle /> Xét duyệt online 100% trong 60 giây</li>
                  <li><FaCheckCircle /> Kỳ hạn linh hoạt: 3, 6, 9, 12 tháng</li>
                </ul>
              </div>

              <div
                className={`method-card ${method === "idcard" ? "active" : ""}`}
                onClick={() => setMethod("idcard")}
              >
                <div className="method-icon-wrap">
                  <FaIdCard />
                </div>
                <h3>Qua CCCD / VNeID (Tài Chính)</h3>
                <span className="method-rate">Chỉ Cần CCCD Gắn Chip</span>
                <ul>
                  <li><FaCheckCircle /> Đối tác uy tín: FE Credit, Home Credit, HD Saison</li>
                  <li><FaCheckCircle /> Không giữ giấy tờ gốc, không gọi thẩm định người thân</li>
                  <li><FaCheckCircle /> Hỗ trợ sinh viên từ 18 tuổi trở lên</li>
                  <li><FaCheckCircle /> Trả trước chỉ từ 0đ đến 20% giá trị máy</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CÔNG CỤ TÍNH TRẢ GÓP TƯƠNG TÁC */}
        <section className="inst-calc-section">
          <div className="installment-container">
            <div className="inst-calc-card">
              <div className="inst-calc-header">
                <h2><FaCalculator /> Bảng Tính Chi Phí Trả Góp Dự Kiến</h2>
                <p>Điều chỉnh giá sản phẩm, số tiền trả trước và kỳ hạn vay để tính toán kế hoạch tài chính tối ưu nhất</p>
              </div>

              <div className="inst-calc-body">
                {/* Cột trái: Bộ điều khiển */}
                <div className="calc-inputs">
                  <div className="input-block">
                    <label>
                      Giá trị sản phẩm: <strong>{productPrice.toLocaleString("vi-VN")}đ</strong>
                    </label>
                    <input
                      type="range"
                      min={5000000}
                      max={80000000}
                      step={500000}
                      value={productPrice}
                      onChange={(e) => setProductPrice(Number(e.target.value))}
                      className="inst-range-slider"
                    />
                    <div className="range-hints">
                      <span>5 Triệu</span>
                      <span>40 Triệu</span>
                      <span>80 Triệu</span>
                    </div>
                  </div>

                  <div className="input-block">
                    <label>Tỷ lệ trả trước:</label>
                    <div className="pill-group">
                      {[0, 20, 30, 50].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`pill-btn ${prepayPercent === p ? "active" : ""}`}
                          onClick={() => setPrepayPercent(p)}
                        >
                          {p}% ({((productPrice * p) / 100).toLocaleString("vi-VN")}đ)
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="input-block">
                    <label>Kỳ hạn trả góp:</label>
                    <div className="pill-group">
                      {[3, 6, 9, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`pill-btn ${termMonths === m ? "active" : ""}`}
                          onClick={() => setTermMonths(m)}
                        >
                          {m} Tháng
                        </button>
                      ))}
                    </div>
                  </div>

                  {method === "card" && (
                    <div className="input-block">
                      <label>Ngân hàng phát hành thẻ tín dụng:</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="inst-select"
                      >
                        {BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Cột phải: Bảng kết quả */}
                <div className="calc-summary">
                  <div className="summary-title">BẢN TÍNH HÀNG THÁNG ({method === "card" ? "0% LÃI SUẤT" : "CCCD"})</div>
                  
                  <div className="summary-row">
                    <span>Giá trị máy:</span>
                    <strong>{productPrice.toLocaleString("vi-VN")}đ</strong>
                  </div>
                  <div className="summary-row">
                    <span>Số tiền trả trước ({prepayPercent}%):</span>
                    <strong>{prepayAmount.toLocaleString("vi-VN")}đ</strong>
                  </div>
                  <div className="summary-row">
                    <span>Số tiền cần vay/chuyển đổi:</span>
                    <strong>{loanAmount.toLocaleString("vi-VN")}đ</strong>
                  </div>
                  <div className="summary-row">
                    <span>Kỳ hạn trả góp:</span>
                    <strong>{termMonths} Tháng</strong>
                  </div>

                  <div className="monthly-highlight">
                    <span className="monthly-label">Số tiền góp mỗi tháng:</span>
                    <span className="monthly-val">{monthlyPay.toLocaleString("vi-VN")}đ / tháng</span>
                    <span className="monthly-sub">
                      {method === "card" ? "✓ 0% Lãi suất qua " + selectedBank : "✓ Ước tính gói vay tài chính tiêu chuẩn"}
                    </span>
                  </div>

                  {/* Form đăng ký nhanh */}
                  <form onSubmit={handleRegister} className="inst-quick-form">
                    <input
                      type="text"
                      placeholder="Tên sản phẩm muốn mua (VD: Acer Nitro 5, PC RTX 4060...)"
                      value={productWish}
                      onChange={(e) => setProductWish(e.target.value)}
                      className="inst-input"
                    />
                    <div className="form-duo">
                      <input
                        type="text"
                        placeholder="Họ và tên"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="inst-input"
                      />
                      <input
                        type="tel"
                        placeholder="Số điện thoại (*)"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="inst-input"
                        required
                      />
                    </div>
                    <button type="submit" className="inst-btn-submit">
                      <FaPaperPlane /> Đăng Ký Tư Vấn Trả Góp Miễn Phí
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ĐỐI TÁC NGÂN HÀNG & TÀI CHÍNH */}
        <section className="inst-partners-section">
          <div className="installment-container text-center">
            <h3><FaUniversity /> Hệ Thống Đối Tác Ngân Hàng & Tài Chính</h3>
            <p>Hỗ trợ thẻ tín dụng của tất cả các ngân hàng hàng đầu tại Việt Nam</p>
            <div className="banks-pills-list">
              {BANKS.map((b) => (
                <span key={b} className="bank-pill">{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section className="inst-faq-section">
          <div className="installment-container">
            <div className="section-head text-center">
              <span className="section-tag"><FaQuestionCircle /> HỎI ĐÁP THẮC MẮC</span>
              <h2>Câu Hỏi Thường Gặp Về Mua Trả Góp</h2>
            </div>

            <div className="faq-accordion">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className={`faq-item ${openFaq === idx ? "open" : ""}`}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <div className="faq-q">
                    <span>{faq.q}</span>
                    {openFaq === idx ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                  {openFaq === idx && <div className="faq-a">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterUser />
    </div>
  );
}
