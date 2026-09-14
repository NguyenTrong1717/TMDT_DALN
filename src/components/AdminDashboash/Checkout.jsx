import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast, Toaster } from "sonner";
import {
  FaUser,
  FaCreditCard,
  FaTag,
  FaChevronDown,
  FaCopy,
  FaCheck,
  FaQrcode,
  FaShieldAlt,
  FaTruck,
  FaHeadset,
} from "react-icons/fa";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import "./Checkout.css";

const API_URL = "http://localhost:3000";

const BANK_CONFIG = {
  bankId: "MB",
  bankName: "MB Bank (Ngân hàng Quân Đội)",
  accountNo: "0911108133",
  accountName: "NGUYEN TRONG",
};

const MOMO_CONFIG = {
  phone: "0911108133",
  accountName: "NGUYEN TRONG",
};

const cleanPrice = (priceInput) => {
  if (typeof priceInput === "number") return priceInput;
  if (!priceInput) return 0;
  const cleaned = priceInput
    .toString()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
};

const formatPrice = (amount) => amount.toLocaleString("vi-VN") + "₫";

const generateOrderCode = () => {
  const now = new Date();
  return `DH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
};

const PAYMENT_METHODS = [
  {
    value: "cod",
    label: "Thanh toán khi nhận hàng (COD)",
    desc: "Thanh toán bằng tiền mặt khi nhận kiện hàng",
    icon: "💵",
    iconBg: "#fef3c7",
  },
  {
    value: "bank",
    label: "Chuyển khoản VietQR (Ngân hàng)",
    desc: "Quét mã QR chuyển khoản tự động tức thì",
    icon: "🏦",
    iconBg: "#fee2e2",
  },
  {
    value: "momo",
    label: "Ví điện tử MoMo",
    desc: "Thanh toán qua app MoMo hoặc số điện thoại",
    icon: "📱",
    iconBg: "#fce7f3",
  },
];

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const buyNowItem = location.state?.buyNowItem;
  const couponWrapRef = useRef(null);

  const [orderCode] = useState(() => generateOrderCode());
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = (text, fieldName) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldName);
    toast.success(`Đã sao chép ${fieldName}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  // Chỉ chứa các voucher user đã "thu thập" ở trang Kho Voucher
  const [myVouchers, setMyVouchers] = useState([]);
  const [showVoucherList, setShowVoucherList] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    note: "",
    paymentMethod: "cod",
  });

  useEffect(() => {
    const init = async () => {
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setCustomerInfo((prev) => ({
        ...prev,
        fullName: currentUser.fullName || "",
        phone: currentUser.phone || "",
        email: currentUser.email || "",
        address: currentUser.address || "",
      }));

      // Lấy danh sách voucher mà user này đã thu thập ở trang Kho Voucher,
      // rồi join với bảng vouchers để có đầy đủ thông tin giảm giá
      try {
        const [userVoucherRes, voucherRes] = await Promise.all([
          fetch(`${API_URL}/userVouchers?userId=${currentUser.id}`),
          fetch(`${API_URL}/vouchers`),
        ]);
        const userVoucherData = await userVoucherRes.json();
        const voucherData = await voucherRes.json();
        const collectedCodes = userVoucherData.map((uv) => uv.voucherCode);
        setMyVouchers(
          voucherData.filter((v) => collectedCodes.includes(v.code)),
        );
      } catch (err) {
        console.error(err);
        // Không chặn checkout nếu tải voucher lỗi — chỉ là user không áp mã được
      }

      if (buyNowItem) {
        setCartItems([{ ...buyNowItem, quantity: buyNowItem.quantity || 1 }]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/cart`);
        const allCart = await res.json();
        const myCart = allCart.filter(
          (item) => String(item.userId) === String(currentUser.id),
        );

        if (myCart.length === 0) {
          toast.warning("Giỏ hàng đang trống!");
          navigate("/cart");
          return;
        }

        const itemsWithDetails = await Promise.all(
          myCart.map(async (item) => {
            const table = item.fromTable || "catenogies";
            const pRes = await fetch(`${API_URL}/${table}/${item.productId}`);
            const pData = pRes.ok ? await pRes.json() : {};
            // Giữ nguyên id gốc của cart item (item.id) trong field cartId
            // để tránh bị đè bởi id của sản phẩm khi merge object.
            return {
              ...pData,
              ...item,
              cartId: item.id,
              table,
            };
          }),
        );
        setCartItems(itemsWithDetails);
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải giỏ hàng.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [buyNowItem, navigate]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (couponWrapRef.current && !couponWrapRef.current.contains(e.target)) {
        setShowVoucherList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const subTotal = cartItems.reduce(
    (sum, item) => sum + cleanPrice(item.price) * item.quantity,
    0,
  );
  const shipping = subTotal > 500000 ? 0 : 30000;
  const totalAmount = Math.max(0, subTotal + shipping - discount);

  const applyVoucherObj = (foundVoucher) => {
    if (!foundVoucher) {
      toast.error(
        "Mã không hợp lệ hoặc bạn chưa thu thập mã này. Vào 'Kho Voucher' để lưu mã trước.",
      );
      return;
    }

    if (subTotal < foundVoucher.minOrder) {
      toast.error(
        `Đơn hàng cần tối thiểu ${formatPrice(foundVoucher.minOrder)} để dùng mã này.`,
      );
      return;
    }

    let discountAmount = 0;
    if (foundVoucher.type === "amount") {
      discountAmount = foundVoucher.value;
    } else if (foundVoucher.type === "percent") {
      discountAmount = (subTotal * foundVoucher.value) / 100;
      if (foundVoucher.maxDiscount) {
        discountAmount = Math.min(discountAmount, foundVoucher.maxDiscount);
      }
    }

    setDiscount(discountAmount);
    setAppliedVoucher(foundVoucher);
    setCouponCode(foundVoucher.code);
    setShowVoucherList(false);
    toast.success(
      `Đã áp dụng mã ${foundVoucher.code}! Giảm ${formatPrice(discountAmount)}`,
    );
  };

  const handleApplyCoupon = () => {
    const trimmedCode = couponCode.trim().toUpperCase();
    const foundVoucher = myVouchers.find((v) => v.code === trimmedCode);
    applyVoucherObj(foundVoucher);
  };

  const handleSelectVoucherFromList = (voucher) => {
    applyVoucherObj(voucher);
  };

  const handleRemoveCoupon = () => {
    setDiscount(0);
    setAppliedVoucher(null);
    setCouponCode("");
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    try {
      const formattedProducts = cartItems.map((item) => ({
        productId: item.productId,
        name: item.name || "Sản phẩm",
        image: item.image,
        quantity: item.quantity,
        unitPrice: cleanPrice(item.price),
        subtotal: cleanPrice(item.price) * item.quantity,
        fromTable: item.table,
      }));

      const newOrder = {
        orderCode,
        userId: currentUser.id,
        ...customerInfo,
        status: "pending",
        totalAmount,
        voucherCode: appliedVoucher?.code || null,
        discountAmount: discount,
        createdAt: new Date().toISOString(),
        products: formattedProducts,
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      if (!res.ok) throw new Error("Lỗi khi gửi đơn hàng");

      // Đánh dấu voucher đã dùng để không áp dụng lại lần sau
      if (appliedVoucher) {
        try {
          const uvRes = await fetch(
            `${API_URL}/userVouchers?userId=${currentUser.id}&voucherCode=${appliedVoucher.code}`,
          );
          const uvData = await uvRes.json();
          if (uvData[0]) {
            await fetch(`${API_URL}/userVouchers/${uvData[0].id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ used: true }),
            });
          }
        } catch (err) {
          console.error("Không cập nhật được trạng thái voucher:", err);
        }
      }

      // Xóa các item trong giỏ hàng thật (bảng /cart) sau khi đặt hàng thành công.
      // Chỉ áp dụng cho luồng checkout từ giỏ hàng, không áp dụng cho "Mua ngay".
      if (!buyNowItem) {
        const deleteResults = await Promise.all(
          cartItems.map(async (item) => {
            if (!item.cartId) return { ok: true };
            try {
              const delRes = await fetch(`${API_URL}/cart/${item.cartId}`, {
                method: "DELETE",
              });
              if (!delRes.ok) {
                console.error(
                  `Xóa cart item ${item.cartId} thất bại, status:`,
                  delRes.status,
                );
              }
              return { ok: delRes.ok, cartId: item.cartId };
            } catch (err) {
              console.error(`Lỗi khi xóa cart item ${item.cartId}:`, err);
              return { ok: false, cartId: item.cartId };
            }
          }),
        );

        const failedDeletes = deleteResults.filter((r) => !r.ok);
        if (failedDeletes.length > 0) {
          console.warn(
            "Một số item chưa xóa được khỏi giỏ hàng:",
            failedDeletes,
          );
        }

        window.dispatchEvent(new Event("cartUpdated"));
      }

      toast.success("Đặt hàng thành công!");
      setTimeout(() => navigate("/orders"), 1000);
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi đặt hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-box">Đang tải...</div>;

  return (
    <>
      <Header />
      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link to="/cart">
            <span>Giỏ hàng</span>
          </Link>
          <span className="demo-bread-current">Thanh toán</span>
        </div>
        <div className="container">
          <form className="checkout-wrapper" onSubmit={handleSubmitOrder}>
            <div className="checkout-left">
              <div className="checkout-card">
                <h3 className="checkout-section-title">
                  <FaUser /> <span>THÔNG TIN GIAO HÀNG</span>
                </h3>
                <div className="checkout-form">
                  <div className="checkout-group">
                    <label>Họ và tên *</label>
                    <input
                      required
                      placeholder="Nguyễn Văn A"
                      value={customerInfo.fullName}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          fullName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="checkout-row-2">
                    <div className="checkout-group">
                      <label>Số điện thoại *</label>
                      <input
                        required
                        placeholder="0912 345 678"
                        value={customerInfo.phone}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="checkout-group">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={customerInfo.email}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="checkout-group">
                    <label>Địa chỉ *</label>
                    <input
                      required
                      placeholder="Số nhà, đường..."
                      value={customerInfo.address}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="checkout-group">
                    <label>Ghi chú</label>
                    <textarea
                      rows={2}
                      value={customerInfo.note}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          note: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="checkout-card">
                <h3 className="checkout-section-title">
                  <FaCreditCard /> <span>PHƯƠNG THỨC THANH TOÁN</span>
                </h3>
                <div className="pay-methods">
                  {PAYMENT_METHODS.map((pm) => (
                    <label
                      key={pm.value}
                      className={`pay-opt ${customerInfo.paymentMethod === pm.value ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.value}
                        checked={customerInfo.paymentMethod === pm.value}
                        onChange={() =>
                          setCustomerInfo({
                            ...customerInfo,
                            paymentMethod: pm.value,
                          })
                        }
                      />
                      <div
                        className="pay-icon"
                        style={{ background: pm.iconBg }}
                      >
                        {pm.icon}
                      </div>
                      <div className="pay-label">
                        <strong>{pm.label}</strong>
                        <span>{pm.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* KHUNG THANH TOÁN VIETQR ĐỘNG */}
                {customerInfo.paymentMethod === "bank" && (
                  <div className="bank-transfer-box">
                    <div className="bank-box-header">
                      <div className="bank-header-title">
                        <FaQrcode className="bank-header-icon" />
                        <div>
                          <h4>Quét mã VietQR Chuyển khoản Tự Động</h4>
                          <p>Tương thích mọi ngân hàng & ứng dụng tài chính tại VN</p>
                        </div>
                      </div>
                      <span className="bank-fast-badge">Khuyên dùng</span>
                    </div>

                    <div className="bank-box-content">
                      <div className="bank-qr-wrapper">
                        <img
                          src={`https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?amount=${totalAmount}&addInfo=${orderCode}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`}
                          alt="VietQR Chuyển Khoản"
                          className="bank-qr-img"
                        />
                        <div className="bank-qr-hint">
                          <span>Quét bằng App Ngân Hàng bất kỳ</span>
                        </div>
                      </div>

                      <div className="bank-info-table">
                        <div className="bank-info-item">
                          <span className="info-label">Ngân hàng:</span>
                          <strong className="info-value">{BANK_CONFIG.bankName}</strong>
                        </div>

                        <div className="bank-info-item">
                          <span className="info-label">Số tài khoản:</span>
                          <div className="copyable-value">
                            <strong className="info-value-accent">{BANK_CONFIG.accountNo}</strong>
                            <button
                              type="button"
                              className="btn-copy"
                              onClick={() => handleCopy(BANK_CONFIG.accountNo, "Số tài khoản")}
                            >
                              {copiedField === "Số tài khoản" ? <FaCheck /> : <FaCopy />}
                              <span>{copiedField === "Số tài khoản" ? "Đã chép" : "Sao chép"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="bank-info-item">
                          <span className="info-label">Chủ tài khoản:</span>
                          <strong className="info-value">{BANK_CONFIG.accountName}</strong>
                        </div>

                        <div className="bank-info-item">
                          <span className="info-label">Số tiền:</span>
                          <div className="copyable-value">
                            <strong className="info-value-price">{formatPrice(totalAmount)}</strong>
                            <button
                              type="button"
                              className="btn-copy"
                              onClick={() => handleCopy(String(totalAmount), "Số tiền")}
                            >
                              {copiedField === "Số tiền" ? <FaCheck /> : <FaCopy />}
                              <span>{copiedField === "Số tiền" ? "Đã chép" : "Sao chép"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="bank-info-item highlight-memo">
                          <span className="info-label">Nội dung CK:</span>
                          <div className="copyable-value">
                            <strong className="memo-text">{orderCode}</strong>
                            <button
                              type="button"
                              className="btn-copy copy-memo"
                              onClick={() => handleCopy(orderCode, "Nội dung chuyển khoản")}
                            >
                              {copiedField === "Nội dung chuyển khoản" ? <FaCheck /> : <FaCopy />}
                              <span>{copiedField === "Nội dung chuyển khoản" ? "Đã chép" : "Sao chép"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bank-box-footer">
                      💡 <strong>Lưu ý:</strong> Vui lòng giữ nguyên nội dung chuyển khoản <code>{orderCode}</code> để hệ thống tự động xác nhận đơn nhanh nhất.
                    </div>
                  </div>
                )}

                {/* KHUNG THANH TOÁN VÍ MOMO */}
                {customerInfo.paymentMethod === "momo" && (
                  <div className="momo-payment-box">
                    <div className="momo-header">
                      <span className="momo-badge">Ví MoMo</span>
                      <h4>Thanh toán qua Ví điện tử MoMo</h4>
                    </div>
                    <div className="momo-content">
                      <div className="momo-row">
                        <span>Số điện thoại MoMo:</span>
                        <div className="copyable-value">
                          <strong>{MOMO_CONFIG.phone}</strong>
                          <button
                            type="button"
                            className="btn-copy"
                            onClick={() => handleCopy(MOMO_CONFIG.phone, "Số điện thoại MoMo")}
                          >
                            {copiedField === "Số điện thoại MoMo" ? <FaCheck /> : <FaCopy />}
                            <span>{copiedField === "Số điện thoại MoMo" ? "Đã chép" : "Sao chép"}</span>
                          </button>
                        </div>
                      </div>
                      <div className="momo-row">
                        <span>Tên người nhận:</span>
                        <strong>{MOMO_CONFIG.accountName}</strong>
                      </div>
                      <div className="momo-row">
                        <span>Số tiền cần chuyển:</span>
                        <strong className="info-value-price">{formatPrice(totalAmount)}</strong>
                      </div>
                      <div className="momo-row">
                        <span>Lời nhắn chuyển tiền:</span>
                        <div className="copyable-value">
                          <strong className="memo-text">{orderCode}</strong>
                          <button
                            type="button"
                            className="btn-copy copy-memo"
                            onClick={() => handleCopy(orderCode, "Lời nhắn MoMo")}
                          >
                            {copiedField === "Lời nhắn MoMo" ? <FaCheck /> : <FaCopy />}
                            <span>{copiedField === "Lời nhắn MoMo" ? "Đã chép" : "Sao chép"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* KHUNG THANH TOÁN COD */}
                {customerInfo.paymentMethod === "cod" && (
                  <div className="cod-info-box">
                    <div className="cod-notice">
                      <FaTruck className="cod-icon" />
                      <div>
                        <strong>Thanh toán tiền mặt khi nhận hàng (COD)</strong>
                        <p>Quý khách được kiểm tra sản phẩm trước khi thanh toán cho nhân viên giao hàng.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="checkout-right">
              <div className="checkout-card">
                <h3 className="order-summary-title">ĐƠN HÀNG CỦA BẠN</h3>
                <div className="order-items">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="order-item">
                      <p className="order-item-name">
                        {item.name}{" "}
                        <span className="order-item-qty">x{item.quantity}</span>
                      </p>
                      <span className="order-item-price">
                        {formatPrice(cleanPrice(item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="sum-rows">
                  <p>
                    <span>Tạm tính</span>
                    <span>{formatPrice(subTotal)}</span>
                  </p>
                  {discount > 0 && (
                    <p className="sum-row-discount">
                      <span>Giảm giá</span>
                      <span>-{formatPrice(discount)}</span>
                    </p>
                  )}
                  <p>
                    <span>Phí ship</span>
                    <span className={shipping === 0 ? "free-ship" : ""}>
                      {shipping === 0 ? "Miễn phí" : formatPrice(shipping)}
                    </span>
                  </p>
                  <p className="sum-row-total">
                    <span>Tổng cộng</span>
                    <span className="total-price">
                      {formatPrice(totalAmount)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="checkout-card coupon-card" ref={couponWrapRef}>
                <h4 className="coupon-title">
                  <FaTag /> Mã giảm giá
                </h4>

                {appliedVoucher ? (
                  <div className="coupon-applied">
                    <span>
                      <FaTag /> {appliedVoucher.code}
                    </span>
                    <button type="button" onClick={handleRemoveCoupon}>
                      Bỏ mã
                    </button>
                  </div>
                ) : (
                  <div className="coupon-input-wrap">
                    <div className="coupon-row">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        onFocus={() => setShowVoucherList(true)}
                        placeholder="Chọn hoặc nhập mã giảm giá..."
                        autoComplete="off"
                      />
                      <button type="button" onClick={handleApplyCoupon}>
                        Áp dụng
                      </button>
                    </div>

                    {showVoucherList && (
                      <div className="voucher-dropdown">
                        {myVouchers.length === 0 ? (
                          <div className="voucher-empty">
                            <p>Bạn chưa có mã nào.</p>
                            <Link
                              to="/tri-an-khach-hang"
                              onClick={() => setShowVoucherList(false)}
                            >
                              Vào Kho Voucher
                            </Link>
                          </div>
                        ) : (
                          <ul className="voucher-list">
                            {myVouchers.map((v) => {
                              const eligible = subTotal >= (v.minOrder || 0);
                              return (
                                <li
                                  key={v.code}
                                  className={`voucher-list-item ${!eligible ? "voucher-disabled" : ""}`}
                                  onClick={() =>
                                    eligible && handleSelectVoucherFromList(v)
                                  }
                                >
                                  <div className="voucher-list-icon">
                                    <FaTag />
                                  </div>
                                  <div className="voucher-list-info">
                                    <strong>{v.code}</strong>
                                    <span>
                                      {v.type === "percent"
                                        ? `Giảm ${v.value}%${v.maxDiscount ? ` (tối đa ${formatPrice(v.maxDiscount)})` : ""}`
                                        : `Giảm ${formatPrice(v.value)}`}
                                    </span>
                                    <small>
                                      Đơn tối thiểu{" "}
                                      {formatPrice(v.minOrder || 0)}
                                    </small>
                                  </div>
                                  {!eligible && (
                                    <span className="voucher-locked">
                                      Chưa đủ điều kiện
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-confirm-checkout"
                disabled={submitting}
              >
                {submitting ? "ĐANG XỬ LÝ..." : "XÁC NHẬN ĐẶT HÀNG"}
              </button>
              <p className="secure-note">
                <FaShieldAlt /> Thông tin của bạn được mã hóa & bảo mật an toàn
              </p>

              <div className="checkout-trust-badges">
                <div className="trust-item">
                  <FaShieldAlt className="trust-icon" />
                  <div>
                    <strong>Chính Hãng 100%</strong>
                    <span>Bảo hành chính thức từ hãng</span>
                  </div>
                </div>
                <div className="trust-item">
                  <FaTruck className="trust-icon" />
                  <div>
                    <strong>Giao Hàng Toàn Quốc</strong>
                    <span>Đóng gói cẩn thận, chống sốc</span>
                  </div>
                </div>
                <div className="trust-item">
                  <FaHeadset className="trust-icon" />
                  <div>
                    <strong>Hỗ Trợ Kỹ Thuật 24/7</strong>
                    <span>Hotline tư vấn: 1900 8888</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Sevicer />
      <FooterUser />
      <Toaster />
    </>
  );
};

export default Checkout;
