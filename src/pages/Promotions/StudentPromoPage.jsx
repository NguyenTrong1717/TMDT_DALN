import { useState } from "react";
import { toast } from "sonner";
import {
  FaGraduationCap,
  FaGift,
  FaLaptopCode,
  FaPalette,
  FaChartLine,
  FaCheckCircle,
  FaPaperPlane,
  FaArrowRight,
  FaCopy,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import "./StudentPromoPage.css";

const STUDENT_MAJORS = [
  {
    id: "it",
    name: "Công Nghệ Thông Tin & Lập Trình",
    icon: FaLaptopCode,
    specs: "Core i5/i7 gen 13+ • RAM 16GB–32GB • SSD 512GB NVMe",
    desc: "Tối ưu chạy Docker, Android Studio, Visual Studio, máy ảo VMware mượt mà không tràn RAM.",
    suggestedUrl: "/laptop/laptop-gaming",
  },
  {
    id: "design",
    name: "Thiết Kế Đồ Họa & Kiến Trúc",
    icon: FaPalette,
    specs: "Màn hình 100% sRGB / DCI-P3 • Card rời RTX 4050/4060",
    desc: "Chuẩn màu in ấn, dựng hình 3D Blender, render Premiere, Photoshop và AutoCAD siêu tốc.",
    suggestedUrl: "/laptop/laptop-do-hoa",
  },
  {
    id: "biz",
    name: "Kinh Tế, Marketing & Ngoại Ngữ",
    icon: FaChartLine,
    specs: "Trọng lượng < 1.3kg • Pin 8–10 tiếng • Màn hình chống chói",
    desc: "Mỏng nhẹ di chuyển linh hoạt cả ngày trên giảng đường, mở hàng chục tab Chrome và Excel mượt mà.",
    suggestedUrl: "/laptop/laptop",
  },
];

export default function StudentPromoPage() {
  const [studentName, setStudentName] = useState("");
  const [studentSchool, setStudentSchool] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentMajor, setStudentMajor] = useState("it");
  const [generatedCode, setGeneratedCode] = useState(null);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!studentPhone.trim() || !studentSchool.trim()) {
      return toast.error("Vui lòng điền đầy đủ trường học và số điện thoại!");
    }
    const code = `HCORE-STUDENT-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedCode(code);
    toast.success(`Đăng ký thành công! Mã ưu đãi của bạn là ${code}`);
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success("Đã sao chép mã ưu đãi!");
    }
  };

  return (
    <div className="student-promo-page">
      <Header />

      <main className="student-promo-main">
        {/* HERO */}
        <section className="student-hero">
          <div className="student-container">
            <span className="student-badge">
              <FaGraduationCap /> CHƯƠNG TRÌNH BACK TO SCHOOL 2026
            </span>
            <h1>Đặc Quyền Học Sinh — Sinh Viên: Giảm Thêm 500K</h1>
            <p className="student-sub">
              Tiếp sức mùa tựu trường! HCore Store dành riêng cho các bạn HSSV ưu đãi giảm giá trực tiếp đến 500.000đ cùng combo quà tặng công nghệ giá trị lên đến 1.500.000đ.
            </p>
          </div>
        </section>

        {/* 4 ĐẶC QUYỀN VÀNG */}
        <section className="student-perks-section">
          <div className="student-container">
            <div className="perks-grid">
              <div className="perk-box">
                <div className="perk-icon-circle">💰</div>
                <h3>Giảm Thêm 500.000đ</h3>
                <p>Khấu trừ trực tiếp trên giá bán khuyến mãi khi xuất trình thẻ học sinh, sinh viên hoặc giấy báo trúng tuyển.</p>
              </div>

              <div className="perk-box">
                <div className="perk-icon-circle"><FaGift /></div>
                <h3>Quà Tặng Combo Nhập Học</h3>
                <p>Tặng ngay Balo chống sốc HCore cao cấp, chuột quang Silent và bàn di chuột gaming 80×30cm.</p>
              </div>

              <div className="perk-box">
                <div className="perk-icon-circle">🛠️</div>
                <h3>Cài Đặt & Vệ Sinh Trọn Đời</h3>
                <p>Miễn phí cài đặt Windows bản quyền, bộ công cụ Office, AutoCAD, Adobe trọn đời và vệ sinh tra keo tản nhiệt định kỳ.</p>
              </div>

              <div className="perk-box">
                <div className="perk-icon-circle">💳</div>
                <h3>Trả Góp Sinh Viên 0%</h3>
                <p>Hỗ trợ thủ tục trả góp siêu nhanh chỉ cần CCCD từ 18 tuổi, trả trước từ 0đ không cần chứng minh thu nhập.</p>
              </div>
            </div>
          </div>
        </section>

        {/* GỢI Ý CẤU HÌNH THEO NGÀNH HỌC */}
        <section className="student-majors-section">
          <div className="student-container">
            <div className="section-head text-center">
              <span className="section-tag"><FaGraduationCap /> TƯ VẤN CHUYÊN SÂU</span>
              <h2>Chọn Máy Chuẩn Cấu Hình Theo Chuyên Ngành</h2>
              <p>Đừng để máy đơ lag làm gián đoạn đồ án và bài tập lớn của bạn</p>
            </div>

            <div className="majors-grid">
              {STUDENT_MAJORS.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.id} className="major-card">
                    <div className="major-icon-wrap">
                      <Icon />
                    </div>
                    <h3>{m.name}</h3>
                    <div className="major-specs-box">
                      <strong>Cấu hình khuyến nghị:</strong>
                      <span>{m.specs}</span>
                    </div>
                    <p>{m.desc}</p>
                    <Link to={m.suggestedUrl} className="btn-view-major">
                      Xem danh sách máy phù hợp <FaArrowRight />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FORM ĐĂNG KÝ NHẬN MÃ ƯU ĐÃI */}
        <section className="student-form-section">
          <div className="student-container">
            <div className="student-form-card">
              <div className="form-info-col">
                <h2>Đăng Ký Nhận Mã Ưu Đãi HSSV Ngay Hôm Nay</h2>
                <p>Điền thông tin trường học của bạn để nhận ngay mã giảm giá độc quyền 500.000đ áp dụng tại hệ thống HCore Store toàn quốc.</p>
                <ul className="form-bullet-points">
                  <li><FaCheckCircle /> Áp dụng cả mua Online và trực tiếp tại Showroom</li>
                  <li><FaCheckCircle /> Có thể cộng dồn với quà tặng và Flash Sale</li>
                  <li><FaCheckCircle /> Hiệu lực mã kéo dài trong 30 ngày</li>
                </ul>

                {generatedCode && (
                  <div className="voucher-result-banner">
                    <span>Mã ưu đãi của bạn:</span>
                    <div className="code-display" onClick={copyCode} title="Bấm để sao chép">
                      <code>{generatedCode}</code>
                      <FaCopy />
                    </div>
                    <small>Đã gửi mã qua SMS! Hãy xuất trình mã này khi thanh toán.</small>
                  </div>
                )}
              </div>

              <div className="form-input-col">
                <form onSubmit={handleRegister} className="student-reg-form">
                  <div className="reg-group">
                    <label>Họ và tên của bạn (*):</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="reg-group">
                    <label>Trường Đại Học / Cao Đẳng / THPT (*):</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: ĐH Bách Khoa, ĐH FPT, ĐH Kinh Tế..."
                      value={studentSchool}
                      onChange={(e) => setStudentSchool(e.target.value)}
                      required
                    />
                  </div>

                  <div className="reg-group">
                    <label>Số điện thoại nhận mã ưu đãi (*):</label>
                    <input
                      type="tel"
                      placeholder="Số điện thoại nhận tin nhắn Zalo / SMS"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="reg-group">
                    <label>Chuyên ngành theo học:</label>
                    <select
                      value={studentMajor}
                      onChange={(e) => setStudentMajor(e.target.value)}
                    >
                      <option value="it">Công nghệ thông tin / Lập trình</option>
                      <option value="design">Thiết kế đồ họa / Kiến trúc</option>
                      <option value="biz">Kinh tế / Ngoại ngữ / Marketing</option>
                      <option value="other">Khối ngành khác</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-get-student-code">
                    <FaPaperPlane /> Nhận Mã Giảm 500.000đ Ngay
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterUser />
    </div>
  );
}
