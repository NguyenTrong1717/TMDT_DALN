import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { BiSolidDiscount } from "react-icons/bi";
import "./Admin.css";
import {
  FaBoxOpen,
  FaUsers,
  FaShoppingCart,
  FaChartBar,
  FaSignOutAlt,
  FaStar,
  FaBolt,
  FaSearch,
  FaHistory,
  FaChevronRight,
} from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";
import { getCurrentUser, logout } from "../../utils/api";

const ADMIN_MENU = [
  {
    path: "/admin/products",
    key: "products",
    label: "Sản Phẩm",
    icon: FaBoxOpen,
    roles: ["admin", "warehouse"],
  },
  {
    path: "/admin/orders",
    key: "orders",
    label: "Đơn Hàng",
    icon: FaShoppingCart,
    roles: ["admin", "warehouse", "support"],
  },
  { path: "/admin/users", key: "users", label: "Người Dùng", icon: FaUsers, roles: ["admin", "support"] },
  {
    path: "/admin/statistics",
    key: "statistics",
    label: "Thống Kê",
    icon: FaChartBar,
    roles: ["admin"],
  },
  { path: "/admin/reviews", key: "reviews", label: "Đánh Giá", icon: FaStar, roles: ["admin", "support"] },
  {
    path: "/admin/vouchers",
    key: "vouchers",
    label: "Voucher",
    icon: BiSolidDiscount,
    roles: ["admin"],
  },
  {
    path: "/admin/flash-sale",
    key: "flash-sale",
    label: "Flash Sale",
    icon: FaBolt,
    roles: ["admin"],
  },
  {
    path: "/admin/service-requests",
    key: "service-requests",
    label: "Yêu Cầu Dịch Vụ",
    icon: MdSupportAgent,
    roles: ["admin", "support"],
  },
  {
    path: "/admin/audit-logs",
    key: "audit-logs",
    label: "Nhật Ký Thao Tác",
    icon: FaHistory,
    roles: ["admin", "warehouse", "support"],
  },
];

const Admin = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const [menuSearch, setMenuSearch] = useState("");
  const currentUser = getCurrentUser();
  const allowedMenu = useMemo(
    () => ADMIN_MENU.filter((item) => item.roles.includes(currentUser?.role)),
    [currentUser?.role],
  );

  const filteredMenu = useMemo(() => {
    const keyword = menuSearch.trim().toLocaleLowerCase("vi");
    if (!keyword) return allowedMenu;
    return allowedMenu.filter((item) =>
      item.label.toLocaleLowerCase("vi").includes(keyword),
    );
  }, [allowedMenu, menuSearch]);

  const currentPage =
    allowedMenu.find((item) => location.pathname.startsWith(item.path))?.label ||
    "Tổng quan";

  // Kiểm tra quyền Admin (Bảo mật cơ bản)

  useEffect(() => {
    const user = getCurrentUser();

    if (!user || !["admin", "warehouse", "support"].includes(user.role)) {
      alert("Bạn không có quyền truy cập vùng này!");

      navigate("/login");
    }
  }, [navigate]);

  // Hàm tiện ích để thêm class 'active' cho menu đang chọn

  const isActive = (path) =>
    location.pathname.startsWith(path) ? "active" : "";

  const roleLabel = {
    admin: "Quản trị viên",
    warehouse: "Nhân viên kho",
    support: "Chăm sóc khách hàng",
  }[currentUser?.role];
  const displayName =
    currentUser?.fullName || currentUser?.username || "Nhân viên";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="admin-layout">
      {/* 1. THANH SIDEBAR BÊN TRÁI */}

      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">HC</div>
          <div>
            <h2>HCore Store</h2>
            <span>Admin workspace</span>
          </div>
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
          {allowedMenu.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} to={item.path} className={isActive(item.path)}>
                <Icon />
                <span>{item.label}</span>
                <FaChevronRight className="sidebar-menu-arrow" />
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar" aria-hidden="true">
            {initials || "HC"}
          </div>
          <div className="sidebar-user-copy">
            <strong>{displayName}</strong>
            <span>{roleLabel || "Nhân viên hệ thống"}</span>
          </div>
        </div>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG BÊN PHẢI */}

      <div className="admin-main">
        {/* Header trên cùng */}

        <header className="admin-navbar">
          <div className="navbar-heading">
            <span className="navbar-eyebrow">Hệ thống quản trị</span>
            <strong>{currentPage}</strong>
          </div>

          <button
            className="logout-btn"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <FaSignOutAlt />
            <span>Đăng xuất</span>
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
