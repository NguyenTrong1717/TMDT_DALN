import { useState, useEffect } from "react";
import { toast } from "sonner";
import "./Sevicer.css";
import {
  MdLocalShipping,
  MdCached,
  MdSupportAgent,
  MdCreditCard,
} from "react-icons/md";

const Sevicer = () => {
  const [activeService, setActiveService] = useState(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });

  const services = [
    {
      icon: <MdLocalShipping />,
      title: "GIAO HÀNG MIỄN PHÍ",
      desc: "Cho mọi đơn hàng từ 2 triệu",
      placeholder: "Nhập địa chỉ nhận hàng của bạn...",
    },
    {
      icon: <MdCached />,
      title: "ĐỔI TRẢ DỄ DÀNG",
      desc: "Trong vòng 7 ngày đầu tiên nếu lỗi",
      placeholder: "Nhập tên sản phẩm cần đổi trả và lý do lỗi...",
    },
    {
      icon: <MdSupportAgent />,
      title: "HỖ TRỢ TRỰC TUYẾN 24/7",
      desc: "Giải đáp mọi thắc mắc của bạn",
      placeholder: "Nhập câu hỏi hoặc vấn đề bạn đang cần tư vấn gấp...",
    },
    {
      icon: <MdCreditCard />,
      title: "TRẢ GÓP LÃI SUẤT 0%",
      desc: "Thủ tục nhanh chóng trong 5 phút",
      placeholder:
        "Nhập sản phẩm bạn muốn trả góp (ví dụ: PC Gaming, Laptop...)",
    },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // gửi lên sever để xử lý thông tin
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3000/serviceRequests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: activeService,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          status: "pending", // pending | processing | done
          createdAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Gửi yêu cầu thất bại");

      toast.success(
        `Đã gửi yêu cầu [${activeService}] thành công! Chúng tôi sẽ liên hệ lại sớm nhất.`,
      );
      setFormData({ fullName: "", email: "", phone: "", message: "" });
      setActiveService(null);
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  useEffect(() => {
    if (activeService) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeService]);

  const currentService = services.find((s) => s.title === activeService);

  return (
    <section className="svc-wrapper">
      <div className="svc-grid">
        {services.map((ser, index) => (
          <div
            className="svc-card svc-card--active"
            key={index}
            onClick={() => setActiveService(ser.title)}
          >
            <div className="svc-card__icon">{ser.icon}</div>
            <div className="svc-card__body">
              <h5>{ser.title}</h5>
              <p>{ser.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {activeService && (
        <div className="dialog-backdrop" onClick={() => setActiveService(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <button
              className="dialog__close"
              onClick={() => setActiveService(null)}
            >
              &times;
            </button>

            <h3>{activeService}</h3>
            <p className="dialog__subtitle">
              Vui Lòng Nhập Thông Tin Của Bạn Để Được Ưu Đãi Nhé
            </p>

            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label>Họ và tên *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="field-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="example@gmail.com"
                />
              </div>

              <div className="field-group">
                <label>Số điện thoại *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="field-group">
                <label>Lời nhắn / Chi tiết yêu cầu</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder={
                    currentService?.placeholder || "Nhập lời nhắn của bạn..."
                  }
                ></textarea>
              </div>

              <button type="submit" className="dialog__submit">
                Xác nhận
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Sevicer;
