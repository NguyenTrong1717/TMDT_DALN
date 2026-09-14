import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";
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
  const [error, setError] = useState("");

  const checkResult = useCallback(async () => {
    if (!token) {
      setError("Không có mã tra cứu hợp lệ cho giao dịch này.");
      setLoading(false);
      return "error";
    }
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
    }
  }, [token]);

  useEffect(() => {
    let timer;
    let cancelled = false;
    const poll = async () => {
      const status = await checkResult();
      pollCount.current += 1;
      if (
        !cancelled &&
        status === "pending" &&
        pollCount.current < MAX_POLLS
      ) {
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
      setError("Bạn cần đăng nhập lại trước khi thanh toán lại.");
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
      if (!response.ok) throw new Error(data.error || "Không thể thanh toán lại.");
      window.location.assign(data.paymentUrl);
    } catch (retryError) {
      setError(retryError.message);
      setRetrying(false);
    }
  };

  const paid = result?.paymentStatus === "paid";
  const failed = result?.paymentStatus === "failed";

  return (
    <>
      <Header />
      <main className="payment-result-page">
        <section className={`payment-result-card ${paid ? "success" : failed ? "failed" : "pending"}`}>
          {paid ? (
            <FaCheckCircle className="payment-result-icon" />
          ) : failed || error ? (
            <FaExclamationTriangle className="payment-result-icon" />
          ) : (
            <FaClock className="payment-result-icon pulse" />
          )}

          <h1>
            {paid
              ? "Thanh toán thành công"
              : failed
                ? "Thanh toán chưa hoàn tất"
                : "Đang xác nhận thanh toán"}
          </h1>
          <p>
            {paid
              ? "IPN hợp lệ từ VNPAY đã được backend xác minh và ghi nhận."
              : failed
                ? "Giao dịch thử nghiệm không thành công. Bạn có thể tạo lần thanh toán mới."
                : "VNPAY có thể gửi IPN sau khi trình duyệt quay lại. Trang sẽ tự kiểm tra trong khoảng 40 giây."}
          </p>

          {result && (
            <div className="payment-result-summary">
              <div><span>Mã đơn</span><strong>{result.orderCode}</strong></div>
              <div><span>Số tiền</span><strong>{formatPrice(result.totalAmount)}</strong></div>
              <div><span>Phương thức</span><strong>VNPAY Sandbox</strong></div>
              <div><span>Trạng thái</span><strong>{result.paymentStatus}</strong></div>
            </div>
          )}
          {loading && <p className="payment-result-note">Đang kết nối backend...</p>}
          {error && <p className="payment-result-error">{error}</p>}

          <div className="payment-result-actions">
            {!paid && result?.canRetryPayment && (
              <button onClick={retryPayment} disabled={retrying}>
                <FaSyncAlt /> {retrying ? "Đang tạo giao dịch..." : "Thanh toán lại"}
              </button>
            )}
            {!paid && <button className="secondary" onClick={checkResult}>Kiểm tra lại</button>}
            <Link to="/orders">Xem đơn hàng</Link>
            <Link className="secondary" to="/">Về trang chủ</Link>
          </div>
        </section>
      </main>
      <FooterUser />
    </>
  );
};

export default PaymentResult;
