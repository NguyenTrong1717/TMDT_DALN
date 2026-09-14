import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast, Toaster } from "sonner";
import {
  FaUser,
  FaCreditCard,
  FaTag,
  FaShieldAlt,
  FaTruck,
  FaHeadset,
} from "react-icons/fa";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import "./Checkout.css";

const API_URL = "http://127.0.0.1:3000";

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

const PAYMENT_METHODS = [
  {
    value: "cod",
    label: "Tiền mặt khi nhận hàng (COD)",
    desc: "Thanh toán bằng tiền mặt khi nhận kiện hàng",
    icon: "💵",
    iconBg: "#fef3c7",
  },
  {
    value: "vnpay",
    label: "Thẻ ATM nội địa (qua VNPAY)",
    iconSrc: "/images/vnpay.svg",
    iconBg: "#ffffff",
  },
];

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const buyNowItem = location.state?.buyNowItem;
  const couponWrapRef = useRef(null);
  const [requestId] = useState(
    () => globalThis.crypto?.randomUUID?.() || `checkout_${Date.now()}`,
  );

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
        const collectedCodes = userVoucherData
          .filter((uv) => uv.used !== true)
          .map((uv) => uv.voucherCode);
        const today = new Date();
        setMyVouchers(
          voucherData.filter(
            (v) =>
              collectedCodes.includes(v.code) &&
              (!v.expiredAt || new Date(`${v.expiredAt}T23:59:59+07:00`) >= today),
          ),
        );
      } catch (err) {
        console.error(err);
        // Không chặn checkout nếu tải voucher lỗi — chỉ là user không áp mã được
      }

      if (buyNowItem) {
        setCartItems([
          {
            ...buyNowItem,
            quantity: buyNowItem.quantity || 1,
            table:
              buyNowItem.table ||
              buyNowItem.fromTable ||
              buyNowItem._source ||
              location.state?.fromTable ||
              "catenogies",
          },
        ]);
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
  }, [buyNowItem, location.state?.fromTable, navigate]);

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
      const items = cartItems.map((item) => ({
        productId: item.productId ?? item.id,
        fromTable: item.table || item.fromTable || item._source || "catenogies",
        quantity: item.quantity,
        cartId: item.cartId || null,
      }));
      const payload = {
        requestId,
        checkoutMode: buyNowItem ? "buy_now" : "cart",
        items,
        voucherCode: appliedVoucher?.code || null,
        paymentMethod: customerInfo.paymentMethod,
        customer: {
          fullName: customerInfo.fullName,
          phone: customerInfo.phone,
          email: customerInfo.email,
          address: customerInfo.address,
          note: customerInfo.note,
        },
      };
      const endpoint =
        customerInfo.paymentMethod === "vnpay"
          ? `${API_URL}/api/payments/vnpay/create`
          : `${API_URL}/api/orders/checkout`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 404
              ? "Không tìm thấy API tạo đơn. Hãy chạy npm run server trong thư mục TMDT_DALN."
              : `Không thể tạo đơn hàng (HTTP ${res.status}).`),
        );
      }

      if (customerInfo.paymentMethod === "vnpay") {
        if (!data.paymentUrl) throw new Error("VNPAY chưa trả về URL thanh toán.");
        localStorage.setItem("pendingPaymentLookupToken", data.lookupToken);
        window.location.assign(data.paymentUrl);
        return;
      }

      window.dispatchEvent(new Event("cartUpdated"));
      toast.success("Đặt hàng thành công!");
      setTimeout(() => navigate("/orders"), 1000);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Có lỗi xảy ra khi đặt hàng.");
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
                        className={`pay-icon${pm.iconSrc ? " pay-icon-brand" : ""}`}
                        style={{ background: pm.iconBg }}
                      >
                        {pm.iconSrc ? <img src={pm.iconSrc} alt="VNPAY" /> : pm.icon}
                      </div>
                      <div className="pay-label">
                        <strong>{pm.label}</strong>
                        {pm.desc && <span>{pm.desc}</span>}
                      </div>
                    </label>
                  ))}
                </div>

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
                {submitting
                  ? "ĐANG XỬ LÝ..."
                  : customerInfo.paymentMethod === "vnpay"
                    ? "Thanh toán qua VNPAY"
                    : "XÁC NHẬN ĐẶT HÀNG"}
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
