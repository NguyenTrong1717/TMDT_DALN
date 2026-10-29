import { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaEnvelope, FaHeadset, FaShieldAlt } from "react-icons/fa";
import { toast } from "sonner";
import Header from "../Header/Header";
import FooterUser from "../Footer/FooterUser";
import { apiFetch, readJson } from "../../utils/api";
import "./AccountSecurity.css";

const ForgotPassword = () => {
  const [account, setAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!account.trim()) {
      toast.warning("Vui lòng nhập email hoặc số điện thoại đã đăng ký.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ account: account.trim() }),
      });
      const data = await readJson(response, "Không thể gửi yêu cầu khôi phục.");
      setSubmitted(true);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.message || "Không thể gửi yêu cầu khôi phục.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="security-page">
        <div className="security-shell security-shell--narrow">
          <nav className="security-breadcrumb" aria-label="breadcrumb">
            <Link to="/login">Đăng nhập</Link>
            <span>/</span>
            <strong>Quên mật khẩu</strong>
          </nav>
          <section className="security-card security-card--single">
            <div className="security-intro">
              {submitted ? (
                <FaHeadset className="security-hero-icon" />
              ) : (
                <FaShieldAlt className="security-hero-icon" />
              )}
              <span className="security-kicker">HỖ TRỢ TÀI KHOẢN</span>
              <h1>
                {submitted ? "Yêu cầu đã được tiếp nhận" : "Khôi phục mật khẩu"}
              </h1>
              <p>
                {submitted
                  ? "Nếu thông tin khớp với tài khoản, bộ phận hỗ trợ sẽ liên hệ để xác minh danh tính và giúp bạn đặt lại mật khẩu."
                  : "Nhập email hoặc số điện thoại đã đăng ký. Vì lý do bảo mật, HCore sẽ xác minh danh tính trước khi hỗ trợ đặt lại mật khẩu."}
              </p>
            </div>
            {!submitted ? (
              <form className="security-form" onSubmit={handleSubmit}>
                <div className="security-field">
                  <label htmlFor="recovery-account">Email hoặc số điện thoại</label>
                  <div className="security-input-wrap">
                    <FaEnvelope aria-hidden="true" />
                    <input
                      id="recovery-account"
                      type="text"
                      value={account}
                      onChange={(event) => setAccount(event.target.value)}
                      autoComplete="username"
                      placeholder="email@example.com hoặc 09xxxxxxxx"
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="security-primary security-primary--full"
                  disabled={submitting}
                >
                  {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu hỗ trợ"}
                </button>
              </form>
            ) : (
              <div className="security-complete-actions">
                <Link to="/login" className="security-primary">
                  <FaArrowLeft /> Quay lại đăng nhập
                </Link>
                <Link to="/lien-he" className="security-secondary">
                  Xem thông tin liên hệ
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
      <FooterUser />
    </>
  );
};

export default ForgotPassword;
