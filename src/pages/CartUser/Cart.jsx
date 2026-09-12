import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

import Header from "../../components/Header/Header";
import "./Cart.css";
import Sevicer from "../../components/Sevicer/Sevicer";
import FooterUser from "../../components/Footer/FooterUser";

const API_URL = "http://localhost:3000";

// Hàm định dạng tiền tệ chuẩn VND
const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // ================= HÀM FETCH GIỎ HÀNG THÔNG MINH  =================
  const fetchCart = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      // Bước 1: Thử gọi lọc theo cách thông thường
      let res = await fetch(`${API_URL}/cart?userId=${currentUser.id}`);
      let cartData = [];

      if (res.ok) {
        cartData = await res.json();
      }

      // Nếu JSON-Server trả về rỗng do lệch kiểu dữ liệu (String vs Number)
      if (!cartData || cartData.length === 0) {
        console.log(
          "Phát hiện mảng rỗng do lệch kiểu dữ liệu, kích hoạt bộ lọc ép kiểu ép buộc...",
        );

        // Lấy toàn bộ bảng giỏ hàng về
        const resAll = await fetch(`${API_URL}/cart`);
        if (resAll.ok) {
          const allCart = await resAll.json();

          // Tự dùng hàm filter của JavaScript để ép cả 2 vế về String so sánh cho chắc chắn!
          cartData = allCart.filter(
            (item) => String(item.userId) === String(currentUser.id),
          );
        }
      }

      console.log("1. Dữ liệu sau bộ cứu hộ lọc bằng JS:", cartData);

      // Bước 2: Đi map thông tin chi tiết các bảng (Giữ nguyên logic quét thông minh cũ)
      const fullCartData = await Promise.all(
        cartData.map(async (item) => {
          if (item.name && item.price && item.image) {
            return item;
          }

          const tablesToScan = [];
          if (item.fromTable) tablesToScan.push(item.fromTable);
          tablesToScan.push(
            "ProductPagies",
            "ProductMenus",
            "eventList",
            "LaptopUser",
            "products",
          );

          let productDetails = null;

          for (const tableName of tablesToScan) {
            try {
              const pRes = await fetch(
                `${API_URL}/${tableName}/${item.productId}`,
              );
              if (pRes.ok) {
                const data = await pRes.json();
                if (data && (data.name || data.title)) {
                  productDetails = data;
                  console.log(
                    `-> Đã tìm thấy sản phẩm tại bảng: ${tableName}`,
                    data,
                  );
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }

          if (productDetails) {
            return {
              ...item,
              ...productDetails,
              id: item.id,
              productId: item.productId,
            };
          }
          return item;
        }),
      );

      console.log("3. Dữ liệu cuối cùng set vào State:", fullCartData);
      setCartItems(fullCartData);
    } catch (error) {
      console.error("Lỗi fetch giỏ hàng:", error);
      toast.error("Không thể tải dữ liệu giỏ hàng");
    } finally {
      setLoading(false);
    }
  };

  // Fetch lần đầu khi mount, và tự fetch lại mỗi khi có nơi khác báo giỏ hàng thay đổi
  // (ví dụ: sau khi đặt hàng ở trang Checkout sẽ dispatch sự kiện này)
  useEffect(() => {
    fetchCart();

    const handleCartUpdated = () => fetchCart();
    window.addEventListener("cartUpdated", handleCartUpdated);
    return () => window.removeEventListener("cartUpdated", handleCartUpdated);
  }, []);

  // ================= TĂNG GIẢM SỐ LƯỢNG SẢN PHẨM =================
  const handleQuantityChange = async (id, newQty) => {
    if (newQty < 1) return;
    try {
      const res = await fetch(`${API_URL}/cart/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (res.ok) {
        // Phát sự kiện đồng bộ số lượng hiển thị lên badge icon của Header ngay lập tức
        window.dispatchEvent(new Event("cartUpdated"));
        fetchCart();
      } else {
        console.error("Cập nhật số lượng thất bại, status:", res.status);
        toast.error("Không thể cập nhật số lượng");
      }
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      toast.error("Không thể cập nhật số lượng");
    }
  };

  // ================= XÓA 1 SẢN PHẨM KHỎI GIỎ =================
  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`${API_URL}/cart/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
        window.dispatchEvent(new Event("cartUpdated"));
        fetchCart();
      } else {
        console.error("Xóa item thất bại, status:", res.status);
        toast.error("Lỗi khi xóa sản phẩm");
      }
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      toast.error("Lỗi khi xóa sản phẩm");
    }
  };

  // ================= GIAO DIỆN TRẠNG THÁI LOADING =================
  if (loading) {
    return (
      <div className="cart-loading-container">
        <div className="cart-loading-spinner"></div>
        <p className="cart-loading-text">Đang tải dữ liệu giỏ hàng...</p>
      </div>
    );
  }

  // Tính toán tổng số tiền của toàn bộ giỏ hàng
  const totalCartAmount = cartItems.reduce((total, item) => {
    const price = item.price || 0;
    const qty = item.quantity || 1;
    return total + price * qty;
  }, 0);

  return (
    <>
      <Header />
      <div className="demo-bar">
        {/* 1. Thanh điều hướng */}
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link to="/cart">
            <span>Giỏ hàng</span>
          </Link>
          <span className="demo-bread-current">Thanh toán</span>
        </div>

        {/* 2. Nội dung chính trang giỏ hàng */}
        <div className="cart-page-container">
          <div className="cart-header">
            <div className="cart-header-left">
              <h2 className="cart-page-title">GIỎ HÀNG CỦA BẠN</h2>
            </div>
          </div>

          {/* KIỂM TRA GIỎ HÀNG TRỐNG */}
          {cartItems.length === 0 ? (
            <div className="cart-empty-box">
              <h2>Giỏ hàng của bạn đang trống</h2>
              <p>Hãy thêm sản phẩm để bắt đầu mua sắm.</p>
              <button
                className="btn-back-to-shop"
                onClick={() => navigate("/")}
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <div className="cart-main-layout">
              {/* KHU VỰC DANH SÁCH SẢN PHẨM (BÊN TRÁI) */}
              <div className="cart-left">
                <div className="cart-section-title">
                  <h3>Sản phẩm trong giỏ ({cartItems.length})</h3>
                </div>

                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <div key={item.id} className="cart-item-card">
                      <div className="cart-item-image-wrapper">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="cart-item-img"
                        />
                      </div>

                      <div className="cart-item-info">
                        <h4 className="cart-item-name">
                          {item.name || `Sản phẩm #${item.productId}`}
                        </h4>
                        <p className="cart-item-status">● Còn hàng</p>
                      </div>

                      <div className="cart-item-price">
                        {formatPrice(item.price || 0)}
                      </div>

                      <div className="cart-item-quantity-control">
                        <button
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-subtotal">
                        {formatPrice((item.price || 0) * item.quantity)}
                      </div>

                      <button
                        className="btn-remove-cart-item"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>

                {/* Các nút thao tác nhanh ở đáy giỏ hàng */}
                <div className="cart-bottom-action">
                  <button
                    className="continue-shopping-btn"
                    onClick={() => navigate("/")}
                  >
                    ← Tiếp tục mua sắm
                  </button>

                  <button
                    className="remove-all-btn"
                    onClick={async () => {
                      try {
                        const results = [];
                        // Xóa lần lượt từng item để tránh race condition ghi file của json-server
                        for (const item of cartItems) {
                          try {
                            const res = await fetch(
                              `${API_URL}/cart/${item.id}`,
                              {
                                method: "DELETE",
                              },
                            );
                            results.push({
                              id: item.id,
                              ok: res.ok,
                              status: res.status,
                            });
                          } catch (err) {
                            results.push({
                              id: item.id,
                              ok: false,
                              error: err.message,
                            });
                          }
                        }

                        const failed = results.filter((r) => !r.ok);
                        if (failed.length > 0) {
                          console.error("Một số item không xóa được:", failed);
                          toast.error(
                            "Một số sản phẩm không thể xóa, vui lòng thử lại.",
                          );
                        } else {
                          toast.success("Đã xóa sạch giỏ hàng");
                        }

                        window.dispatchEvent(new Event("cartUpdated"));
                        fetchCart();
                      } catch (error) {
                        console.error("Lỗi khi xóa toàn bộ giỏ hàng:", error);
                        toast.error("Không thể làm trống giỏ hàng");
                      }
                    }}
                  >
                    🗑 Xóa tất cả
                  </button>
                </div>
              </div>

              {/* KHU VỰC TÍNH TOÁN TIỀN VÀ THANH TOÁN (BÊN PHẢI) */}
              <div className="cart-right">
                <div className="payment-card">
                  <div className="payment-header">
                    <h2>Tổng thanh toán</h2>
                    <h1>
                      {formatPrice(
                        totalCartAmount +
                          (totalCartAmount >= 500000 ? 0 : 30000),
                      )}
                    </h1>
                  </div>

                  <div className="payment-body">
                    <div className="payment-row">
                      <span>Tạm tính ({cartItems.length} sản phẩm)</span>
                      <span>{formatPrice(totalCartAmount)}</span>
                    </div>

                    <div className="payment-row">
                      <span>Phí vận chuyển</span>
                      <span>
                        {totalCartAmount >= 500000
                          ? "Miễn phí"
                          : formatPrice(30000)}
                      </span>
                    </div>

                    <div className="payment-row">
                      <span>Ưu đãi áp dụng</span>
                      <span className="discount-text">
                        {totalCartAmount >= 500000
                          ? `-${formatPrice(30000)}`
                          : formatPrice(0)}
                      </span>
                    </div>

                    <div className="payment-divider"></div>

                    <div className="payment-total">
                      <div>
                        <h3>Tổng thanh toán</h3>
                      </div>
                      <h2>
                        {formatPrice(
                          totalCartAmount +
                            (totalCartAmount >= 500000 ? 0 : 30000),
                        )}
                      </h2>
                    </div>

                    <button
                      className="checkout-btn"
                      onClick={() => navigate("/checkout")}
                    >
                      Tiến hành thanh toán
                    </button>

                    <div className="voucher-box">
                      <input type="text" placeholder="Nhập mã giảm giá" />
                      <button type="button">Áp dụng</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Sevicer />
      <FooterUser />
    </>
  );
};

export default Cart;
