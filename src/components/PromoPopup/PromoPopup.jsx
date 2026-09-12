import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FaTimes, FaGift } from "react-icons/fa";
import "./PromoPopup.css";

const API_URL = "http://localhost:3000";

const formatVnd = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";

const isExpired = (v) => new Date(v.expiredAt) < new Date();
const isSoldOut = (v) => Number(v.collectedCount) >= Number(v.maxCollect);

const voucherHeadline = (v) =>
  v.type === "amount" ? `Giảm ${formatVnd(v.value)}` : `Giảm ${v.value}%`;

const PromoPopup = ({ triggerKey, delay = 900 }) => {
  const [voucher, setVoucher] = useState(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let showTimer;
    let cancelled = false;

    setVisible(false);
    setCopied(false);
    setVoucher(null);

    fetch(`${API_URL}/vouchers`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;

        // Ưu tiên các mã còn hạn & còn lượt, hết thì mới lấy đại toàn bộ danh sách
        const validOnes = data.filter((v) => !isExpired(v) && !isSoldOut(v));
        const pool = validOnes.length > 0 ? validOnes : data;
        const randomVoucher = pool[Math.floor(Math.random() * pool.length)];

        setVoucher(randomVoucher);
        showTimer = setTimeout(() => setVisible(true), delay);
      })
      .catch((err) => console.error("Lỗi tải voucher khuyến mãi:", err));

    return () => {
      cancelled = true;
      clearTimeout(showTimer);
    };
  }, [triggerKey, delay]);

  if (!voucher || !visible) return null;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(voucher.code)
      .then(() => {
        setCopied(true);
        toast.success(`Đã sao chép mã ${voucher.code}!`);
      })
      .catch(() => {
        toast.error("Không thể sao chép, vui lòng copy thủ công.");
      });
  };

  return (
    <div className="promo-popup-overlay" onClick={() => setVisible(false)}>
      <div className="promo-popup-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="promo-popup-close"
          onClick={() => setVisible(false)}
          aria-label="Đóng"
        >
          <FaTimes />
        </button>

        <div className="promo-popup-badge">
          <FaGift /> ƯU ĐÃI DÀNH RIÊNG CHO BẠN
        </div>

        <div className="promo-popup-value">{voucherHeadline(voucher)}</div>
        <p className="promo-popup-desc">{voucher.des}</p>

        <div className="promo-popup-meta">
          Đơn tối thiểu {formatVnd(voucher.minOrder)} · HSD{" "}
          {new Date(voucher.expiredAt).toLocaleDateString("vi-VN")}
        </div>

        <div className="promo-popup-code-row">
          <span className="promo-popup-code">{voucher.code}</span>
          <button className="promo-popup-copy-btn" onClick={handleCopy}>
            {copied ? "Đã chép ✓" : "Sao chép mã"}
          </button>
        </div>

        <Link
          to="/tri-an-khach-hang"
          className="promo-popup-more-link"
          onClick={() => setVisible(false)}
        >
          Xem thêm ưu đãi khác »
        </Link>
      </div>
    </div>
  );
};

export default PromoPopup;
