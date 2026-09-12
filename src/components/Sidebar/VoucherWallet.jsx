import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import "./VoucherWallet.css";

const API_URL = "http://localhost:3000";

const formatVnd = (value) => value.toLocaleString("vi-VN") + "đ";

const voucherHeadline = (v) => {
  if (v.type === "amount") return formatVnd(v.value);
  return `${v.value}%`;
};

const isExpired = (v) => new Date(v.expiredAt) < new Date();
const isSoldOut = (v) => v.collectedCount >= v.maxCollect;

const VoucherWallet = () => {
  const [vouchers, setVouchers] = useState([]);
  const [collectedCodes, setCollectedCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectingCode, setCollectingCode] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  useEffect(() => {
    const init = async () => {
      try {
        const [voucherRes, userVoucherRes] = await Promise.all([
          fetch(`${API_URL}/vouchers`),
          currentUser
            ? fetch(`${API_URL}/userVouchers?userId=${currentUser.id}`)
            : Promise.resolve(null),
        ]);

        const voucherData = await voucherRes.json();
        setVouchers(voucherData);

        if (userVoucherRes) {
          const userVoucherData = await userVoucherRes.json();
          setCollectedCodes(userVoucherData.map((uv) => uv.voucherCode));
        }
      } catch (err) {
        console.error(err);
        toast.error("Không tải được danh sách voucher.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentUser?.id]);

  const handleCollect = async (voucher) => {
    if (!currentUser) {
      toast.warning("Vui lòng đăng nhập để thu thập voucher.");
      return;
    }
    if (collectedCodes.includes(voucher.code)) return;
    if (isSoldOut(voucher) || isExpired(voucher)) return;

    setCollectingCode(voucher.code);
    try {
      const res = await fetch(`${API_URL}/userVouchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          voucherCode: voucher.code,
          collectedAt: new Date().toISOString(),
          used: false,
        }),
      });
      if (!res.ok) throw new Error("Thu thập thất bại");

      // Cập nhật số lượt đã thu thập trên chính voucher
      await fetch(`${API_URL}/vouchers/${voucher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectedCount: voucher.collectedCount + 1 }),
      });

      setCollectedCodes((prev) => [...prev, voucher.code]);
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === voucher.id
            ? { ...v, collectedCount: v.collectedCount + 1 }
            : v,
        ),
      );
      toast.success(`Đã thu thập mã ${voucher.code}!`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể thu thập voucher, thử lại sau.");
    } finally {
      setCollectingCode(null);
    }
  };

  const renderButton = (voucher) => {
    const collected = collectedCodes.includes(voucher.code);
    const soldOut = isSoldOut(voucher);
    const expired = isExpired(voucher);

    if (expired) {
      return <span className="voucher-btn voucher-btn--disabled">Hết Hạn</span>;
    }
    if (collected) {
      return (
        <span className="voucher-btn voucher-btn--collected">✓ Đã Lưu</span>
      );
    }
    if (soldOut) {
      return (
        <span className="voucher-btn voucher-btn--disabled">Hết Lượt</span>
      );
    }
    return (
      <button
        className="voucher-btn voucher-btn--active"
        disabled={collectingCode === voucher.code}
        onClick={() => handleCollect(voucher)}
      >
        {collectingCode === voucher.code ? "..." : "Thu Thập"}
      </button>
    );
  };

  return (
    <>
      <Header />
      <div className="voucher-page">
        <div className="voucher-page__hero">
          <p className="voucher-page__eyebrow">Tri Ân Khách Hàng</p>
          <h1 className="voucher-page__title">Kho Voucher Của Bạn</h1>
          <p className="voucher-page__subtitle">
            Thu thập mã và áp dụng ngay ở bước thanh toán
          </p>
        </div>

        <div className="voucher-page__list">
          {loading && (
            <p className="voucher-page__state">Đang tải voucher...</p>
          )}

          {!loading &&
            vouchers.map((v) => {
              const disabledLook = isExpired(v) || isSoldOut(v);
              const remaining = Math.max(0, v.maxCollect - v.collectedCount);
              return (
                <div
                  key={v.id}
                  className={`voucher-card ${disabledLook ? "voucher-card--disabled" : ""}`}
                >
                  <div className="voucher-card__value">
                    <span className="voucher-card__number">
                      {voucherHeadline(v)}
                    </span>
                    <span className="voucher-card__value-label">
                      {v.type === "amount"
                        ? "GIẢM TRỰC TIẾP"
                        : `TỐI ĐA ${formatVnd(v.maxDiscount || 0)}`}
                    </span>
                  </div>

                  <div className="voucher-card__body">
                    <p className="voucher-card__desc">{v.des}</p>
                    <p className="voucher-card__meta">
                      Đơn tối thiểu {formatVnd(v.minOrder)} · HSD{" "}
                      {new Date(v.expiredAt).toLocaleDateString("vi-VN")}
                    </p>
                    {!disabledLook && remaining <= 20 && (
                      <p className="voucher-card__urgency">
                        Chỉ còn {remaining} lượt thu thập
                      </p>
                    )}
                  </div>

                  <div className="voucher-card__action">{renderButton(v)}</div>
                </div>
              );
            })}
        </div>
      </div>
      <FooterUser />
      <Toaster />
    </>
  );
};

export default VoucherWallet;
