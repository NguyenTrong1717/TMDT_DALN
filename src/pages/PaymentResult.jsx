import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaSyncAlt,
  FaCopy,
  FaCheck,
  FaHome,
  FaBox,
  FaCreditCard,
} from "react-icons/fa";
import Header from "../components/Header/Header";
import FooterUser from "../components/Footer/FooterUser";
import "./PaymentResult.css";

const API_URL = "http://127.0.0.1:3000";
const MAX_POLLS = 20;

const formatPrice = (amount) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(amount) || 0,
  );

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const tokenFromReturn = searchParams.get("token");
  const token =
    tokenFromReturn ||
    (searchParams.has("returned")
      ? ""
      : localStorage.getItem("pendingPaymentLookupToken") || "");

  const pollCount = useRef(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(40);

  const checkResult = useCallback(async () => {
    if (!token) {
      setError("Không tìm thấy mã tra cứu hợp lệ cho giao dịch này.");
      setLoading(false);
      return "error";
    }
    setChecking(true);
    try {
      const response = await fetch(
        `${API_URL}/api/payments/result/${encodeURIComponent(token)}`,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể kiểm tra giao dịch.");
      setResult(data);
      setError("");
      if (data.paymentStatus === "paid") {
        localStorage.removeItem("pendingPaymentLookupToken");
      }
      return data.paymentStatus;
    } catch (fetchError) {
      setError(fetchError.message);
      return "error";
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [token]);

  useEffect(() => {
    let timer;
    let cancelled = false;
    const poll = async () => {
      const status = await checkResult();
      pollCount.current += 1;
      setCountdown(Math.max(0, (MAX_POLLS - pollCount.current) * 2));
      if (!cancelled && status === "pending" && pollCount.current < MAX_POLLS) {
        timer = setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkResult]);

  const retryPayment = async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || !result?.id) {
      setError("Bạn cần đăng nhập lại trước khi thử thanh toán.");
      return;
    }
    setRetrying(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/orders/${result.id}/vnpay/retry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({ lookupToken: token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể khởi tạo lại thanh toán.");
      window.location.assign(data.paymentUrl);
    } catch (retryError) {
      setError(retryError.message);
      setRetrying(false);
    }
  };

  const copyOrderCode = () => {
    if (!result?.orderCode) return;
    navigator.clipboard.writeText(result.orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paid = result?.paymentStatus === "paid";
  const failed = result?.paymentStatus === "failed";
  const isPending = !paid && !failed;

  const statusClass = paid ? "status-success" : failed ? "status-failed" : "status-pending";

  return (
    <div className="payment-result-wrapper">
      <Header />
      <main className="payment-result-page">
        <section className={`payment-result-card ${statusClass}`}>
          {/* Header Icon */}
          <div className="payment-result-icon-box">
            {paid ? (
              <div className="icon-glow glow-success">
                <FaCheckCircle className="payment-result-icon" />
              </div>
            ) : failed || error ? (
              <div className="icon-glow glow-failed">
                <FaExclamationTriangle className="payment-result-icon" />
              </div>
            ) : (
              <div className="icon-glow glow-pending">
                <FaClock className="payment-result-icon spin-slow" />
              </div>
            )}
          </div>

          {/* Title & Message */}
          <h1 className="payment-result-title">
            {paid
              ? "Thanh toán thành công!"
              : failed
                ? "Thanh toán chưa hoàn tất"
                : "Đang xác nhận thanh toán..."}
          </h1>
          <p className="payment-result-desc">
            {paid
              ? "Đơn hàng của bạn đã được ghi nhận thanh toán thành công và đang được chuẩn bị để giao tới bạn."
              : failed
                ? "Giao dịch thanh toán thử nghiệm chưa thành công. Bạn có thể thử thanh toán lại hoặc chọn hình thức COD."
                : "Hệ thống đang đồng bộ kết quả xác thực từ cổng VNPAY. Vui lòng chờ trong giây lát."}
          </p>

          {/* Countdown & Polling Bar */}
          {isPending && (
            <div className="polling-indicator">
              <div className="polling-bar">
                <div
                  className="polling-progress"
                  style={{
                    width: `${Math.min(100, (pollCount.current / MAX_POLLS) * 100)}%`,
                  }}
                />
              </div>
              <span className="polling-text">
                {checking
                  ? "Đang kiểm tra kết quả..."
                  : countdown > 0
                    ? `Đang tự động xác minh (${countdown}s)`
                    : "Hết thời gian chờ tự động"}
              </span>
            </div>
          )}

          {/* Details Ticket Box */}
          {result && (
            <div className="payment-receipt-box">
              <div className="receipt-header">
                <span className="receipt-tag">Chi tiết giao dịch</span>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={copyOrderCode}
                  title="Sao chép mã đơn"
                >
                  {copied ? (
                    <>
                      <FaCheck className="text-success" /> Đã sao chép
                    </>
                  ) : (
                    <>
                      <FaCopy /> Sao chép mã
                    </>
                  )}
                </button>
              </div>

              <div className="receipt-rows">
                <div className="receipt-row">
                  <span className="row-label">Mã đơn hàng</span>
                  <span className="row-value font-mono font-bold">{result.orderCode}</span>
                </div>

                <div className="receipt-row">
                  <span className="row-label">Tổng số tiền</span>
                  <span className="row-value price-highlight">
                    {formatPrice(result.totalAmount)}
                  </span>
                </div>

                <div className="receipt-row">
                  <span className="row-label">Phương thức thanh toán</span>
                  <span className="row-value badge-method">
                    <FaCreditCard className="me-1" /> VNPAY Sandbox
                  </span>
                </div>

                <div className="receipt-row">
                  <span className="row-label">Trạng thái thanh toán</span>
                  <span className={`status-pill ${statusClass}`}>
                    <span className="status-dot" />
                    {paid
                      ? "Đã thanh toán"
                      : failed
                        ? "Thất bại"
                        : "Chờ xác nhận"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="payment-loading-state">
              <FaSyncAlt className="spin me-2" /> Đang kết nối máy chủ...
            </div>
          )}
          {error && <div className="payment-error-alert">{error}</div>}

          {/* Action Buttons */}
          <div className="payment-action-buttons">
            {isPending && (
              <button
                type="button"
                className="btn-action btn-refresh"
                onClick={checkResult}
                disabled={checking}
              >
                <FaSyncAlt className={checking ? "spin" : ""} />
                {checking ? "Đang kiểm tra..." : "Kiểm tra lại"}
              </button>
            )}

            {!paid && result?.canRetryPayment && (
              <button
                type="button"
                className="btn-action btn-retry"
                onClick={retryPayment}
                disabled={retrying}
              >
                <FaCreditCard />
                {retrying ? "Đang xử lý..." : "Thanh toán lại"}
              </button>
            )}

            <Link to="/orders" className="btn-action btn-primary-action">
              <FaBox /> Xem đơn hàng
            </Link>

            <Link to="/" className="btn-action btn-secondary-action">
              <FaHome /> Về trang chủ
            </Link>
          </div>
        </section>
      </main>
      <FooterUser />
    </div>
  );
};

export default PaymentResult;
