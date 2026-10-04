import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// --- IMPORT THƯ VIỆN SONNER CAO CẤP ---
import { toast, Toaster } from "sonner";
import "./Login.css";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaFacebookF,
  FaShieldAlt,
} from "react-icons/fa";
import Sevicer from "../Sevicer/Sevicer";
import { apiFetch, readJson, setAuthSession } from "../../utils/api";

const Login = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // 1. Sonner bắn cảnh báo khi bỏ trống ô nhập liệu
    if (!account.trim() || !password.trim()) {
      toast.warning("Vui lòng nhập đầy đủ thông tin đăng nhập!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ account: account.trim(), password }),
      });
      const data = await readJson(response, "Đăng nhập thất bại.");
      const foundUser = data.user;
      setAuthSession(data);

        if (["admin", "warehouse", "support"].includes(foundUser.role)) {
          toast.success("Đăng nhập khu vực vận hành thành công!");
          setTimeout(() => navigate("/admin"), 1000);
        } else {
          toast.success(`Chào mừng ${foundUser.fullName} quay trở lại!`);
          setTimeout(() => navigate("/"), 1000);
        }
    } catch (error) {
      console.error("Chi tiết lỗi API đăng nhập:", error);
      toast.error(error.message || "Không thể kết nối tới server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="login-page">
        <div className="containers">
          <div className="breadcrumb">
            <Link to="/">
              <span>Trang chủ </span>
            </Link>
            <Link to="/login">
              <span>Đăng Nhập</span>
            </Link>
          </div>
        </div>

        <div className="container">
          <div className="login-wrapper">
            {/* BÊN TRÁI: Các tính năng giới thiệu */}
            <div className="login-left">
              <div className="login-overlay">
                <h2>Chào mừng trở lại!</h2>
                <p className="welcome-text">
                  Đăng nhập để tiếp tục mua sắm và nhận nhiều ưu đãi hấp dẫn.
                </p>
                <div className="feature-item">
                  <div className="feature-icon">
                    <FaUser />
                  </div>
                  <div>
                    <h4>Mua sắm dễ dàng</h4>
                    <p>Thêm sản phẩm vào giỏ hàng và thanh toán nhanh chóng.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h4>Nhiều ưu đãi</h4>
                    <p>
                      Nhận thông tin khuyến mãi và giá ưu đãi dành riêng cho
                      bạn.
                    </p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <FaLock />
                  </div>
                  <div>
                    <h4>Bảo mật thông tin</h4>
                    <p>Tài khoản của bạn luôn được bảo vệ an toàn tuyệt đối.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BÊN PHẢI: Form xử lý */}
            <div className="login-right">
              <h2>Đăng nhập</h2>
              <p className="register-link">
                Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
              </p>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Email hoặc số điện thoại</label>
                  <div className="input-group">
                    <FaUser className="input-icon" />
                    <input
                      type="text"
                      placeholder="Nhập email hoặc số điện thoại"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mật khẩu</label>
                  <div className="input-group">
                    <FaLock className="input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <span
                      className="eye-icon"
                      onClick={() =>
                        !isLoading && setShowPassword(!showPassword)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>

                <div className="login-option">
                  <label className="remember">
                    <input type="checkbox" disabled={isLoading} /> Ghi nhớ đăng
                    nhập
                  </label>
                  <Link to="/forgot-password">Quên mật khẩu?</Link>
                </div>

                <button
                  type="submit"
                  className="login-btn"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang kết nối..." : "Đăng nhập"}
                </button>
              </form>

              <div className="line">
                <span>hoặc đăng nhập với</span>
              </div>
              <div className="social-login">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    toast.info(
                      "Cổng OAuth Google đang kích hoạt. Bạn có thể đăng nhập nhanh bằng tài khoản demo!",
                    )
                  }
                >
                  <FaGoogle /> Google
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    toast.info(
                      "Cổng OAuth Facebook đang kích hoạt. Bạn có thể đăng nhập nhanh bằng tài khoản demo!",
                    )
                  }
                >
                  <FaFacebookF /> Facebook
                </button>
              </div>
            </div>
          </div>
        </div>
        <Sevicer />
      </div>
      <FooterUser />

      {/*THÀNH PHẦN <Toaster /> CỦA SONNER ĐỂ HIỂN THỊ THÔNG BÁO ĐĂNG NHẬP */}
      <Toaster position="top-right" richColors closeButton duration={3000} />
    </>
  );
};

export default Login;
