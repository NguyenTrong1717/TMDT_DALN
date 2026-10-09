import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaFacebookF,
} from "react-icons/fa";
import { apiFetch, readJson, setAuthSession } from "../../utils/api";
import "./Login.css";

const Login = () => {
  const [account, setAccount] = useState(
    () => localStorage.getItem("savedLoginAccount") || "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanAccount = account.trim();
    const cleanPassword = password.trim();

    if (!cleanAccount || !cleanPassword) {
      toast.warning("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          account: cleanAccount,
          password: cleanPassword,
        }),
      });
      const data = await readJson(response, "Đăng nhập thất bại.");
      const foundUser = data.user;
      setAuthSession(data);

      if (rememberMe) {
        localStorage.setItem("savedLoginAccount", cleanAccount);
      } else {
        localStorage.removeItem("savedLoginAccount");
      }

      if (["admin", "warehouse", "support"].includes(foundUser.role)) {
        toast.success("Đăng nhập khu vực vận hành thành công!");
        setTimeout(() => navigate("/admin"), 750);
      } else {
        toast.success(
          `Chào mừng ${foundUser.fullName || "bạn"} đã quay trở lại!`,
        );
        setTimeout(() => navigate("/"), 750);
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

      <main className="login-page">
        {/* Breadcrumb Navigation */}
        <div className="login-container">
          <nav className="login-breadcrumb" aria-label="breadcrumb">
            <Link to="/" className="breadcrumb-link">
              Trang chủ
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Đăng nhập</span>
          </nav>
        </div>

        {/* Khung đăng nhập 2 cột chuẩn các sàn TMĐT */}
        <div className="login-container">
          <div className="login-card-container">
            {/* CỘT TRÁI: Ảnh banner công nghệ sạch sẽ, không text rườm rà */}
            <div className="login-banner-col">
              <img
                src="/images/login_banner.jpg"
                alt="HCore Store Gaming & Tech"
                className="login-banner-img"
              />
              <div className="login-banner-gradient" />
              <div className="login-banner-caption">
                <span className="caption-tag">HCORE STORE</span>
                <h3>Thế Giới Công Nghệ & Gaming Đỉnh Cao</h3>
              </div>
            </div>

            {/* CỘT PHẢI: Form đăng nhập chuẩn mực */}
            <div className="login-form-col">
              <div className="form-header">
                <h1 className="form-title">Đăng nhập</h1>
                <p className="form-subtitle">
                  Chưa có tài khoản?{" "}
                  <Link to="/register" className="highlight-link">
                    Đăng ký ngay
                  </Link>
                </p>
              </div>

              {/* Biểu mẫu đăng nhập */}
              <form onSubmit={handleLogin} className="auth-form" noValidate>
                <div className="auth-input-group">
                  <label htmlFor="login-account" className="input-label">
                    Email hoặc số điện thoại
                  </label>
                  <div className="input-field-wrap">
                    <FaUser className="field-icon" />
                    <input
                      id="login-account"
                      type="text"
                      className="auth-input"
                      placeholder="Nhập email hoặc số điện thoại"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      disabled={isLoading}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <div className="label-with-action">
                    <label htmlFor="login-password" className="input-label">
                      Mật khẩu
                    </label>
                    <Link to="/forgot-password" className="forgot-pass-link">
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="input-field-wrap">
                    <FaLock className="field-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      className="auth-input"
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Ghi nhớ đăng nhập */}
                <div className="auth-options-row">
                  <label className="remember-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      className="custom-checkbox"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                </div>

                {/* Nút bấm Submit */}
                <button
                  type="submit"
                  className="btn-auth-submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                </button>
              </form>

              {/* Phân cách tiếp tục với */}
              <div className="social-divider">
                <span>Hoặc đăng nhập với</span>
              </div>

              <div className="social-login-grid">
                <button
                  type="button"
                  className="social-btn google-btn"
                  disabled={isLoading}
                  onClick={() =>
                    toast.info(
                      "Đăng nhập nhanh bằng tài khoản email hoặc đăng ký tài khoản mới!",
                    )
                  }
                >
                  <FaGoogle className="social-icon google-icon" />
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  className="social-btn facebook-btn"
                  disabled={isLoading}
                  onClick={() =>
                    toast.info(
                      "Đăng nhập nhanh bằng tài khoản email hoặc đăng ký tài khoản mới!",
                    )
                  }
                >
                  <FaFacebookF className="social-icon facebook-icon" />
                  <span>Facebook</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Khối chính sách / dịch vụ */}
        <Sevicer />
      </main>

      <FooterUser />

      {/* Toaster hiển thị thông báo */}
      <Toaster position="top-right" richColors closeButton duration={3000} />
    </>
  );
};

export default Login;
