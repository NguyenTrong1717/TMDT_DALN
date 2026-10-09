import { useState, useEffect } from "react";
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
  FaShieldAlt,
  FaBolt,
  FaTruck,
  FaUserShield,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";
import "./Login.css";

const API_URL = "http://localhost:3000";

const Login = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Load tài khoản đã lưu nếu trước đó đã tích "Ghi nhớ"
  useEffect(() => {
    const savedAccount = localStorage.getItem("savedLoginAccount");
    if (savedAccount) {
      setAccount(savedAccount);
    }
  }, []);

  // Đăng nhập nhanh bằng tài khoản Demo
  const fillDemoAccount = (demoEmail, demoPass) => {
    setAccount(demoEmail);
    setPassword(demoPass);
    toast.info(`Đã điền thông tin tài khoản demo: ${demoEmail}`);
  };

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
      const response = await fetch(`${API_URL}/users`);

      if (!response.ok) {
        throw new Error(`Lỗi kết nối máy chủ! Mã lỗi: ${response.status}`);
      }

      const users = await response.json();

      // So khớp người dùng: hỗ trợ Email, Số điện thoại hoặc Username
      const foundUser = users.find((user) => {
        const matchEmail =
          user.email &&
          user.email.toLowerCase() === cleanAccount.toLowerCase();
        const matchPhone =
          user.phone &&
          user.phone.trim() === cleanAccount;
        const matchUsername =
          user.username &&
          user.username.toLowerCase() === cleanAccount.toLowerCase();

        const matchPass =
          user.password &&
          String(user.password).trim() === cleanPassword;

        return (matchEmail || matchPhone || matchUsername) && matchPass;
      });

      if (foundUser) {
        if (foundUser.status === "inactive" || foundUser.status === "blocked") {
          toast.error("Tài khoản của bạn hiện đang bị tạm khóa. Vui lòng liên hệ CSKH!");
          return;
        }

        // Lưu trạng thái đăng nhập
        localStorage.setItem("currentUser", JSON.stringify(foundUser));
        window.dispatchEvent(new Event("authChange"));

        if (rememberMe) {
          localStorage.setItem("savedLoginAccount", cleanAccount);
        } else {
          localStorage.removeItem("savedLoginAccount");
        }

        if (foundUser.role === "admin") {
          toast.success("Đăng nhập thành công! Đang chuyển hướng vào bảng quản trị Admin...");
          setTimeout(() => navigate("/admin"), 750);
        } else {
          toast.success(`Chào mừng ${foundUser.fullName || "bạn"} đã quay trở lại HCore Store!`);
          setTimeout(() => navigate("/"), 750);
        }
      } else {
        toast.error("Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      toast.error("Không thể kết nối đến máy chủ backend (Port 3000). Vui lòng thử lại!");
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
            <Link to="/" className="breadcrumb-link">Trang chủ</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Đăng Nhập</span>
          </nav>
        </div>

        {/* Khung đăng nhập trung tâm 2 cột */}
        <div className="login-container">
          <div className="login-card-container">
            {/* CỘT TRÁI: Băng giới thiệu HCore Store */}
            <div className="login-brand-col">
              <div className="brand-badge">
                <FaBolt className="badge-bolt-icon" /> HCORE ECOSYSTEM
              </div>

              <h2 className="brand-headline">
                Chào Mừng Trở Lại <br />
                <span className="brand-gradient-text">HCore Store</span>
              </h2>

              <p className="brand-desc">
                Đăng nhập để nhận giá độc quyền thành viên H-Member, theo dõi tình trạng đơn hàng và tích điểm đổi quà công nghệ.
              </p>

              {/* Danh sách quyền lợi */}
              <div className="brand-perks-list">
                <div className="perk-card">
                  <div className="perk-icon-bubble">
                    <FaShieldAlt />
                  </div>
                  <div className="perk-body">
                    <h4>Bảo Mật Chuẩn SSO</h4>
                    <p>Mã hóa dữ liệu 256-bit an toàn, bảo vệ thông tin cá nhân và lịch sử giao dịch.</p>
                  </div>
                </div>

                <div className="perk-card">
                  <div className="perk-icon-bubble">
                    <FaBolt />
                  </div>
                  <div className="perk-body">
                    <h4>Ưu Đãi Trợ Giá H-Member</h4>
                    <p>Giảm thêm đến 500.000đ khi mua máy mới và hỗ trợ thu cũ đổi mới lên đến 3.000.000đ.</p>
                  </div>
                </div>

                <div className="perk-card">
                  <div className="perk-icon-bubble">
                    <FaTruck />
                  </div>
                  <div className="perk-body">
                    <h4>Giao Nhanh 2H Miễn Phí</h4>
                    <p>Miễn phí giao hàng toàn quốc và hỗ trợ bảo hành 1 đổi 1 trong 30 ngày.</p>
                  </div>
                </div>
              </div>

              {/* Cam kết chân cột */}
              <div className="brand-trust-footer">
                <FaCheckCircle className="trust-check-icon" />
                <span>Cam kết 100% sản phẩm chính hãng, VAT đầy đủ</span>
              </div>
            </div>

            {/* CỘT PHẢI: Form xử lý đăng nhập */}
            <div className="login-form-col">
              <div className="form-header">
                <h1 className="form-title">Đăng Nhập</h1>
                <p className="form-subtitle">
                  Chưa có tài khoản?{" "}
                  <Link to="/register" className="highlight-link">
                    Đăng ký tài khoản mới &rsaquo;
                  </Link>
                </p>
              </div>

              {/* Nút đăng nhập thử nghiệm Demo tiện lợi */}
              <div className="quick-demo-accounts">
                <span className="demo-label">⚡ Đăng nhập nhanh thử nghiệm:</span>
                <div className="demo-btns-wrap">
                  <button
                    type="button"
                    className="demo-btn demo-admin"
                    onClick={() => fillDemoAccount("admin@gmail.com", "123456")}
                    title="Điền tài khoản Quản Trị Viên"
                  >
                    <FaUserShield className="demo-icon" /> Admin Demo
                  </button>
                  <button
                    type="button"
                    className="demo-btn demo-user"
                    onClick={() => fillDemoAccount("trongtho@gmail.com", "trongtho")}
                    title="Điền tài khoản Khách Hàng"
                  >
                    <FaUser className="demo-icon" /> Khách Hàng Demo
                  </button>
                </div>
              </div>

              {/* Biểu mẫu đăng nhập */}
              <form onSubmit={handleLogin} className="auth-form" noValidate>
                <div className="auth-input-group">
                  <label htmlFor="login-account" className="input-label">
                    Email, Số điện thoại hoặc Username
                  </label>
                  <div className="input-field-wrap">
                    <FaUser className="field-icon" />
                    <input
                      id="login-account"
                      type="text"
                      className="auth-input"
                      placeholder="Ví dụ: admin@gmail.com hoặc 0911..."
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
                      placeholder="Nhập mật khẩu của bạn"
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
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                  </label>
                </div>

                {/* Nút bấm Submit */}
                <button
                  type="submit"
                  className={`btn-auth-submit ${isLoading ? "is-loading" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="submit-loading-text">
                      <span className="spinner-dot" /> Đang xác thực...
                    </span>
                  ) : (
                    <>
                      Đăng Nhập Ngay <FaArrowRight className="submit-arrow" />
                    </>
                  )}
                </button>
              </form>

              {/* Phân cách hoặc mạng xã hội */}
              <div className="social-divider">
                <span>Hoặc tiếp tục với</span>
              </div>

              <div className="social-login-grid">
                <button
                  type="button"
                  className="social-btn google-btn"
                  disabled={isLoading}
                  onClick={() =>
                    toast.info(
                      "Đăng nhập Google: Vui lòng sử dụng tài khoản Demo hoặc đăng ký tài khoản trực tiếp!"
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
                      "Đăng nhập Facebook: Vui lòng sử dụng tài khoản Demo hoặc đăng ký tài khoản trực tiếp!"
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
      <Toaster position="top-right" richColors closeButton duration={3200} />
    </>
  );
};

export default Login;
