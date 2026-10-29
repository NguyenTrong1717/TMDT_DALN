import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaLock, FaShieldAlt } from "react-icons/fa";
import { toast } from "sonner";
import Header from "../Header/Header";
import FooterUser from "../Footer/FooterUser";
import { apiFetch, getCurrentUser, readJson } from "../../utils/api";
import "./AccountSecurity.css";

const ChangePassword = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser) return <Navigate to="/login" replace />;

  const updateField = (field, value) =>
    setForm((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.warning("Vui lòng nhập đầy đủ các trường mật khẩu.");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.warning("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await readJson(response, "Không thể đổi mật khẩu.");
      toast.success(data.message || "Đổi mật khẩu thành công.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => navigate("/profile"), 800);
    } catch (error) {
      toast.error(error.message || "Không thể đổi mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  const passwordField = (name, label, visibleKey, autoComplete) => (
    <div className="security-field">
      <label htmlFor={name}>{label}</label>
      <div className="security-input-wrap">
        <FaLock aria-hidden="true" />
        <input
          id={name}
          type={visible[visibleKey] ? "text" : "password"}
          value={form[name]}
          onChange={(event) => updateField(name, event.target.value)}
          autoComplete={autoComplete}
          disabled={submitting}
          required
        />
        <button
          type="button"
          className="security-toggle"
          onClick={() =>
            setVisible((previous) => ({
              ...previous,
              [visibleKey]: !previous[visibleKey],
            }))
          }
          aria-label={visible[visibleKey] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible[visibleKey] ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <main className="security-page">
        <div className="security-shell">
          <nav className="security-breadcrumb" aria-label="breadcrumb">
            <Link to="/profile">Hồ sơ</Link>
            <span>/</span>
            <strong>Đổi mật khẩu</strong>
          </nav>
          <section className="security-card">
            <div className="security-intro">
              <FaShieldAlt className="security-hero-icon" />
              <span className="security-kicker">BẢO MẬT TÀI KHOẢN</span>
              <h1>Đổi mật khẩu</h1>
              <p>
                Xác minh mật khẩu hiện tại trước khi thiết lập mật khẩu mới. Các
                phiên đăng nhập khác sẽ được đăng xuất.
              </p>
            </div>
            <form className="security-form" onSubmit={handleSubmit}>
              {passwordField(
                "currentPassword",
                "Mật khẩu hiện tại",
                "current",
                "current-password",
              )}
              {passwordField(
                "newPassword",
                "Mật khẩu mới",
                "next",
                "new-password",
              )}
              {passwordField(
                "confirmPassword",
                "Nhập lại mật khẩu mới",
                "confirm",
                "new-password",
              )}
              <p className="security-hint">
                Mật khẩu cần từ 6 ký tự và nên khác với mật khẩu đang sử dụng.
              </p>
              <div className="security-actions">
                <Link to="/profile" className="security-secondary">
                  Quay lại
                </Link>
                <button
                  type="submit"
                  className="security-primary"
                  disabled={submitting}
                >
                  {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
      <FooterUser />
    </>
  );
};

export default ChangePassword;
