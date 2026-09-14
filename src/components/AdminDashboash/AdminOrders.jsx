import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { createNotification } from "../../utils/notify";
import {
  FaShoppingBag,
  FaUser,
  FaCheck,
  FaTruck,
  FaTrash,
  FaBan,
  FaSearch,
  FaCopy,
  FaCalendarAlt,
  FaEnvelope,
  FaStickyNote,
} from "react-icons/fa";
import "./AdminOrders.css";

const API_URL = "http://127.0.0.1:3000";

const STATUS_LABEL = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const PAYMENT_METHODS = [
  { value: "all", label: "Tất cả thanh toán" },
  { value: "cod", label: "COD (Khi nhận hàng)" },
  { value: "vnpay", label: "VNPAY Sandbox" },
  { value: "bank", label: "Chuyển khoản VietQR" },
  { value: "momo", label: "Ví MoMo" },
];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/orders`, {
        headers: { "x-user-id": String(currentUser?.id || "") },
      });
      if (!response.ok) throw new Error("Không thể lấy danh sách đơn hàng.");
      const data = await response.json();
      setOrders(Array.isArray(data) ? data.reverse() : []); // Sắp xếp đơn mới nhất lên đầu
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tải danh sách đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (
      newStatus === "cancelled" &&
      !window.confirm("Bạn có chắc chắn muốn HỦY đơn hàng này?")
    )
      return;
    try {
      const response = await fetch(
        `${API_URL}/api/admin/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser?.id || ""),
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (response.ok) {
        toast.success(
          newStatus === "cancelled"
            ? "Đã hủy đơn hàng!"
            : "Cập nhật trạng thái thành công!",
        );

        // Báo cho khách hàng biết đơn hàng của họ vừa đổi trạng thái
        const order = orders.find((o) => o.id === orderId);
        if (order?.userId) {
          const products = order.products || [];
          const firstProduct = products[0];
          const productName =
            firstProduct?.name || `Sản phẩm #${firstProduct?.productId}`;
          const hasMore = products.length > 1;

          const productImage =
            firstProduct?.image &&
            (firstProduct.image.startsWith("http") ||
              firstProduct.image.startsWith("data:") ||
              firstProduct.image.startsWith("/images"))
              ? firstProduct.image
              : null;

          createNotification({
            userId: order.userId,
            type: "order",
            title: `Đơn ${productName}${hasMore ? " và các sản phẩm khác" : ""} đã cập nhật`,
            message: `Đơn hàng của bạn hiện đang ở trạng thái "${STATUS_LABEL[newStatus] || newStatus}".`,
            link: "/orders",
            image: productImage,
          });
        }
        fetchOrders();
      } else {
        toast.error("Không thể cập nhật trạng thái.");
      }
    } catch {
      toast.error("Có lỗi xảy ra.");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (
      !window.confirm(
        "CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng này khỏi hệ thống?",
      )
    )
      return;
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        method: "DELETE",
        headers: { "x-user-id": String(currentUser?.id || "") },
      });

      if (response.ok) {
        toast.success("Xóa vĩnh viễn đơn hàng thành công!");
        fetchOrders();
      } else {
        toast.error(`Không thể xóa đơn hàng. (status ${response.status})`);
        fetchOrders();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Có lỗi xảy ra khi xóa.");
      fetchOrders();
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    toast.success(`Đã sao chép ${label}: ${text}`);
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);

  const paymentMethodLabel = (method) =>
    ({
      cod: "Thanh toán khi nhận hàng (COD)",
      bank: "Chuyển khoản VietQR",
      momo: "Ví điện tử MoMo",
      vnpay: "Thanh toán VNPAY Sandbox",
    })[method] ||
    method ||
    "Chưa xác định";

  const paymentStatusLabel = (status) =>
    ({
      unpaid: "Chưa thanh toán",
      pending: "Chờ xác nhận",
      paid: "Đã thanh toán",
      failed: "Thất bại",
    })[status] ||
    status ||
    "Chưa xác định";

  const getCountByStatus = (status) =>
    status === "all"
      ? orders.length
      : orders.filter((o) => o.status === status).length;

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();
    return orders.filter((order) => {
      const matchStatus =
        activeTab === "all" ? true : order.status === activeTab;
      const matchPayment =
        paymentFilter === "all" ? true : order.paymentMethod === paymentFilter;

      const matchSearch =
        !keyword ||
        order.orderCode?.toLowerCase().includes(keyword) ||
        order.customerName?.toLowerCase().includes(keyword) ||
        order.phone?.toLowerCase().includes(keyword) ||
        order.email?.toLowerCase().includes(keyword) ||
        order.address?.toLowerCase().includes(keyword) ||
        order.id?.toString().includes(keyword);

      return matchStatus && matchPayment && matchSearch;
    });
  }, [orders, activeTab, paymentFilter, searchTerm]);

  const totalFilteredRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      const amount =
        order.totalAmount > 0
          ? order.totalAmount
          : (order.products || []).reduce(
              (pSum, p) => pSum + (p.unitPrice || 0) * (p.quantity || 1),
              0,
            );
      return sum + amount;
    }, 0);
  }, [filteredOrders]);

  if (loading)
    return <div className="loading-box">Đang tải danh sách đơn hàng...</div>;

  return (
    <div className="admin-orders-page">
      <div className="admin-orders-header-row">
        <div>
          <h2 className="admin-title">
            <FaShoppingBag /> QUẢN LÝ ĐƠN HÀNG
          </h2>
          <p className="admin-orders-subtitle">
            Theo dõi, xác nhận, phân loại và xử lý đơn hàng trên toàn hệ thống
          </p>
        </div>

        <div className="orders-summary-badge">
          <span>
            Hiển thị: <strong>{filteredOrders.length}</strong> / {orders.length} đơn
          </span>
          <span>
            Tổng giá trị: <strong>{formatPrice(totalFilteredRevenue)}</strong>
          </span>
        </div>
      </div>

      {/* TABS TRẠNG THÁI ĐƠN HÀNG */}
      <div className="admin-order-tabs">
        {[
          "all",
          "pending",
          "confirmed",
          "shipping",
          "completed",
          "cancelled",
        ].map((tab) => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "all" && "Tất cả"}
            {tab === "pending" && "Chờ xử lý"}
            {tab === "confirmed" && "Đã xác nhận"}
            {tab === "shipping" && "Đang giao"}
            {tab === "completed" && "Hoàn thành"}
            {tab === "cancelled" && "Đã hủy"}
            {` (${getCountByStatus(tab)})`}
          </button>
        ))}
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="admin-orders-toolbar">
        <div className="admin-orders-search">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, người nhận, SĐT, email hoặc địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>

        <div className="admin-orders-filters">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="payment-select"
          >
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm.value} value={pm.value}>
                {pm.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <FaSearch className="no-orders-icon" />
          <h4>Không tìm thấy đơn hàng nào</h4>
          <p>Không có đơn hàng nào khớp với điều kiện tìm kiếm hoặc trạng thái đang chọn.</p>
          {(searchTerm || paymentFilter !== "all" || activeTab !== "all") && (
            <button
              type="button"
              className="btn-reset-orders"
              onClick={() => {
                setSearchTerm("");
                setPaymentFilter("all");
                setActiveTab("all");
              }}
            >
              Đặt lại tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="orders-card-container">
          {filteredOrders.map((order) => {
            const orderTotal =
              order.totalAmount > 0
                ? order.totalAmount
                : (order.products || []).reduce(
                    (sum, p) => sum + (p.unitPrice || 0) * (p.quantity || 1),
                    0,
                  );

            return (
              <div className="order-card" key={order.id}>
                {/* Header */}
                <div className="order-card-header">
                  <div>
                    <div className="order-code-row">
                      <h3 className="order-code">#{order.orderCode || order.id}</h3>
                      <button
                        className="btn-copy-code"
                        title="Sao chép mã đơn hàng"
                        onClick={() =>
                          copyToClipboard(
                            order.orderCode || order.id,
                            "Mã đơn hàng",
                          )
                        }
                      >
                        <FaCopy />
                      </button>
                    </div>

                    <div className="order-meta-info">
                      <span className={`status-badge ${order.status}`}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>

                      {order.createdAt && (
                        <span className="order-date">
                          <FaCalendarAlt />{" "}
                          {new Date(order.createdAt).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="order-total-block">
                    <span className="order-total-label">Tổng thanh toán</span>
                    <span className="order-total">{formatPrice(orderTotal)}</span>
                  </div>
                </div>

                {/* Thanh toán */}
                <div className="admin-payment-info">
                  <span className="payment-method-tag">
                    {paymentMethodLabel(order.paymentMethod)}
                  </span>
                  <strong className={`payment-status-tag ${order.paymentStatus}`}>
                    {paymentStatusLabel(order.paymentStatus)}
                  </strong>
                </div>

                {/* Body */}
                <div className="order-card-body">
                  {/* Customer */}
                  <div className="customer-section">
                    <div className="customer-avatar">
                      <FaUser />
                    </div>

                    <div className="customer-info">
                      <div className="customer-name-row">
                        <h4>{order.customerName || "Khách hàng ẩn danh"}</h4>
                        {order.userId && (
                          <span className="customer-user-id">
                            UID: #{order.userId}
                          </span>
                        )}
                      </div>

                      <p>
                        <strong>SĐT:</strong>{" "}
                        <a href={`tel:${order.phone}`}>{order.phone || "--"}</a>
                      </p>

                      {order.email && (
                        <p className="email-text">
                          <FaEnvelope /> {order.email}
                        </p>
                      )}

                      <p className="address-text">
                        <strong>Địa chỉ:</strong> {order.address || "Chưa cung cấp"}
                      </p>

                      {order.note && (
                        <p className="order-note-text">
                          <FaStickyNote /> <strong>Ghi chú:</strong> {order.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product */}
                  <div className="products-section">
                    {(order.products || []).map((prod, idx) => (
                      <div className="product-item-summary" key={idx}>
                        <img
                          src={
                            prod.image &&
                            (prod.image.startsWith("http") ||
                              prod.image.startsWith("data:") ||
                              prod.image.startsWith("/images"))
                              ? prod.image
                              : "https://placehold.co/80x80?text=PC"
                          }
                          alt={prod.name}
                        />

                        <div className="product-info">
                          <h5>{prod.name || `Sản phẩm #${prod.productId}`}</h5>
                          <div className="product-sub-info">
                            <span className="prod-quantity">
                              SL: {prod.quantity}
                            </span>
                            <span className="prod-price">
                              {formatPrice(prod.unitPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="order-card-footer">
                  <div className="action-buttons">
                    {order.status === "pending" && (
                      <>
                        <button
                          className="btn-approve"
                          disabled={
                            order.paymentMethod === "vnpay" &&
                            order.paymentStatus !== "paid"
                          }
                          title={
                            order.paymentMethod === "vnpay" &&
                            order.paymentStatus !== "paid"
                              ? "Đơn VNPAY chưa được IPN xác nhận thanh toán"
                              : "Xác nhận duyệt đơn hàng"
                          }
                          onClick={() =>
                            handleUpdateStatus(order.id, "confirmed")
                          }
                        >
                          <FaCheck />
                          Duyệt đơn
                        </button>

                        <button
                          className="btn-cancel"
                          onClick={() =>
                            handleUpdateStatus(order.id, "cancelled")
                          }
                        >
                          <FaBan />
                          Hủy đơn
                        </button>
                      </>
                    )}

                    {order.status === "confirmed" && (
                      <button
                        className="btn-ship"
                        onClick={() => handleUpdateStatus(order.id, "shipping")}
                      >
                        <FaTruck />
                        Giao hàng
                      </button>
                    )}

                    {order.status === "shipping" && (
                      <button
                        className="btn-complete"
                        onClick={() =>
                          handleUpdateStatus(order.id, "completed")
                        }
                      >
                        <FaCheck />
                        Hoàn thành
                      </button>
                    )}

                    {(order.status === "completed" ||
                      order.status === "cancelled") && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <FaTrash />
                        Xóa hẳn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default AdminOrders;
