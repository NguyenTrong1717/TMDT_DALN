import { useState } from "react";
import { toast } from "sonner";
import {
  FaBriefcase,
  FaFileInvoiceDollar,
  FaTools,
  FaServer,
  FaDesktop,
  FaShieldAlt,
  FaHandshake,
  FaPaperPlane,
  FaCheckCircle,
} from "react-icons/fa";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import "./BusinessCustomerPage.css";

const B2B_SERVICES = [
  {
    icon: FaDesktop,
    title: "PC & Laptop Văn Phòng Số Lượng Lớn",
    desc: "Cung cấp trọn gói dàn máy bộ Dell OptiPlex, HP ProDesk, ThinkPad, Asus ExpertBook chính hãng với độ bền cao và bảo mật tối đa.",
  },
  {
    icon: FaServer,
    title: "Máy Trạm Workstation & Server AI",
    desc: "Thiết kế cấu hình chuyên dụng cho Kiến trúc sư, Studio Render 3D, dựng phim và máy chủ Machine Learning đào tạo mô hình cục bộ.",
  },
  {
    icon: FaTools,
    title: "Bảo Hành Tận Nơi (On-Site 2 - 4 Giờ)",
    desc: "Đội ngũ kỹ thuật viên HCore túc trực tại Hà Nội, TP.HCM và Đà Nẵng, hỗ trợ xử lý sự cố phần cứng ngay tại trụ sở công ty bạn.",
  },
  {
    icon: FaFileInvoiceDollar,
    title: "Hóa Đơn VAT & Hỗ Trợ Công Nợ 30 Ngày",
    desc: "Xuất hóa đơn điện tử VAT 100% hợp lệ trong ngày. Ký hợp đồng kinh tế và hỗ trợ chính sách công nợ linh hoạt từ 15 đến 30 ngày.",
  },
];

const DISCOUNT_TIERS = [
  { range: "5 - 10 Thiết bị", discount: "5% - 8%", perk: "Miễn phí lắp đặt tận nơi + Bộ phím chuột văn phòng" },
  { range: "11 - 30 Thiết bị", discount: "9% - 12%", perk: "Tặng gói bảo trì định kỳ 12 tháng + Cài đặt mạng nội bộ" },
  { range: "Trên 30 Thiết bị (Dự án)", discount: "Lên đến 15%", perk: "Giá thầu dự án đặc biệt + Hỗ trợ máy thay thế dự phòng" },
];

export default function BusinessCustomerPage() {
  const [companyName, setCompanyName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [projectDemand, setProjectDemand] = useState("");
  const [estimatedQuantity, setEstimatedQuantity] = useState("5-10");

  const handleSubmitQuote = (e) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPhone.trim()) {
      return toast.error("Vui lòng nhập tên công ty và số điện thoại liên hệ!");
    }
    toast.success(
      `Đã tiếp nhận yêu cầu báo giá từ ${companyName}! Giám đốc kinh doanh dự án B2B HCore Store sẽ gửi file báo giá chính thức qua email ${contactEmail || "của bạn"} trong vòng 30 phút.`
    );
    setCompanyName("");
    setTaxCode("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setProjectDemand("");
  };

  return (
    <div className="b2b-page">
      <Header />

      <main className="b2b-main">
        {/* HERO */}
        <section className="b2b-hero">
          <div className="b2b-container">
            <span className="b2b-badge">
              <FaBriefcase /> HCORE STORE FOR BUSINESS (B2B)
            </span>
            <h1>Giải Pháp Công Nghệ & Phần Cứng Cho Doanh Nghiệp</h1>
            <p className="b2b-sub">
              Đối tác cung ứng thiết bị phần cứng, máy trạm Workstation, máy văn phòng và hạ tầng mạng đáng tin cậy. Chiết khấu dự án độc quyền lên đến 15%, bảo hành tận nơi thần tốc.
            </p>
          </div>
        </section>

        {/* 4 DỊCH VỤ CỐT LÕI */}
        <section className="b2b-services-section">
          <div className="b2b-container">
            <div className="section-head text-center">
              <span className="section-tag"><FaHandshake /> GIẢI PHÁP TOÀN DIỆN</span>
              <h2>Nâng Tầm Hạ Tầng Số Cho Doanh Nghiệp</h2>
            </div>

            <div className="services-grid">
              {B2B_SERVICES.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="service-card">
                    <div className="service-icon-wrap">
                      <Icon />
                    </div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BẢNG CHÍNH SÁCH CHIẾT KHẤU & CÔNG NỢ */}
        <section className="b2b-pricing-section">
          <div className="b2b-container">
            <div className="section-head text-center">
              <span className="section-tag"><FaFileInvoiceDollar /> CHÍNH SÁCH GIÁ THẦU</span>
              <h2>Chính Sách Chiết Khấu Theo Quy Mô Đơn Hàng</h2>
              <p>Cam kết giá dự án cạnh tranh nhất thị trường, tối ưu hóa ngân sách đầu tư trang thiết bị</p>
            </div>

            <div className="tiers-grid">
              {DISCOUNT_TIERS.map((tier, idx) => (
                <div key={idx} className="tier-card">
                  <span className="tier-range">{tier.range}</span>
                  <div className="tier-discount">Chiết khấu {tier.discount}</div>
                  <div className="tier-perk">
                    <FaCheckCircle className="tier-icon" /> {tier.perk}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FORM BÁO GIÁ DỰ ÁN NHANH */}
        <section className="b2b-form-section">
          <div className="b2b-container">
            <div className="b2b-form-card">
              <div className="form-head">
                <h2>Yêu Cầu Báo Giá Dự Án Doanh Nghiệp</h2>
                <p>Để lại thông tin dự án, chuyên viên giải pháp B2B sẽ phản hồi và gửi bảng báo giá chi tiết có dấu mộc công ty trong vòng 30 phút.</p>
              </div>

              <form onSubmit={handleSubmitQuote} className="b2b-quote-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Tên Doanh Nghiệp / Đơn Vị (*):</label>
                    <input
                      type="text"
                      placeholder="VD: Công ty Cổ phần Công nghệ ABC..."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Mã Số Thuế (MST):</label>
                    <input
                      type="text"
                      placeholder="VD: 0108889999"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Người Phụ Trách / Chức Vụ:</label>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Văn B - Trưởng phòng IT"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Số Điện Thoại Liên Hệ (*):</label>
                    <input
                      type="tel"
                      placeholder="Số điện thoại di động hoặc hotline"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Nhận File Báo Giá (*):</label>
                    <input
                      type="email"
                      placeholder="email@company.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Số Lượng Thiết Bị Dự Kiến:</label>
                    <select
                      value={estimatedQuantity}
                      onChange={(e) => setEstimatedQuantity(e.target.value)}
                    >
                      <option value="5-10">Từ 5 đến 10 thiết bị</option>
                      <option value="11-30">Từ 11 đến 30 thiết bị</option>
                      <option value="31-50">Từ 31 đến 50 thiết bị</option>
                      <option value="50+">Trên 50 thiết bị (Quy mô lớn)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Chi Tiết Nhu Cầu Cấu Hình / Thiết Bị:</label>
                  <textarea
                    rows={4}
                    placeholder="VD: Cần 15 bộ PC văn phòng Core i5, RAM 16GB, màn hình 24 inch 100Hz và 2 máy trạm đồ họa RTX 4070..."
                    value={projectDemand}
                    onChange={(e) => setProjectDemand(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-submit-b2b">
                  <FaPaperPlane /> Gửi Yêu Cầu Báo Giá Doanh Nghiệp
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* CAM KẾT CHẤT LƯỢNG */}
        <section className="b2b-guarantee-section">
          <div className="b2b-container">
            <div className="guarantees-row">
              <div className="g-item">
                <FaShieldAlt className="g-icon" />
                <div>
                  <strong>100% Chính Hãng</strong>
                  <span>Hàng đầy đủ CO/CQ chứng nhận xuất xứ</span>
                </div>
              </div>
              <div className="g-item">
                <FaFileInvoiceDollar className="g-icon" />
                <div>
                  <strong>VAT Đầy Đủ</strong>
                  <span>Xuất hóa đơn điện tử ngay trong ngày</span>
                </div>
              </div>
              <div className="g-item">
                <FaTools className="g-icon" />
                <div>
                  <strong>Bảo Trì 24/7</strong>
                  <span>Đội ngũ kỹ thuật túc trực xử lý tận nơi</span>
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
