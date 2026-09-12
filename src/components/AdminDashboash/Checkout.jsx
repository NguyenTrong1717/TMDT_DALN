import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { FaUser, FaCreditCard, FaTag, FaChevronDown } from "react-icons/fa";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import "./Checkout.css";

const API_URL = "http://localhost:3000";

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
    label: "Thanh toán khi nhận hàng",
    desc: "COD — thanh toán bằng tiền mặt khi nhận",
    icon: "💵",
    iconBg: "#fef3c7",
  },
  {
    value: "bank",
    label: "Chuyển khoản ngân hàng",
    desc: "Thanh toán qua tài khoản ngân hàng",
    icon: "🏦",
    iconBg: "#e0f2fe",
  },
  {
    value: "momo",
    label: "Ví MoMo",
    desc: "Thanh toán nhanh qua ví điện tử MoMo",
    icon: "📱",
    iconBg: "#fce7f3",
  },
];

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const buyNowItem = location.state?.buyNowItem;
  const couponWrapRef = useRef(null);

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
        orderCode: generateOrderCode(),
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
                Thông tin của bạn được bảo mật an toàn
              </p>
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
