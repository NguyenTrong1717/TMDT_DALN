import { useState, useEffect, useMemo } from "react";
import { toast, Toaster } from "sonner";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaFacebookF,
  FaPaperPlane,
} from "react-icons/fa";
import { IoChevronDown } from "react-icons/io5";
import "./ContactPage.css";

const API_URL = "http://localhost:3000";
const OPEN_HOUR = 8;
const CLOSE_HOUR = 21;

const CONTACT_PORTS = [
  {
    id: "hotline",
    label: "HOTLINE",
    icon: FaPhoneAlt,
    value: "0326.807.955",
    href: "tel:0326807955",
    desc: "Hỗ trợ kỹ thuật & đặt hàng trực tiếp",
    followsHours: true,
  },
  {
    id: "email",
    label: "EMAIL",
    icon: FaEnvelope,
    value: "trongtho123a@gmail.com.vn",
    href: "mailto:trongtho123a@gmail.com.vn",
    desc: "Phản hồi trong vòng 24 giờ làm việc",
    followsHours: false,
  },
  {
    id: "facebook",
    label: "FANPAGE",
    icon: FaFacebookF,
    value: "fb.com/yourshop",
    href: "https://www.facebook.com/nguyentronggggg?locale=vi_VN",
    desc: "Nhắn tin trực tiếp, phản hồi nhanh nhất",
    followsHours: false,
  },
];

const REQUEST_TYPES = [
  "Tư vấn chọn sản phẩm",
  "Bảo hành - Sửa chữa",
  "Khiếu nại đơn hàng",
  "Hỗ trợ trả góp",
  "Khác",
];

const Question = [
  {
    id: "Ques-01",
    q: "Thời gian phản hồi yêu cầu hỗ trợ là bao lâu?",
    a: "Trong giờ làm việc (8:00 - 21:00), đội kỹ thuật xử lý yêu cầu trong vòng 30 phút. Ngoài giờ, yêu cầu được xếp hàng ưu tiên và xử lý ngay đầu giờ sáng hôm sau.",
  },
  {
    id: "Ques-02",
    q: "Tôi có thể theo dõi trạng thái yêu cầu đã gửi ở đâu?",
    a: "Sau khi gửi, yêu cầu sẽ hiện trạng thái Chưa xử lý / Đang xử lý / Đã xử lý. Khi admin cập nhật sang Đã xử lý, hệ thống sẽ gửi thông báo trực tiếp vào tài khoản của bạn.",
  },
  {
    id: "Ques-03",
    q: "Sản phẩm mua tại cửa hàng có được bảo hành tận nơi?",
    a: "Có. Toàn bộ sản phẩm đủ điều kiện bảo hành được hỗ trợ tận nhà trong nội thành, không phát sinh phí đi lại trong thời gian bảo hành.",
  },
  {
    id: "Ques-04",
    q: "Tôi chưa có tài khoản, gửi yêu cầu có được không?",
    a: "Được. Bạn vẫn có thể gửi yêu cầu bằng thông tin liên hệ bên dưới. Tuy nhiên, đăng nhập trước sẽ giúp bạn nhận thông báo cập nhật trạng thái ngay trong hệ thống.",
  },
];

const EMPTY_FORM = { fullName: "", email: "", phone: "", message: "" };

const ContactPage = () => {
  const [now, setNow] = useState(new Date());
  const [category, setCategory] = useState(REQUEST_TYPES[0]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [openQues, setOpenQues] = useState(Question[0].id);

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

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
    if (!form.fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (!form.email.trim()) return "Vui lòng nhập email.";
    if (!form.phone.trim()) return "Vui lòng nhập số điện thoại.";
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
      const res = await fetch(`${API_URL}/serviceRequests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: category,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          message: form.message,
          userId: currentUser?.id || null,
          status: "pending",
          createdAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Gửi yêu cầu thất bại");

      toast.success(
        `Đã gửi yêu cầu [${category}] thành công! Chúng tôi sẽ liên hệ lại sớm nhất.`,
      );
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cp-page">
      <section className="cp-hero">
        <div className="cp-hero__grid" aria-hidden="true" />
        <div className="cp-hero__inner">
          <h1 className="cp-hero__title">LIÊN HỆ VỚI CHÚNG TÔI</h1>
          <p className="cp-hero__subtitle">
            Chọn một cổng kết nối bên dưới, hoặc gửi yêu cầu để đội ngũ kỹ thuật
            xử lý trực tiếp.
          </p>
          <div className={`cp-status ${isOpen ? "is-open" : "is-closed"}`}>
            <span className="cp-status__dot" />
            <span className="cp-status__text">
              {isOpen ? "ĐANG HOẠT ĐỘNG" : "NGOÀI GIỜ LÀM VIỆC"}
            </span>
            <span className="cp-status__hours">08:00 – 21:00 hằng ngày</span>
          </div>
        </div>
      </section>

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
              <div className="cp-port__pins" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
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

      <section className="cp-main">
        <form className="cp-form" onSubmit={handleSubmit}>
          <span className="cp-eyebrow"> GỬI YÊU CẦU</span>
          <h2 className="cp-section-title">Tạo yêu cầu hỗ trợ</h2>

          <label className="cp-field">
            Các Trường Hợp Thường Gặp
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="cp-field">
            Họ và tên *
            <input
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </label>

          <div className="cp-field-row">
            <label className="cp-field">
              Email *
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="ban@gmail.com"
              />
            </label>
            <label className="cp-field">
              Số điện thoại *
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="09xx xxx xxx"
              />
            </label>
          </div>

          <label className="cp-field">
            Nội dung
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="Mô tả chi tiết vấn đề bạn cần hỗ trợ..."
            />
          </label>

          <button className="cp-submit" type="submit" disabled={submitting}>
            <FaPaperPlane />
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>

        <div className="cp-side">
          <span className="cp-eyebrow">VỊ TRÍ</span>
          <h2 className="cp-section-title">Cửa hàng trực tiếp</h2>
          <div className="cp-map">
            <iframe
              title="store-location"
              src="https://maps.google.com/maps?q=Ha%20Noi&t=&https://www.google.com/maps?rlz=1C1CHZN_viVN1100VN1100&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIKCAEQABiABBi0BzIKCAIQABiABBi0BzIKCAMQABiABBi0BzIKCAQQABiABBi0BzIHCAUQABiABDIKCAYQABiABBi0BzIGCAcQRRg90gEIMzMyOWowajeoAgCwAgA&um=1&ie=UTF-8&fb=1&gl=vn&sa=X&geocode=KeNMOf_vUjQxMWTkWzLUORo5&daddr=P.+Nguy%E1%BB%85n+Tr%C3%A1c,+D%C6%B0%C6%A1ng+N%E1%BB%99i,+H%C3%A0+N%E1%BB%99iz=13&ie=UTF8&iwloc=&output=embed"
              loading="lazy"
            />
          </div>
          <ul className="cp-side__list">
            <li>
              <strong>Địa chỉ:</strong> Hà Đông - Hà Nội
            </li>
            <li>
              <strong>Giờ mở cửa:</strong> 08:00 – 21:00 (tất cả các ngày)
            </li>
            <li>
              <strong>Hotline:</strong>{" "}
              <a href="tel:0326807955">0326.807.955</a>
            </li>
          </ul>
        </div>
      </section>

      <section className="cp-faq">
        <span className="cp-eyebrow">XỬ LÝ SỰ CỐ</span>
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
                  <IoChevronDown className="cp-faq__chevron" />
                </button>
                {isOpenItem && <p className="cp-faq__answer">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <Toaster position="top-right" richColors />
    </div>
  );
};

export default ContactPage;
