import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTimesCircle,
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromReturn = searchParams.get("token");
  const resultCodeParam = searchParams.get("resultCode");
  const responseCodeParam = searchParams.get("responseCode");
  const messageParam = searchParams.get("message");
  const token =
    tokenFromReturn ||
    localStorage.getItem("pendingPaymentLookupToken") ||
    "";

  const isCancelledByGateway =
    (resultCodeParam !== null && Number(resultCodeParam) !== 0) ||
    (responseCodeParam !== null && responseCodeParam !== "00");

  const [manuallyStopped, setManuallyStopped] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const pollCount = useRef(0);
  const [currentPoll, setCurrentPoll] = useState(0);
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
      const count = pollCount.current + 1;
      pollCount.current = count;
      setCurrentPoll(count);
      setCountdown(Math.max(0, (MAX_POLLS - count) * 2));

      // Dừng vòng lặp ngay khi phát hiện người dùng đã hủy hoặc không còn pending
      if (isCancelledByGateway || manuallyStopped || status !== "pending") {
        return;
      }

      if (count < MAX_POLLS && !cancelled) {
        timer = setTimeout(poll, 2000);
      } else if (count >= MAX_POLLS) {
        setPollTimedOut(true);
      }
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkResult, isCancelledByGateway, manuallyStopped]);

  const handleStopWaiting = () => {
    setManuallyStopped(true);
    localStorage.removeItem("pendingPaymentLookupToken");
  };

  useEffect(() => {
    if (!paid) return;
    if (redirectCountdown <= 0) {
      navigate("/orders");
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [paid, redirectCountdown, navigate]);

  const retryPayment = async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || !result?.id) {
      setError("Bạn cần đăng nhập lại trước khi thử thanh toán.");
      return;
    }
    setRetrying(true);
    setError("");
    try {
      const method = result?.paymentMethod === "momo" ? "momo" : "vnpay";
      const response = await fetch(`${API_URL}/api/orders/${result.id}/${method}/retry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({ lookupToken: token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể khởi tạo lại thanh toán.");
      if (data.lookupToken) {
        localStorage.setItem("pendingPaymentLookupToken", data.lookupToken);
      }
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

  const paid = result?.paymentStatus === "paid" && !isCancelledByGateway;
  const isCancelled = isCancelledByGateway || manuallyStopped;
  const isFailed = result?.paymentStatus === "failed";
  const failed = isFailed || isCancelled || pollTimedOut;
  const isPending = !paid && !failed;

  const canRetry =
    !paid &&
    (result?.canRetryPayment ||
      Boolean(result?.id && ["vnpay", "momo"].includes(result?.paymentMethod)));

  const statusClass = paid ? "status-success" : failed ? "status-failed" : "status-pending";

  let titleText = "Đang xác nhận thanh toán...";
  let descText = `Hệ thống đang đồng bộ kết quả xác thực từ cổng ${result?.paymentMethod === "momo" ? "MoMo" : "VNPAY"}. Vui lòng chờ trong giây lát.`;

  if (paid) {
    titleText = "Thanh toán thành công!";
    descText = `Đơn hàng của bạn đã được thanh toán thành công! Tự động chuyển tới trang Đơn hàng sau ${redirectCountdown}s...`;
  } else if (isCancelled) {
    titleText = "Giao dịch đã bị hủy";
    descText =
      messageParam ||
      "Bạn đã hủy giao dịch tại cổng thanh toán hoặc đã dừng chờ xác nhận. Số tiền trong tài khoản của bạn chưa bị trừ.";
  } else if (pollTimedOut) {
    titleText = "Chưa nhận được kết quả thanh toán";
    descText =
      "Đã hết thời gian tự động đồng bộ kết quả. Nếu bạn đã hoàn tất trừ tiền trên ứng dụng, hệ thống sẽ tự cập nhật đơn qua Webhook IPN sau ít phút. Bạn cũng có thể bấm 'Kiểm tra lại' hoặc 'Thanh toán lại'.";
  } else if (isFailed) {
    titleText = "Thanh toán chưa hoàn tất";
    descText =
      messageParam ||
      "Giao dịch thanh toán chưa thành công. Bạn có thể thử thanh toán lại hoặc chọn hình thức COD.";
  }

  let statusBadgeText = "Chờ xác nhận";
  if (paid) {
    statusBadgeText = "Đã thanh toán";
  } else if (isCancelled) {
    statusBadgeText = "Đã hủy";
  } else if (failed) {
    statusBadgeText = "Thất bại";
  }

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
            ) : isCancelled ? (
              <div className="icon-glow glow-failed">
                <FaTimesCircle className="payment-result-icon" />
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
          <h1 className="payment-result-title">{titleText}</h1>
          <p className="payment-result-desc">{descText}</p>

          {/* Countdown & Polling Bar (chỉ hiện khi đang chờ xác minh) */}
          {isPending && (
            <div className="polling-indicator">
              <div className="polling-bar">
                <div
                  className="polling-progress"
                  style={{
                    width: `${Math.min(100, (currentPoll / MAX_POLLS) * 100)}%`,
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
                    <FaCreditCard className="me-1" />
                    {result.paymentMethod === "momo"
                      ? "Ví MoMo Sandbox"
                      : result.paymentMethod === "vnpay"
                        ? "VNPAY Sandbox"
                        : "Tiền mặt (COD)"}
                  </span>
                </div>

                <div className="receipt-row">
                  <span className="row-label">Trạng thái thanh toán</span>
                  <span className={`status-pill ${statusClass}`}>
                    <span className="status-dot" />
                    {statusBadgeText}
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
              <>
                <button
                  type="button"
                  className="btn-action btn-refresh"
                  onClick={checkResult}
                  disabled={checking}
                >
                  <FaSyncAlt className={checking ? "spin" : ""} />
                  {checking ? "Đang kiểm tra..." : "Kiểm tra lại"}
                </button>
                <button
                  type="button"
                  className="btn-action btn-stop-waiting"
                  onClick={handleStopWaiting}
                >
                  <FaTimesCircle /> Dừng chờ
                </button>
              </>
            )}

            {!paid && canRetry && (
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

            {!paid && !isPending && (
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

            <Link to="/orders" className="btn-action btn-primary-action">
              <FaBox /> {paid ? `Xem đơn hàng ngay (${redirectCountdown}s)` : "Xem đơn hàng"}
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
