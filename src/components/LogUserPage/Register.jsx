import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// --- IMPORT THƯ VIỆN SONNER CAO CẤP ---
import { toast, Toaster } from "sonner";
import "./Register.css"; // Hãy chắc chắn bạn đã tạo hoặc có file CSS này
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";

import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
} from "react-icons/fa";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    // 1. Kiểm tra bỏ trống dữ liệu
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      toast.warning("Vui lòng nhập đầy đủ tất cả các trường thông tin!");
      return;
    }

    // 2. Kiểm tra độ dài mật khẩu (bảo mật cơ bản)
    if (password.length < 6) {
      toast.warning("Mật khẩu phải chứa ít nhất 6 ký tự!");
      return;
    }

    // 3. Kiểm tra xem mật khẩu nhập lại có khớp không
    if (password !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp! Vui lòng kiểm tra lại.");
      return;
    }

    setIsLoading(true);

    try {
      // Gọi lên json-server để kiểm tra trùng lặp tài khoản
      const response = await fetch("http://localhost:3000/users");
      if (!response.ok) throw new Error("Không thể kết nối đến server!");

      const users = await response.json();

      // 4. Kiểm tra xem Email hoặc Số điện thoại đã tồn tại chưa
      const isExist = users.some(
        (user) => user.email === email || user.phone === phone,
      );
      if (isExist) {
        toast.error(
          "Email hoặc Số điện thoại này đã được đăng ký trên hệ thống!",
        );
        setIsLoading(false);
        return;
      }

      // 5. Chuẩn bị dữ liệu để tạo User mới
      const newUser = {
        // json-server tự động sinh ID tăng dần nếu ta không truyền id, hoặc truyền id dạng chuỗi/số tự tăng
        id: String(Date.now()), // Tạo ID tạm thời duy nhất bằng timestamp
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password,
        role: "user", // Mặc định đăng ký mới luôn là tài khoản khách hàng (user)
        status: "active", // Trạng thái hoạt động bình thường
      };

      // Gửi yêu cầu POST lưu vào json-server
      const createResponse = await fetch("http://localhost:3000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (createResponse.ok) {
        // 6. Thông báo thành công rực rỡ bằng Sonner
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setConfirmPassword("");
        toast.success(" Đăng ký tài khoản thành công! Đang chuyển hướng...");

        // Đợi 1.5 giây để người dùng kịp nhìn thông báo rồi chuyển sang trang đăng nhập
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        toast.error("Có lỗi xảy ra từ máy chủ, không thể tạo tài khoản!");
      }
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      toast.error(
        "Lỗi kết nối Server mạng. Hãy chắc chắn json-server đang chạy!",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="login-page">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">
              <span>Trang chủ</span>
            </Link>
            <Link to="/register">
              <span>Đăng Ký</span>
            </Link>
          </div>
        </div>
        <div className="container">
          <div className="login-wrapper">
            {/* BÊN TRÁI: Giới thiệu quyền lợi khi làm thành viên */}
            <div className="login-left">
              <div className="login-overlay">
                <h2>Trở thành Thành Viên!</h2>
                <p className="welcome-text">
                  Đăng ký ngay hôm nay để nhận vô vàn đặc quyền độc quyền và ưu
                  đãi giảm giá bất ngờ.
                </p>
                <div className="feature-item">
                  <div className="feature-icon">
                    <FaUser />
                  </div>
                  <div>
                    <h4>Tài khoản cá nhân</h4>
                    <p>Quản lý lịch sử đơn hàng và lưu sản phẩm yêu thích.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h4>Tích điểm đổi quà</h4>
                    <p>
                      Mỗi đơn hàng đều được tích điểm thưởng quy đổi thành tiền
                      mặt.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BÊN PHẢI: Form xử lý Đăng Ký */}
            <div className="login-right">
              <h2>Tạo tài khoản</h2>
              <p className="register-link">
                Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
              </p>

              <form onSubmit={handleRegister}>
                {/* Ô NHẬP HỌ TÊN */}
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <div className="input-group">
                    <FaUser className="input-icon" />
                    <input
                      type="text"
                      placeholder="Nhập họ và tên của bạn"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Ô NHẬP EMAIL */}
                <div className="form-group">
                  <label>Địa chỉ Email *</label>
                  <div className="input-group">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="email"
                      placeholder="Nhập địa chỉ email (ví dụ: nam@gmail.com)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Ô NHẬP SỐ ĐIỆN THOẠI */}
                <div className="form-group">
                  <label>Số điện thoại *</label>
                  <div className="input-group">
                    <FaPhone className="input-icon" />
                    <input
                      type="text"
                      placeholder="Nhập số điện thoại"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Ô NHẬP MẬT KHẨU */}
                <div className="form-group">
                  <label>Mật khẩu (Tối thiểu 6 ký tự) *</label>
                  <div className="input-group">
                    <FaLock className="input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Tạo mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <span
                      className="eyes-icon"
                      onClick={() =>
                        !isLoading && setShowPassword(!showPassword)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>

                {/* Ô NHẬP LẠI MẬT KHẨU */}
                <div className="form-group">
                  <label>Nhập lại mật khẩu *</label>
                  <div className="input-group">
                    <FaLock className="input-icon" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Xác nhận lại mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <span
                      className="eye-icon"
                      onClick={() =>
                        !isLoading &&
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="login-btn"
                  style={{ marginTop: "10px" }}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Đang xử lý tạo tài khoản..."
                    : "Đăng ký thành viên"}
                </button>
              </form>
            </div>
          </div>
        </div>
        <Sevicer />
      </div>
      <FooterUser />

      {/*ĐỂ SONNER HIỂN THỊ */}
      <Toaster position="top-right" richColors closeButton duration={3000} />
    </>
  );
};

export default Register;
