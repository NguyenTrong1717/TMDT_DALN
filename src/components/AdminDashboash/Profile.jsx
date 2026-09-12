import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "sonner";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaShieldAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaEdit,
  FaLock,
  FaClipboardList,
  FaSignOutAlt,
  FaBoxes,
  FaFileInvoiceDollar,
} from "react-icons/fa";

import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    toast.success("Đăng xuất thành công!");
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <Header />

      {/* 1. Thanh điều hướng */}
      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link>
            <span className="demo-bread-current">Trang Cá Nhân</span>
          </Link>
        </div>
        <div className="container">
          <div className="profile-wrapper">
            {/* ================= LEFT (SIDEBAR + MENU) ================= */}
            <div className="profile-left">
              <div className="profile-avatar-box">
                <div className="profile-avatar-circle">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.fullName} />
                  ) : (
                    currentUser.fullName?.charAt(0).toUpperCase()
                  )}
                </div>

                <h2>{currentUser.fullName}</h2>
                <p>{currentUser.email}</p>

                <span
                  className={`badge-role ${
                    currentUser.role === "admin" ? "admin" : "user"
                  }`}
                >
                  {currentUser.role === "admin"
                    ? "Quản trị viên"
                    : "Thành viên"}
                </span>
              </div>

              <div className="profile-menu">
                <button
                  className="profile-menu-btn"
                  onClick={() => navigate("/edit")}
                >
                  <FaEdit />
                  <span>Chỉnh sửa thông tin</span>
                </button>

                <button
                  className="profile-menu-btn"
                  onClick={() => navigate("/change-password")}
                >
                  <FaLock />
                  <span>Đổi mật khẩu</span>
                </button>

                {/* --- PHẦN MENU PHÂN QUYỀN ĐIỀU KIỆN --- */}
                {currentUser.role === "admin" ? (
                  <>
                    {/* Menu dành riêng cho Admin */}
                    <button
                      className="profile-menu-btn admin-btn"
                      onClick={() => navigate("/admin/products")}
                    >
                      <FaBoxes />
                      <span>Quản lý sản phẩm</span>
                    </button>

                    <button
                      className="profile-menu-btn admin-btn"
                      onClick={() => navigate("/admin/orders")}
                    >
                      <FaFileInvoiceDollar />
                      <span>Quản lý đơn hàng</span>
                    </button>
                  </>
                ) : (
                  /* Menu dành riêng cho Thành viên thường */
                  <button
                    className="profile-menu-btn"
                    onClick={() => navigate("/orders")}
                  >
                    <FaClipboardList />
                    <span>Đơn hàng của tôi</span>
                  </button>
                )}
                {/* -------------------------------------- */}

                <button
                  className="profile-menu-btn logout-btn"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            {/* ================= RIGHT (INFORMATION) ================= */}
            <div className="profile-right">
              <div className="profile-title">
                <h2>Hồ sơ cá nhân</h2>
                <p>Quản lý thông tin tài khoản và bảo mật của bạn.</p>
              </div>

              <div className="info-grid">
                <div className="info-card">
                  <div className="info-icon">
                    <FaUser />
                  </div>
                  <div className="info-details">
                    <label>Họ và tên</label>
                    <p>{currentUser.fullName}</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <FaEnvelope />
                  </div>
                  <div className="info-details">
                    <label>Email</label>
                    <p>{currentUser.email}</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <FaPhone />
                  </div>
                  <div className="info-details">
                    <label>Số điện thoại</label>
                    <p>{currentUser.phone || "Chưa cập nhật"}</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <FaMapMarkerAlt />
                  </div>
                  <div className="info-details">
                    <label>Địa chỉ</label>
                    <p>{currentUser.address || "Chưa cập nhật"}</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <FaShieldAlt />
                  </div>
                  <div className="info-details">
                    <label>Vai trò</label>
                    <p
                      className={
                        currentUser.role === "admin"
                          ? "role-admin"
                          : "role-user"
                      }
                    >
                      {currentUser.role === "admin"
                        ? "Quản trị viên"
                        : "Thành viên"}
                    </p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <FaShieldAlt />
                  </div>
                  <div className="info-details">
                    <label>Trạng thái</label>
                    <p
                      className={
                        currentUser.status === "active"
                          ? "status-active"
                          : "status-lock"
                      }
                    >
                      {currentUser.status === "active"
                        ? "Đang hoạt động"
                        : "Đã khóa"}
                    </p>
                  </div>
                </div>

                <div className="info-card full-width">
                  <div className="info-icon">
                    <FaCalendarAlt />
                  </div>
                  <div className="info-details">
                    <label>Ngày tham gia</label>
                    <p>{formatDate(currentUser.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Sevicer />
      </div>

      <FooterUser />

      <Toaster position="top-right" richColors closeButton duration={3000} />
    </>
  );
};

export default Profile;
