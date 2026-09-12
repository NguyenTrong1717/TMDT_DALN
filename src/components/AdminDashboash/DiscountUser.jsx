import React, { useEffect, useState } from "react";
import "./DiscountUser.css";
import { toast } from "sonner";

const discountData = [
  {
    id: 1,
    code: "SUMMER20",
    percent: "20%",
    desc: "Giảm giá mùa hè cho toàn bộ đơn hàng",
  },
  {
    id: 2,
    code: "WELCOME10",
    percent: "10%",
    desc: "Ưu đãi cho khách hàng mới",
  },
  {
    id: 3,
    code: "FREESHIP",
    percent: "0đ",
    desc: "Miễn phí vận chuyển cho đơn trên 500k",
  },
];

export default function DiscountUser() {
  const [timeLeft, setTimeLeft] = useState(2 * 60 * 60 + 15 * 60 + 30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã sao chép mã ${code}`);
    } catch {
      toast.error("Không thể sao chép mã.");
    }
  };

  return (
    <div className="discount-page">
      <header className="discount-header">
        <h1>🎉 Ưu đãi đặc biệt</h1>
        <p>Chọn mã giảm giá phù hợp cho đơn hàng của bạn</p>
      </header>

      <section className="coupon-grid">
        {discountData.map((item) => (
          <div key={item.id} className="coupon-card">
            <div className="coupon-percent">{item.percent}</div>

            <div className="coupon-info">
              <h3>{item.code}</h3>
              <p>{item.desc}</p>
            </div>

            <button className="copy-btn" onClick={() => handleCopy(item.code)}>
              Sao chép
            </button>
          </div>
        ))}
      </section>

      <section className="flash-sale">
        <h2>⚡ Flash Sale kết thúc sau</h2>
        <div className="countdown">{formatTime(timeLeft)}</div>

        {timeLeft === 0 && (
          <p className="flash-ended">Flash Sale đã kết thúc!</p>
        )}
      </section>
    </div>
  );
}
