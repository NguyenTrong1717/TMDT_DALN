import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "./Header.css";
import { MdOutlineSupportAgent } from "react-icons/md";
import { MdDiscount } from "react-icons/md";
import { AiOutlineFileProtect } from "react-icons/ai";
import { FaShippingFast } from "react-icons/fa";
import { MdOutlineAddIcCall } from "react-icons/md";
import { PiShoppingCartDuotone } from "react-icons/pi";
import { IoSearch } from "react-icons/io5";
import { VscAccount } from "react-icons/vsc";
import NotificationBell from "../Notification/NotificationBell";

const Header = (props) => {
  const navigate = useNavigate();

  const [activeModal, setActiveModal] = useState(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // MỚI: theo dõi trạng thái cuộn trang để ẩn/hiện thanh marquee + search
  const [isScrolled, setIsScrolled] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === "admin";

  const fetchCartCount = async () => {
    if (!currentUser) {
      setCartCount(0);
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:3000/cart?userId=${currentUser.id}`,
      );
      let cartData = [];

      if (res.ok) {
        cartData = await res.json();
      }

      if (!cartData || cartData.length === 0) {
        const resAll = await fetch("http://localhost:3000/cart");
        if (resAll.ok) {
          const allCart = await resAll.json();
          cartData = allCart.filter(
            (item) => String(item.userId) === String(currentUser.id),
          );
        }
      }

      const total = cartData.reduce(
        (sum, item) => sum + (Number(item.quantity) || 1),
        0,
      );
      setCartCount(total);
    } catch (error) {
      console.error("Lỗi khi lấy số lượng giỏ hàng trên Header:", error);
    }
  };

  useEffect(() => {
    fetchCartCount();

    window.addEventListener("cartUpdated", fetchCartCount);
    return () => {
      window.removeEventListener("cartUpdated", fetchCartCount);
    };
  }, [currentUser?.id]);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeModal]);

  useEffect(() => {
    const handleCloseMenu = () => setShowAccountMenu(false);
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // MỚI: lắng nghe sự kiện cuộn trang
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3000/serviceRequests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: activeModal,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          userId: currentUser?.id || null, // MỚI: lưu người gửi để bắn thông báo cá nhân sau này
          status: "pending", // pending | processing | done
          createdAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Gửi yêu cầu thất bại");

      toast.success(
        `Đã gửi yêu cầu [${activeModal}] thành công! Chúng tôi sẽ liên hệ lại sớm nhất.`,
      );
      setFormData({ fullName: "", email: "", phone: "", message: "" });
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  const getPlaceholderMessage = () => {
    if (activeModal === "HỖ TRỢ TRẢ GÓP") {
      return "Nhập sản phẩm bạn muốn mua trả góp hoặc số tiền dự định trả trước...";
    }
    if (activeModal === "GIÁ ƯU ĐÃI NHẤT") {
      return "Nhập sản phẩm bạn đang quan tâm để nhận báo giá chiết khấu tốt nhất...";
    }
    return "Nhập lời nhắn của bạn...";
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    toast.success("Đã đăng xuất tài khoản thành công!");
    navigate("/login");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      toast.warning("Vui lòng nhập từ khoá tìm kiếm!");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header
      className={`site-header ${isScrolled ? "site-header--compact" : ""}`}
    >
      {/* MỚI: thanh thông báo chạy ngang - sẽ ẩn khi cuộn xuống */}
      <div
        className={`site-header__marquee ${
          isScrolled ? "site-header__marquee--hidden" : ""
        }`}
      >
        <div className="site-header__marquee-track">
          <span className="site-header__marquee-item">
            Giảm giá đến 50% cho tất cả sản phẩm laptop gaming
          </span>
          <span className="site-header__marquee-item">
            Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ
          </span>
          <span className="site-header__marquee-item">
            Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng
          </span>
          <span className="site-header__marquee-item">
            Tặng ngay chuột không dây khi mua PC gaming
          </span>
          {/* Lặp lại để hiệu ứng chạy liên tục không bị đứt đoạn */}
          <span className="site-header__marquee-item">
            Giảm giá đến 50% cho tất cả sản phẩm laptop gaming
          </span>
          <span className="site-header__marquee-item">
            Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ
          </span>
          <span className="site-header__marquee-item">
            Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng
          </span>
          <span className="site-header__marquee-item">
            Tặng ngay chuột không dây khi mua PC gaming
          </span>
        </div>
      </div>

      <div className="site-header__container">
        <div className="site-header__top">
          <div className="site-header__logo">
            <Link to="/" className="logo">
              <span className="logo-h">H</span>
              <span className="logo-core">Core</span>
              <span className="logo-store">Store</span>
            </Link>
          </div>
          <nav className="site-header__nav">
            <ul className="site-header__menu">
              <li
                className="site-header__menu-item site-header__menu-item--clickable"
                onClick={() => setActiveModal("HỖ TRỢ TRẢ GÓP")}
              >
                <MdOutlineSupportAgent />
                Hỗ Trợ Trả Góp
              </li>
              <li
                className="site-header__menu-item site-header__menu-item--clickable"
                onClick={() => setActiveModal("GIÁ ƯU ĐÃI NHẤT")}
              >
                <MdDiscount />
                Giá Ưu Đãi Nhất
              </li>
              <li
                className="site-header__menu-item site-header__menu-item--clickable"
                onClick={() => navigate("/lien-he")}
              >
                <AiOutlineFileProtect />
                Liên Hệ Với Chúng Tôi
              </li>
              <li className="site-header__menu-item">
                <FaShippingFast />
                Miễn Phí Vận Chuyển
              </li>
              <li
                className="site-header__menu-item site-header__menu-item--clickable"
                onClick={() => setActiveModal("HOTLINE")}
              >
                <MdOutlineAddIcCall />
                HOTLINE
              </li>

              <li className="site-header__menu-item site-header__menu-item--notif ">
                <NotificationBell label="Thông Báo" />
              </li>

              <li
                className="site-header__menu-item site-header__menu-item--clickable site-header__cart-item"
                onClick={() => navigate("/cart")}
              >
                <div className="site-header__cart-icon">
                  <PiShoppingCartDuotone />
                  <span className="site-header__cart-count">{cartCount}</span>
                </div>
                Giỏ Hàng
              </li>

              <li
                className="site-header__menu-item site-header__menu-item--clickable site-header__account-wrapper"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAccountMenu(!showAccountMenu);
                }}
              >
                <VscAccount />
                <span>{isLoggedIn ? currentUser.fullName : "Tài khoản"}</span>

                {showAccountMenu && (
                  <ul className="site-header__account-menu">
                    {!isLoggedIn ? (
                      <>
                        <li>
                          <Link to="/login">Đăng nhập</Link>
                        </li>
                        <li>
                          <Link to="/register">Đăng ký</Link>
                        </li>
                      </>
                    ) : (
                      <>
                        {isAdmin && (
                          <li>
                            <Link to="/admin">Trang Admin</Link>
                          </li>
                        )}
                        <li>
                          <Link to="/profile">Thông tin cá nhân</Link>
                        </li>
                        <li
                          onClick={handleLogout}
                          className="site-header__account-menu-logout"
                        >
                          Đăng xuất
                        </li>
                      </>
                    )}
                  </ul>
                )}
              </li>
            </ul>
          </nav>
        </div>

        {/* MỚI: thanh search - sẽ ẩn khi cuộn xuống */}
        <div
          className={`site-header__bottom ${
            isScrolled ? "site-header__bottom--hidden" : ""
          }`}
        >
          <div className="site-header__bottom-inner">
            <button className="site-header__category-btn">
              Danh Mục Sản Phẩm
            </button>
            <form
              className="site-header__search-box"
              onSubmit={handleSearchSubmit}
            >
              <select className="site-header__search-category">
                <option>Danh Mục</option>
                <option>Laptop</option>
                <option>PC</option>
                <option>Con Chuột</option>
              </select>
              <input
                className="site-header__search-input"
                type="text"
                placeholder="Bạn cần tìm gì..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="site-header__search-btn" type="submit">
                <IoSearch />
              </button>
            </form>
          </div>
        </div>
      </div>

      {activeModal && (
        <div
          className="site-header__modal-overlay"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="site-header__modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`site-header__modal-header ${activeModal === "HOTLINE" ? "site-header__modal-header--alert" : ""}`}
            >
              <h3 className="site-header__modal-title">
                {activeModal === "HOTLINE"
                  ? "LIÊN HỆ KHẨN CẤP"
                  : "LIÊN HỆ VỚI CHÚNG TÔI"}
              </h3>
              <button
                className="site-header__modal-close"
                onClick={() => setActiveModal(null)}
              >
                &times;
              </button>
            </div>
            <div className="site-header__modal-body">
              {activeModal === "HOTLINE" ? (
                <>
                  <p className="site-header__modal-subtitle">
                    Vui lòng gọi trực tiếp cho các tổng đài viên dưới đây để
                    được xử lý sự cố lập tức!
                  </p>
                  <div className="site-header__hotline-list">
                    <div className="site-header__hotline-card">
                      <div className="site-header__hotline-info">
                        <span className="site-header__hotline-name">
                          Nguyễn Văn Trọng
                        </span>
                        <span className="site-header__hotline-role">
                          Hỗ trợ kỹ thuật phần cứng
                        </span>
                      </div>
                      <a
                        href="tel:0911108133"
                        className="site-header__hotline-call"
                      >
                        0326.807.955
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="site-header__modal-subtitle">
                    <span className="site-header__highlight">
                      {activeModal}
                    </span>
                    . Vui lòng để lại thông tin cá nhân dưới đây!
                  </p>
                  <form onSubmit={handleSubmit}>
                    <div className="site-header__form-group">
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
                    <div className="site-header__form-group">
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
                    <div className="site-header__form-group">
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
                    <div className="site-header__form-group">
                      <label>Nội dung chi tiết</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder={getPlaceholderMessage()}
                      ></textarea>
                    </div>
                    <button type="submit" className="site-header__modal-submit">
                      Xác nhận
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
