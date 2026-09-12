import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { BiSolidDiscount } from "react-icons/bi";
import "./Admin.css";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaUsers,
  FaShoppingCart,
  FaChartBar,
  FaSignOutAlt,
  FaStar,
  FaBolt,
  FaSearch,
} from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";

const ADMIN_MENU = [
  {
    path: "/admin/products",
    key: "products",
    label: "Sản Phẩm",
    icon: FaBoxOpen,
  },
  {
    path: "/admin/orders",
    key: "orders",
    label: "Đơn Hàng",
    icon: FaShoppingCart,
  },
  { path: "/admin/users", key: "users", label: "Người Dùng", icon: FaUsers },
  {
    path: "/admin/statistics",
    key: "statistics",
    label: "Thống Kê",
    icon: FaChartBar,
  },
  { path: "/admin/reviews", key: "reviews", label: "Đánh Giá", icon: FaStar },
  {
    path: "/admin/vouchers",
    key: "vouchers",
    label: "Voucher",
    icon: BiSolidDiscount,
  },
  {
    path: "/admin/flash-sale",
    key: "flash-sale",
    label: "Flash Sale",
    icon: FaBolt,
  },
  {
    path: "/admin/service-requests",
    key: "service-requests",
    label: "Yêu Cầu Dịch Vụ",
    icon: MdSupportAgent,
  },
];

const Admin = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const [menuSearch, setMenuSearch] = useState("");

  const filteredMenu = useMemo(() => {
    const keyword = menuSearch.trim().toLocaleLowerCase("vi");
    if (!keyword) return ADMIN_MENU;
    return ADMIN_MENU.filter((item) =>
      item.label.toLocaleLowerCase("vi").includes(keyword),
    );
  }, [menuSearch]);

  const currentPage =
    ADMIN_MENU.find((item) => location.pathname.startsWith(item.path))?.label ||
    "Tổng quan";

  // Kiểm tra quyền Admin (Bảo mật cơ bản)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user || user.role !== "admin") {
      alert("Bạn không có quyền truy cập vùng này!");

      navigate("/login");
    }
  }, [navigate]);

  // Hàm tiện ích để thêm class 'active' cho menu đang chọn

  const isActive = (path) => (location.pathname.includes(path) ? "active" : "");

  return (
    <div className="admin-layout">
      {/* 1. THANH SIDEBAR BÊN TRÁI */}

      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <h2>HCore Store</h2>
        </div>
        <div className="sidebar-search-wrap">
          <div className="sidebar-search">
            <FaSearch />
            <input
              type="search"
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Tìm chức năng..."
              aria-label="Tìm chức năng quản trị"
            />
          </div>
          {menuSearch && (
            <div className="sidebar-search-results">
              {filteredMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuSearch("")}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {filteredMenu.length === 0 && <p>Không tìm thấy chức năng</p>}
            </div>
          )}
        </div>
        <nav className="sidebar-menu">
          <Link to="/admin/products" className={isActive("products")}>
            <FaBoxOpen />
            <span>Sản Phẩm</span>
          </Link>

          <Link to="/admin/orders" className={isActive("orders")}>
            <FaShoppingCart />
            <span>Đơn Hàng</span>
          </Link>
          <Link to="/admin/users" className={isActive("users")}>
            <FaUsers />
            <span>Người Dùng</span>
          </Link>
          <Link to="/admin/statistics" className={isActive("statistics")}>
            <FaChartBar />
            <span>Thống Kê</span>
          </Link>
          <Link to="/admin/reviews" className={isActive("reviews")}>
            <FaStar />
            <span>Đánh Giá</span>
          </Link>
          <Link to="/admin/vouchers" className={isActive("vouchers")}>
            <BiSolidDiscount />
            <span>Voucher</span>
          </Link>
          <Link to="/admin/flash-sale" className={isActive("flash-sale")}>
            <FaBolt />
            <span>Flash Sale</span>
          </Link>
          <Link
            to="/admin/service-requests"
            className={isActive("service-requests")}
          >
            <MdSupportAgent />
            <span>Yêu Cầu Dịch Vụ</span>
          </Link>
        </nav>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG BÊN PHẢI */}

      <div className="admin-main">
        {/* Header trên cùng */}

        <header className="admin-navbar">
          <div className="navbar-title">Hệ thống quản trị</div>

          <span className="navbar-current-page">{currentPage}</span>

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("currentUser");
              navigate("/login");
            }}
          >
            Đăng xuất
          </button>
        </header>

        {/* Nội dung động của các trang con sẽ được render tại đây */}

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Admin;
