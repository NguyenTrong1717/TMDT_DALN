import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { FaBoxOpen, FaCalendarAlt } from "react-icons/fa";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import "./UserOrders.css";
import { API_URL, apiFetch, getCurrentUser, readJson } from "../../utils/api";


const UserOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingOrderId, setSubmittingOrderId] = useState(null);

  const fetchOrders = async () => {
    try {
      const [res, returnsRes] = await Promise.all([apiFetch(`/api/orders/mine`), apiFetch(`/api/returns`)]);
      if (!res.ok || !returnsRes.ok) throw new Error("Không thể tải danh sách đơn hàng/trả hàng.");
      const [data, returnsData] = await Promise.all([res.json(), returnsRes.json()]);
      setOrders(data.reverse());
      setReturnRequests(Array.isArray(returnsData) ? returnsData : []);
    } catch (error) {
      toast.error(error.message || "Có lỗi xảy ra khi kết nối server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = getCurrentUser();
    if (!storedUser) {
      navigate("/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [navigate]);

  // Hàm hiển thị tiền tệ VND chuẩn
  const formatPrice = (price) => {
    const safePrice = Number(price) || 0;
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(safePrice);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Không rõ ngày";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStatus = (status) => {
    switch (status) {
      case "pending":
        return <span className="status-badge pending"> Chờ xử lý</span>;
      case "confirmed":
        return <span className="status-badge confirmed"> Đã xác nhận</span>;
      case "shipping":
        return <span className="status-badge shipping"> Đang giao hàng</span>;
      case "delivered":
        return <span className="status-badge completed"> Đã giao hàng</span>;
      case "completed":
        return <span className="status-badge completed"> Đã hoàn thành</span>;
      case "cancelled":
        return <span className="status-badge cancelled"> Đã hủy</span>;
      default:
        return <span className="status-badge">{status || "Không xác định"}</span>;
    }
  };

  const paymentMethodLabel = (method) =>
    ({ cod: "COD", bank: "VietQR", momo: "MoMo", vnpay: "VNPAY Sandbox" })[
      method
    ] || method || "Chưa xác định";

  const paymentStatusLabel = (status) =>
    ({ unpaid: "Chưa thanh toán", pending: "Đang chờ", paid: "Đã thanh toán", failed: "Thất bại" })[
      status
    ] || status || "Chưa xác định";

  const handleRetryPayment = async (order) => {
    try {
      const method = order.paymentMethod === "momo" ? "momo" : "vnpay";
      const response = await apiFetch(`${API_URL}/api/orders/${order.id}/${method}/retry`, {
        method: "POST",
        body: JSON.stringify({ lookupToken: order.lookupToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể thanh toán lại.");
      localStorage.setItem("pendingPaymentLookupToken", order.lookupToken);
      window.location.assign(data.paymentUrl);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCancellationRequest = async (order) => {
    const reason = window.prompt("Nhập lý do yêu cầu hủy đơn:", "")?.trim();
    if (!reason) return;
    try {
      const response = await apiFetch(`/api/orders/${order.id}/cancellation-request`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể gửi yêu cầu hủy.");
      toast.success("Đã gửi yêu cầu hủy. Nhân viên sẽ kiểm tra trạng thái thanh toán trước khi xử lý.");
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReturnRequest = async (order) => {
    const reason = window.prompt("Nhập lý do trả hàng (ít nhất 5 ký tự):", "")?.trim();
    if (!reason) return;
    const amountText = window.prompt("Nhập số tiền đề nghị hoàn (VND, phải lớn hơn 0):", "")?.trim();
    const requestedAmount = Number(amountText);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      toast.error("Số tiền đề nghị phải là số lớn hơn 0.");
      return;
    }
    const items = (order.products || []).map((item) => ({
      productId: item.productId,
      fromTable: item.fromTable,
      variantId: item.variantId || null,
      quantity: item.quantity,
    }));
    if (!items.length) {
      toast.error("Đơn hàng không có mặt hàng hợp lệ để tạo yêu cầu trả.");
      return;
    }
    setSubmittingOrderId(order.id);
    try {
      await readJson(await apiFetch(`/api/orders/${order.id}/returns`, {
        method: "POST",
        body: JSON.stringify({
          requestId: `customer_return_${order.id}_${Date.now()}`,
          reason,
          requestedAmount,
          items,
        }),
      }), "Không thể gửi yêu cầu trả hàng.");
      toast.success("Đã tạo yêu cầu trả hàng. Đây chưa phải xác nhận hoàn tiền; nhân viên sẽ tiếp nhận và kiểm tra hàng.");
      await fetchOrders();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmittingOrderId(null);
    }
  };

  if (loading)
    return <div className="user-orders-loading">Đang tải đơn hàng của bạn...</div>;

  return (
    <>
      <Header />

      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link to="/profile">
            <span>Hồ sơ cá nhân</span>
          </Link>
          <span className="demo-bread-current">Đơn hàng của tôi</span>
        </div>

        <div className="container">
          <div className="orders-page-wrapper">
            {/* <h2> ĐƠN HÀNG CỦA TÔI</h2> */}
            {orders.length === 0 ? (
              <div className="empty-orders">
                <FaBoxOpen className="empty-icon" />
                <h3>Bạn chưa có đơn hàng nào!</h3>
                <p>Hãy lấp đầy giỏ hàng bằng những siêu phẩm công nghệ nhé.</p>
                <button className="primary-btn" onClick={() => navigate("/")}>
                  Mua sắm ngay
                </button>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => {
                  const returnRequest = returnRequests.find((item) => String(item.orderId) === String(order.id));
                  return (
                  <div key={order.id} className="order-card">
                    {/* Header đơn hàng */}
                    <div className="order-header">
                      <div>
                        <span className="order-id">
                          Mã đơn: {order.orderCode || order.id}
                        </span>
                        <span className="order-date">
                          <FaCalendarAlt /> {formatDate(order.createdAt)}
                        </span>
                      </div>
                      {renderStatus(order.status)}
                    </div>

                    <div className="order-payment-info">
                      <span>Phương thức: <strong>{paymentMethodLabel(order.paymentMethod)}</strong></span>
                      <span className={`payment-status ${order.paymentStatus}`}>
                        Thanh toán: <strong>{paymentStatusLabel(order.paymentStatus)}</strong>
                      </span>
                      {order.canRetryPayment && (
                        <button onClick={() => handleRetryPayment(order)}>
                          Thanh toán lại
                        </button>
                      )}
                      {["pending", "confirmed"].includes(order.status) && order.cancellationRequest?.status !== "requested" && (
                        <button onClick={() => handleCancellationRequest(order)}>Yêu cầu hủy</button>
                      )}
                      {order.cancellationRequest?.status === "requested" && <span>Đang chờ xử lý yêu cầu hủy</span>}
                      {["delivered", "completed"].includes(order.status) && !["requested", "approved", "processing"].includes(returnRequest?.status) && (
                        <button disabled={submittingOrderId === order.id} onClick={() => handleReturnRequest(order)}>
                          {submittingOrderId === order.id ? "Đang gửi..." : "Yêu cầu trả hàng"}
                        </button>
                      )}
                    </div>

                    {returnRequest && (
                      <div className="order-payment-info">
                        <strong>Yêu cầu trả hàng: {returnRequest.status}</strong>
                        <span>Đề nghị hoàn: {formatPrice(returnRequest.requestedAmount)}</span>
                        <span>{returnRequest.reason}</span>
                        {returnRequest.restockedAt && <span>Kho đã nhận lại {returnRequest.restockedQuantity} sản phẩm đủ điều kiện.</span>}
                        {returnRequest.manualRefund?.confirmedAt && <span>Đã ghi nhận chứng từ hoàn thủ công: {returnRequest.manualRefund.reference}</span>}
                      </div>
                    )}

                    {/* Danh sách sản phẩm */}
                    <div className="order-items">
                      {order.products?.map((item, index) => {
                        // Trích xuất chính xác theo cấu trúc db.json của bạn
                        const itemPrice = Number(item.unitPrice) || 0;
                        const itemQty = Number(item.quantity) || 1;

                        return (
                          <div key={index} className="order-item-row">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="order-item-img"
                            />
                            <div className="order-item-info">
                              <h4>{item.name}</h4>
                              <p>Số lượng: x{itemQty}</p>
                            </div>
                            <span className="order-item-price">
                              {formatPrice(itemPrice * itemQty)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer đơn hàng */}
                    <div className="order-footer">
                      <div className="delivery-info">
                        <p>
                          <strong>Người nhận:</strong> {order.customerName} -{" "}
                          {order.phone}
                        </p>
                        <p>
                          <strong>Địa chỉ giao:</strong> {order.address}
                        </p>
                        {order.note && (
                          <p>
                            <strong>Ghi chú:</strong> {order.note}
                          </p>
                        )}
                      </div>
                      <div className="total-box">
                        <span>Tổng tiền thanh toán:</span>
                        <strong className="final-total">
                          {formatPrice(order.totalAmount)}
                        </strong>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Sevicer />
      </div>

      <FooterUser />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
};

export default UserOrders;
