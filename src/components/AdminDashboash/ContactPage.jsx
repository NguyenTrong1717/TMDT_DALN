import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast, Toaster } from "sonner";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaFacebookF,
  FaPaperPlane,
  FaUser,
  FaCommentDots,
  FaCheckCircle,
  FaShieldAlt,
  FaClock,
  FaHeadset,
  FaStore,
} from "react-icons/fa";
import { IoChevronDown } from "react-icons/io5";
import Header from "../Header/Header";
import FooterUser from "../Footer/FooterUser";
import "./ContactPage.css";
import { apiFetch, getCurrentUser, readJson } from "../../utils/api";

const OPEN_HOUR = 8;
const CLOSE_HOUR = 21;

const CONTACT_PORTS = [
  {
    id: "hotline",
    label: "HOTLINE TƯ VẤN",
    icon: FaPhoneAlt,
    value: "1900 8888",
    href: "tel:19008888",
    desc: "Tư vấn cấu hình & hỗ trợ kỹ thuật 24/7",
    followsHours: true,
  },
  {
    id: "email",
    label: "EMAIL HỖ TRỢ",
    icon: FaEnvelope,
    value: "support@hcore.vn",
    href: "mailto:support@hcore.vn",
    desc: "Phản hồi trong vòng 15 - 30 phút",
    followsHours: false,
  },
  {
    id: "facebook",
    label: "FANPAGE CHÍNH THỨC",
    icon: FaFacebookF,
    value: "fb.com/HCoreStoreOfficial",
    href: "https://www.facebook.com/nguyentronggggg?locale=vi_VN",
    desc: "Nhắn tin trực tiếp với nhân viên tư vấn",
    followsHours: false,
  },
];

const REQUEST_TYPES = [
  "Tư vấn cấu hình PC Gaming / Đồ họa",
  "Tư vấn chọn mua Laptop",
  "Hỗ trợ mua hàng trả góp 0%",
  "Bảo hành & Hỗ trợ kỹ thuật",
  "Tra cứu đơn hàng & Thanh toán",
  "Báo giá số lượng lớn / Doanh nghiệp",
  "Góp ý & Khiếu nại dịch vụ",
];

const Question = [
  {
    id: "Ques-01",
    q: "Thời gian phản hồi yêu cầu hỗ trợ là bao lâu?",
    a: "Trong giờ làm việc (8:00 - 21:00), đội ngũ kỹ thuật và chuyên viên HCore sẽ xử lý và liên hệ lại trong vòng 15 đến 30 phút. Ngoài giờ làm việc, yêu cầu được xếp hàng ưu tiên và phản hồi ngay đầu giờ sáng hôm sau.",
  },
  {
    id: "Ques-02",
    q: "Tôi có thể theo dõi trạng thái yêu cầu đã gửi ở đâu?",
    a: "Sau khi gửi, yêu cầu sẽ được ghi nhận vào hệ thống quản lý. Khi chuyên viên xử lý xong, bạn sẽ nhận được cuộc gọi/tin nhắn hỗ trợ trực tiếp và thông báo trạng thái trong tài khoản nếu đã đăng nhập.",
  },
  {
    id: "Ques-03",
    q: "Sản phẩm mua tại cửa hàng có được bảo hành tận nơi?",
    a: "Có. Toàn bộ máy tính PC và Laptop chính hãng tại HCore đều được hưởng chính sách bảo hành tận nơi nội thành Hà Nội, TP.HCM, Đà Nẵng hoàn toàn miễn phí trong suốt thời gian bảo hành.",
  },
  {
    id: "Ques-04",
    q: "Tôi chưa có tài khoản, gửi yêu cầu có được không?",
    a: "Hoàn toàn được. Bạn chỉ cần nhập đúng Số điện thoại và Email để nhân viên liên hệ lại. Đăng nhập tài khoản sẽ giúp bạn lưu lịch sử và tra cứu tiện lợi hơn.",
  },
];

const getCategoryPlaceholder = (cat) => {
  switch (cat) {
    case "Tư vấn cấu hình PC Gaming / Đồ họa":
      return "Nhập ngân sách dự kiến của bạn (VD: 15-20 triệu) và các tựa game hoặc phần mềm cần dùng (GTA V, Valorant, Premiere, AutoCAD...)...";
    case "Tư vấn chọn mua Laptop":
      return "Nêu rõ nhu cầu (học tập văn phòng, gaming, mỏng nhẹ pin trâu) và tầm giá bạn mong muốn...";
    case "Hỗ trợ mua hàng trả góp 0%":
      return "Nhập sản phẩm bạn muốn mua và hình thức trả góp dự kiến (Qua thẻ tín dụng hay CCCD)...";
    case "Bảo hành & Hỗ trợ kỹ thuật":
      return "Mô tả chi tiết tình trạng lỗi hoặc mã đơn hàng đã mua để kỹ thuật viên kiểm tra hỗ trợ...";
    case "Tra cứu đơn hàng & Thanh toán":
      return "Nhập mã đơn hàng hoặc số điện thoại đặt hàng để được hỗ trợ kiểm tra tiến độ...";
    default:
      return "Mô tả chi tiết yêu cầu hoặc câu hỏi của bạn để đội ngũ HCore Store hỗ trợ tốt nhất...";
  }
};

const ContactPage = () => {
  const [now, setNow] = useState(new Date());
  const [category, setCategory] = useState(REQUEST_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openQues, setOpenQues] = useState(Question[0].id);

  const currentUser = getCurrentUser();

  const [form, setForm] = useState(() => ({
    fullName: currentUser?.fullName || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    message: "",
  }));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isOpen = useMemo(() => {
    const h = now.getHours();
    return h >= OPEN_HOUR && h < CLOSE_HOUR;
  }, [now]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Vui lòng nhập họ và tên của bạn.";
    if (form.fullName.trim().length < 2) return "Họ và tên quá ngắn, vui lòng nhập đầy đủ.";
    
    if (!form.phone.trim()) return "Vui lòng nhập số điện thoại liên hệ.";
    const cleanPhone = form.phone.trim().replace(/\s/g, "");
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(cleanPhone)) return "Số điện thoại không hợp lệ (Ví dụ: 0912345678).";

    if (!form.email.trim()) return "Vui lòng nhập địa chỉ email.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) return "Địa chỉ email không đúng định dạng (Ví dụ: ban@gmail.com).";

    if (!form.message.trim()) return "Vui lòng nhập nội dung cần tư vấn hoặc hỗ trợ.";
    if (form.message.trim().length < 10) return "Nội dung cần tư vấn nên có ít nhất 10 ký tự để chuyên viên hỗ trợ chu đáo.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      if (!currentUser) throw new Error("Vui lòng đăng nhập trước khi gửi yêu cầu dịch vụ.");
      const res = await apiFetch(`/serviceRequests`, {
        method: "POST",
        body: JSON.stringify({
          service: category,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
          userId: currentUser?.id || null,
          status: "pending",
          createdAt: new Date().toISOString(),
        }),
      });

      await readJson(res, "Gửi yêu cầu thất bại");

      toast.success(
        `Đã tiếp nhận yêu cầu [${category}]! Chuyên viên HCore sẽ liên hệ bạn sớm nhất.`,
      );
      setSubmitted(true);
      setForm((prev) => ({ ...prev, message: "" }));
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi gửi yêu cầu, vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setSubmitted(false);
    setForm({
      fullName: currentUser?.fullName || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      message: "",
    });
  };

  return (
    <div className="cp-page-wrapper">
      <Header />

      {/* Breadcrumb điều hướng */}
      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <span className="demo-bread-current">Liên hệ với chúng tôi</span>
        </div>
      </div>

      <div className="cp-page">
        {/* HERO BANNER */}
        <section className="cp-hero">
          <div className="cp-hero__grid" aria-hidden="true" />
          <div className="cp-hero__inner">
            <h1 className="cp-hero__title">LIÊN HỆ VỚI CHÚNG TÔI</h1>
            <p className="cp-hero__subtitle">
              Đội ngũ chuyên viên HCore Store luôn sẵn sàng lắng nghe, tư vấn cấu hình
              và hỗ trợ kỹ thuật tận tâm cho bạn.
            </p>
            <div className={`cp-status ${isOpen ? "is-open" : "is-closed"}`}>
              <span className="cp-status__dot" />
              <span className="cp-status__text">
                {isOpen ? "ĐANG HOẠT ĐỘNG TRỰC TUYẾN" : "NGOÀI GIỜ LÀM VIỆC"}
              </span>
              <span className="cp-status__hours">08:00 – 21:00 hằng ngày</span>
            </div>
          </div>
        </section>

        {/* 3 CỔNG KẾT NỐI NHANH */}
        <section className="cp-ports">
          {CONTACT_PORTS.map((port) => {
            const Icon = port.icon;
            const active = port.followsHours ? isOpen : true;
            return (
              <a
                key={port.id}
                href={port.href}
                target={port.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="cp-port"
              >
                <div className="cp-port__head">
                  <Icon className="cp-port__icon" />
                  <span
                    className={`cp-port__led ${active ? "led-on" : "led-off"}`}
                  />
                </div>
                <span className="cp-port__label">{port.label}</span>
                <span className="cp-port__value">{port.value}</span>
                <span className="cp-port__desc">{port.desc}</span>
              </a>
            );
          })}
        </section>

        {/* KHUNG FORM CHÍNH & VỊ TRÍ CỬA HÀNG */}
        <section className="cp-main">
          {/* FORM GỬI YÊU CẦU ĐƯỢC TỐI ƯU HÓA */}
          <div className="cp-form-card">
            <span className="cp-eyebrow">
              <FaHeadset /> GỬI YÊU CẦU TƯ VẤN & HỖ TRỢ
            </span>
            <h2 className="cp-section-title">Điền thông tin liên hệ</h2>
            <p className="cp-form-subtitle">
              Điền các thông tin bên dưới để chuyên viên HCore phục vụ bạn nhanh chóng và chính xác nhất.
            </p>

            {submitted ? (
              <div className="cp-success-box">
                <FaCheckCircle className="cp-success-icon" />
                <h3>Gửi yêu cầu thành công!</h3>
                <p>
                  Cảm ơn bạn <strong>{form.fullName || "Quý khách"}</strong> đã liên hệ.
                  Yêu cầu <strong>[{category}]</strong> đã được chuyển trực tiếp đến bộ phận chuyên môn.
                  Chuyên viên sẽ liên hệ lại với bạn trong vòng <strong>15 - 30 phút</strong>.
                </p>
                <button
                  type="button"
                  className="cp-btn-another"
                  onClick={handleSendAnother}
                >
                  <FaPaperPlane /> Gửi thêm yêu cầu khác
                </button>
              </div>
            ) : (
              <form className="cp-form" onSubmit={handleSubmit}>
                {/* 1. Chọn nhu cầu */}
                <div className="cp-field">
                  <label htmlFor="cp-category">
                    Nhu cầu cần hỗ trợ <span className="req">*</span>
                  </label>
                  <select
                    id="cp-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {REQUEST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Họ và tên */}
                <div className="cp-field">
                  <label htmlFor="cp-name">
                    Họ và tên của bạn <span className="req">*</span>
                  </label>
                  <div className="cp-input-icon-wrap">
                    <FaUser className="cp-input-icon" />
                    <input
                      id="cp-name"
                      type="text"
                      value={form.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      required
                    />
                  </div>
                </div>

                {/* 3. SĐT và Email trên 2 cột */}
                <div className="cp-field-row">
                  <div className="cp-field">
                    <label htmlFor="cp-phone">
                      Số điện thoại liên hệ <span className="req">*</span>
                    </label>
                    <div className="cp-input-icon-wrap">
                      <FaPhoneAlt className="cp-input-icon" />
                      <input
                        id="cp-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="09xx xxx xxx"
                        required
                      />
                    </div>
                  </div>

                  <div className="cp-field">
                    <label htmlFor="cp-email">
                      Địa chỉ Email <span className="req">*</span>
                    </label>
                    <div className="cp-input-icon-wrap">
                      <FaEnvelope className="cp-input-icon" />
                      <input
                        id="cp-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="example@gmail.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Nội dung cần tư vấn */}
                <div className="cp-field">
                  <div className="cp-field-header-row">
                    <label htmlFor="cp-message">
                      Nội dung cần hỗ trợ chi tiết <span className="req">*</span>
                    </label>
                    <span className="cp-char-count">
                      {form.message.length} ký tự
                    </span>
                  </div>
                  <div className="cp-input-icon-wrap cp-textarea-wrap">
                    <FaCommentDots className="cp-input-icon cp-textarea-icon" />
                    <textarea
                      id="cp-message"
                      rows={4}
                      value={form.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      placeholder={getCategoryPlaceholder(category)}
                      required
                    />
                  </div>
                </div>

                {/* Cam kết dịch vụ */}
                <div className="cp-guarantee-note">
                  <FaShieldAlt className="cp-shield-icon" />
                  <span>
                    Thông tin của bạn được cam kết bảo mật 100%. Phản hồi nhanh trong vòng <strong>15 - 30 phút</strong>.
                  </span>
                </div>

                {/* Nút gửi yêu cầu */}
                <button
                  className="cp-submit-btn"
                  type="submit"
                  disabled={submitting}
                >
                  <FaPaperPlane />
                  {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu hỗ trợ ngay"}
                </button>
              </form>
            )}
          </div>

          {/* VỊ TRÍ SHOWROOM TRỰC TIẾP */}
          <div className="cp-side-card">
            <span className="cp-eyebrow">
              <FaStore /> VỊ TRÍ HỆ THỐNG
            </span>
            <h2 className="cp-section-title">Hệ thống Showroom HCore</h2>
            <div className="cp-map-box">
              <iframe
                title="store-location"
                src="https://maps.google.com/maps?q=Phenikaa%20University&t=&z=14&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
              />
            </div>
            <ul className="cp-side__list">
              <li>
                <strong>📍 Trụ sở chính:</strong> Trường Đại học Phenikaa, Đường Tố Hữu, P. Yên Nghĩa, Q. Hà Đông, Hà Nội
              </li>
              <li>
                <strong>📍 Showroom TP.HCM:</strong> 456 Lê Hồng Phong, Phường 1, Quận 10, TP. Hồ Chí Minh
              </li>
              <li>
                <strong>📍 Showroom Đà Nẵng:</strong> 78 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng
              </li>
              <li>
                <strong>⏰ Giờ làm việc:</strong> 08:00 – 21:00 (Mở cửa tất cả các ngày trong tuần)
              </li>
              <li>
                <strong>📞 Tổng đài hỗ trợ:</strong>{" "}
                <a href="tel:19008888" className="cp-hotline-highlight">1900 8888</a> (Miễn phí cước gọi)
              </li>
            </ul>
          </div>
        </section>

        {/* CÂU HỎI THƯỜNG GẶP (FAQ) */}
        <section className="cp-faq">
          <span className="cp-eyebrow">
            <FaClock /> GIẢI ĐÁP NHANH
          </span>
          <h2 className="cp-section-title">Câu hỏi thường gặp</h2>
          <div className="cp-faq__list">
            {Question.map((item) => {
              const isOpenItem = openQues === item.id;
              return (
                <div
                  key={item.id}
                  className={`cp-faq__item ${isOpenItem ? "is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="cp-faq__question"
                    onClick={() => setOpenQues(isOpenItem ? null : item.id)}
                  >
                    <span className="cp-faq__id">{item.id.toUpperCase()}</span>
                    <span className="cp-faq__q-text">{item.q}</span>
                    <IoChevronDown className={`cp-faq__chevron ${isOpenItem ? "rotate" : ""}`} />
                  </button>
                  {isOpenItem && <p className="cp-faq__answer">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <FooterUser />
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default ContactPage;
