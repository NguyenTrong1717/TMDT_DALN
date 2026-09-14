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
  FaPrint,
  FaUndoAlt,
  FaFileExcel,
  FaShippingFast,
  FaCrown,
  FaMedal,
  FaLock,
  FaBarcode,
  FaTimes,
  FaMoneyBillWave,
} from "react-icons/fa";
import { exportToCsv, logAudit } from "../../utils/exportCsv";
import "./AdminOrders.css";

const API_URL = "http://127.0.0.1:3000";

const ORDER_STATUSES = [
  { value: "all", label: "Tất cả đơn" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "confirmed", label: "Đã duyệt & Đóng gói" },
  { value: "shipping", label: "Đang giao hàng" },
  { value: "delivered", label: "Đã giao thành công" },
  { value: "completed", label: "Hoàn thành" },
  { value: "returning", label: "Đang trả hàng" },
  { value: "returned", label: "Đã trả hàng & Hoàn tiền" },
  { value: "cancelled", label: "Đã hủy" },
];

const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Chưa thanh toán", color: "#eab308" },
  { value: "partially_paid", label: "Đã cọc 50%", color: "#3b82f6" },
  { value: "paid", label: "Đã thanh toán đủ", color: "#10b981" },
  { value: "refunded", label: "Đã hoàn tiền (RMA)", color: "#8b5cf6" },
  { value: "failed", label: "Thất bại", color: "#ef4444" },
];

const CARRIER_OPTIONS = [
  "HCore Express (Nội bộ)",
  "Giao Hàng Nhanh (GHN)",
  "Giao Hàng Tiết Kiệm (GHTK)",
  "Viettel Post",
  "J&T Express",
  "VNPost (Bưu điện VN)",
];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // State cho Modal In phiếu xuất kho
  const [printOrder, setPrintOrder] = useState(null);

  // State cho Modal Cập nhật Vận đơn
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [carrierInput, setCarrierInput] = useState(CARRIER_OPTIONS[0]);
  const [trackingCodeInput, setTrackingCodeInput] = useState("");

  // State cho Modal Trả hàng / Hoàn tiền (RMA)
  const [rmaModalOrder, setRmaModalOrder] = useState(null);
  const [rmaReason, setRmaReason] = useState("Khách yêu cầu đổi trả linh kiện");
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundMethodInput, setRefundMethodInput] = useState("Chuyển khoản ngân hàng");
  const [restockItemCheck, setRestockItemCheck] = useState(true);

  // State cho Ghi chú nội bộ
  const [internalNoteEditingId, setInternalNoteEditingId] = useState(null);
  const [internalNoteText, setInternalNoteText] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/orders`, {
        headers: { "x-user-id": String(currentUser?.id || "") },
      });
      if (!response.ok) throw new Error("Không thể lấy danh sách đơn hàng.");
      const data = await response.json();
      setOrders(Array.isArray(data) ? data.reverse() : []);
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

  // Tính toán LTV và Phân hạng khách hàng (Tiers)
  const customerStatsMap = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const uId = String(o.userId || o.phone || "guest");
      if (!map[uId]) {
        map[uId] = { totalSpent: 0, orderCount: 0 };
      }
      map[uId].orderCount += 1;
      if (o.paymentStatus === "paid" || o.status === "completed") {
        map[uId].totalSpent += Number(o.totalAmount || 0);
      }
    });
    return map;
  }, [orders]);

  const getCustomerTier = (totalSpent) => {
    if (totalSpent >= 50000000) return { name: "Kim Cương", icon: FaCrown, color: "#8b5cf6", bg: "#f5f3ff" };
    if (totalSpent >= 20000000) return { name: "Vàng", icon: FaMedal, color: "#eab308", bg: "#fefce8" };
    if (totalSpent >= 5000000) return { name: "Bạc", icon: FaMedal, color: "#64748b", bg: "#f8fafc" };
    return { name: "Đồng", icon: FaMedal, color: "#b45309", bg: "#fef3c7" };
  };

  // Cập nhật trạng thái giao hàng / đơn hàng
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
            : `Đã chuyển đơn sang: "${ORDER_STATUSES.find((s) => s.value === newStatus)?.label || newStatus}"`,
        );

        logAudit(currentUser, "Đổi trạng thái đơn hàng", `Đơn #${orderId}`, `Trạng thái mới: ${newStatus}`);

        const order = orders.find((o) => o.id === orderId);
        if (order?.userId) {
          const products = order.products || [];
          const firstProduct = products[0];
          const productName = firstProduct?.name || `Sản phẩm #${firstProduct?.productId}`;
          const hasMore = products.length > 1;

          createNotification({
            userId: order.userId,
            type: "order",
            title: `Đơn ${productName}${hasMore ? " và các sản phẩm khác" : ""} đã cập nhật`,
            message: `Đơn hàng của bạn hiện đã chuyển sang trạng thái "${ORDER_STATUSES.find((s) => s.value === newStatus)?.label || newStatus}".`,
            link: "/orders",
          });
        }
        fetchOrders();
      } else {
        toast.error("Không thể cập nhật trạng thái đơn.");
      }
    } catch {
      toast.error("Có lỗi xảy ra khi cập nhật đơn.");
    }
  };

  // TÁCH RỜI: Cập nhật Trạng thái Thanh toán độc lập
  const handleUpdatePaymentStatus = async (orderId, nextPaymentStatus) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: nextPaymentStatus,
          paidAt: nextPaymentStatus === "paid" ? new Date().toISOString() : null,
        }),
      });

      if (!res.ok) throw new Error("Cập nhật thanh toán thất bại");
      toast.success(`Đã đổi thanh toán sang: "${PAYMENT_STATUSES.find((p) => p.value === nextPaymentStatus)?.label}"`);
      logAudit(currentUser, "Cập nhật thanh toán đơn", `Đơn #${orderId}`, `Thanh toán: ${nextPaymentStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Cập nhật thông tin vận chuyển
  const handleSaveShippingInfo = async (e) => {
    e.preventDefault();
    if (!shippingModalOrder) return;
    try {
      const res = await fetch(`${API_URL}/orders/${shippingModalOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingCarrier: carrierInput,
          trackingCode: trackingCodeInput.trim() || `TRACK-${Date.now().toString().slice(-8)}`,
          status: "shipping",
        }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật thông tin vận chuyển!");

      toast.success(`Đã xuất đơn cho hãng vận chuyển "${carrierInput}"!`);
      logAudit(currentUser, "Cập nhật mã vận đơn", `Đơn #${shippingModalOrder.id}`, `Hãng: ${carrierInput}, Vận đơn: ${trackingCodeInput}`);
      setShippingModalOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Xử lý luồng Trả hàng / Hoàn tiền (RMA)
  const handleProcessRma = async (e) => {
    e.preventDefault();
    if (!rmaModalOrder) return;
    try {
      const refundAmt = Number(refundAmountInput) || Number(rmaModalOrder.totalAmount || 0);

      // Cập nhật đơn hàng sang trạng thái returned và refunded
      const res = await fetch(`${API_URL}/orders/${rmaModalOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "returned",
          paymentStatus: "refunded",
          rma: {
            reason: rmaReason,
            refundAmount: refundAmt,
            refundMethod: refundMethodInput,
            restocked: restockItemCheck,
            processedBy: currentUser?.fullName || "Admin",
            processedAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) throw new Error("Xử lý hoàn tiền thất bại!");

      // Tùy chọn cộng lại kho nếu được chọn
      if (restockItemCheck && Array.isArray(rmaModalOrder.products)) {
        for (const prod of rmaModalOrder.products) {
          if (prod.productId) {
            fetch(`${API_URL}/products/${prod.productId}`)
              .then((r) => r.json())
              .then((p) => {
                if (p && p.stock !== undefined) {
                  fetch(`${API_URL}/products/${prod.productId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      stock: Number(p.stock || 0) + Number(prod.quantity || 1),
                      stockLeft: Number(p.stockLeft || p.stock || 0) + Number(prod.quantity || 1),
                    }),
                  });
                }
              })
              .catch(() => null);
          }
        }
      }

      toast.success(`Đã xử lý hoàn tiền ${refundAmt.toLocaleString("vi-VN")}₫ cho đơn hàng!`);
      logAudit(currentUser, "Xử lý trả hàng/hoàn tiền (RMA)", `Đơn #${rmaModalOrder.id}`, `Hoàn: ${refundAmt}₫ qua ${refundMethodInput}`);
      setRmaModalOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Lưu ghi chú nội bộ của Admin
  const handleSaveInternalNote = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote: internalNoteText.trim() }),
      });
      if (!res.ok) throw new Error("Không thể lưu ghi chú!");

      toast.success("Đã cập nhật ghi chú nội bộ!");
      logAudit(currentUser, "Cập nhật ghi chú nội bộ", `Đơn #${orderId}`, internalNoteText.trim());
      setInternalNoteEditingId(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
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
        logAudit(currentUser, "Xóa vĩnh viễn đơn hàng", `Đơn #${orderId}`);
        fetchOrders();
      } else {
        toast.error(`Không thể xóa đơn hàng. (status ${response.status})`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Có lỗi xảy ra khi xóa.");
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

  // Xuất file Excel Đơn hàng (CSV UTF-8 BOM)
  const handleExportOrdersCsv = () => {
    try {
      const headers = [
        { label: "Mã đơn hàng", key: (o) => o.orderCode || o.id },
        { label: "Ngày đặt", key: (o) => o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "" },
        { label: "Tên khách hàng", key: "customerName" },
        { label: "Số điện thoại", key: "phone" },
        { label: "Email", key: "email" },
        { label: "Địa chỉ giao hàng", key: "address" },
        { label: "Phương thức thanh toán", key: "paymentMethod" },
        { label: "Trạng thái thanh toán", key: "paymentStatus" },
        { label: "Trạng thái giao hàng", key: "status" },
        { label: "Hãng vận chuyển", key: (o) => o.shippingCarrier || "Chưa gán" },
        { label: "Mã vận đơn", key: (o) => o.trackingCode || "" },
        { label: "Tổng giá trị (VNĐ)", key: "totalAmount" },
        { label: "Ghi chú khách", key: "note" },
        { label: "Ghi chú nội bộ Admin", key: "internalNote" },
      ];

      exportToCsv("Danh_sach_don_hang", headers, filteredOrders);
      toast.success(`Đã xuất ${filteredOrders.length} đơn hàng ra file Excel (CSV)!`);
      logAudit(currentUser, "Xuất Excel đơn hàng", `Tổng: ${filteredOrders.length} đơn`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();
    return orders.filter((order) => {
      const matchStatus =
        activeTab === "all" ? true : order.status === activeTab;
      const matchPayment =
        paymentFilter === "all" ? true : order.paymentStatus === paymentFilter;

      const matchSearch =
        !keyword ||
        order.orderCode?.toLowerCase().includes(keyword) ||
        order.customerName?.toLowerCase().includes(keyword) ||
        order.phone?.toLowerCase().includes(keyword) ||
        order.email?.toLowerCase().includes(keyword) ||
        order.address?.toLowerCase().includes(keyword) ||
        order.trackingCode?.toLowerCase().includes(keyword) ||
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
      {/* HEADER & CONTROLS */}
      <div className="admin-orders-header-row">
        <div>
          <h2 className="admin-title">
            <FaShoppingBag /> QUẢN LÝ ĐƠN HÀNG &amp; VẬN CHUYỂN
          </h2>
          <p className="admin-orders-subtitle">
            Hệ thống quản lý chuỗi đơn hàng, theo dõi mã vận đơn, tách rời thanh toán và in phiếu xuất kho
          </p>
        </div>

        <div className="orders-summary-actions">
          <div className="orders-summary-badge">
            <span>
              Hiển thị: <strong>{filteredOrders.length}</strong> / {orders.length} đơn
            </span>
            <span>
              Tổng tiền: <strong>{formatPrice(totalFilteredRevenue)}</strong>
            </span>
          </div>

          <button
            onClick={handleExportOrdersCsv}
            className="btn-export-orders-excel"
            title="Xuất file Excel CSV danh sách đơn hàng"
          >
            <FaFileExcel /> Xuất Excel Đơn hàng
          </button>
        </div>
      </div>

      {/* TABS TRẠNG THÁI GIAO HÀNG / ĐƠN HÀNG */}
      <div className="admin-order-tabs">
        {ORDER_STATUSES.map((tab) => {
          const count =
            tab.value === "all"
              ? orders.length
              : orders.filter((o) => o.status === tab.value).length;

          return (
            <button
              key={tab.value}
              className={`tab-item ${activeTab === tab.value ? "active" : ""}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
              {` (${count})`}
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="admin-orders-toolbar">
        <div className="admin-orders-search">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, khách hàng, SĐT, mã vận đơn hoặc địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Xóa tìm kiếm"
            >
              &times;
            </button>
          )}
        </div>

        <div className="admin-orders-filters">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="payment-select"
          >
            <option value="all">Tất cả trạng thái thanh toán</option>
            {PAYMENT_STATUSES.map((ps) => (
              <option key={ps.value} value={ps.value}>
                {ps.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DANH SÁCH BENTO ORDER CARDS */}
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

            const userStats = customerStatsMap[String(order.userId || order.phone || "guest")] || { totalSpent: 0, orderCount: 1 };
            const tier = getCustomerTier(userStats.totalSpent);
            const TierIcon = tier.icon;

            return (
              <div className="order-card bento" key={order.id}>
                {/* 1. Header: Mã đơn + Date + Print */}
                <div className="order-card-header">
                  <div>
                    <div className="order-code-row">
                      <h3 className="order-code">#{order.orderCode || order.id}</h3>
                      <button
                        className="btn-copy-code"
                        title="Sao chép mã đơn"
                        onClick={() => copyToClipboard(order.orderCode || order.id, "Mã đơn hàng")}
                      >
                        <FaCopy />
                      </button>

                      <button
                        className="btn-print-slip"
                        title="In phiếu xuất kho / Hóa đơn"
                        onClick={() => setPrintOrder(order)}
                      >
                        <FaPrint /> In xuất kho
                      </button>
                    </div>

                    <div className="order-meta-info">
                      <span className={`status-badge ${order.status}`}>
                        {ORDER_STATUSES.find((s) => s.value === order.status)?.label || order.status}
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
                    <span className="order-total-label">Tổng đơn</span>
                    <span className="order-total">{formatPrice(orderTotal)}</span>
                  </div>
                </div>

                {/* 2. KHU VỰC VẬN CHUYỂN & THANH TOÁN TÁCH RỜI */}
                <div className="admin-operations-bar">
                  {/* Trạng thái thanh toán độc lập */}
                  <div className="op-item payment-ctrl">
                    <span className="op-label">
                      <FaMoneyBillWave /> Thanh toán:
                    </span>
                    <select
                      value={order.paymentStatus || "unpaid"}
                      onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value)}
                      className={`payment-status-select ${order.paymentStatus}`}
                      title="Admin có thể đổi trạng thái thanh toán trực tiếp"
                    >
                      {PAYMENT_STATUSES.map((ps) => (
                        <option key={ps.value} value={ps.value}>
                          {ps.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vận chuyển & Mã vận đơn */}
                  <div className="op-item shipping-ctrl">
                    <span className="op-label">
                      <FaTruck /> Vận chuyển:
                    </span>
                    {order.shippingCarrier ? (
                      <span
                        className="carrier-tag"
                        onClick={() => {
                          setShippingModalOrder(order);
                          setCarrierInput(order.shippingCarrier);
                          setTrackingCodeInput(order.trackingCode || "");
                        }}
                        title="Click để đổi đơn vị vận chuyển / mã vận đơn"
                      >
                        {order.shippingCarrier} · <strong>{order.trackingCode || "Chưa có mã"}</strong>
                      </span>
                    ) : (
                      <button
                        className="btn-assign-carrier"
                        onClick={() => {
                          setShippingModalOrder(order);
                          setCarrierInput(CARRIER_OPTIONS[0]);
                          setTrackingCodeInput(`TRACK-${Date.now().toString().slice(-8)}`);
                        }}
                      >
                        + Gán vận đơn
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Body: Khách hàng + LTV & Sản phẩm */}
                <div className="order-card-body">
                  {/* Customer Section */}
                  <div className="customer-section">
                    <div className="customer-avatar">
                      <FaUser />
                    </div>

                    <div className="customer-info">
                      <div className="customer-name-row">
                        <h4>{order.customerName || "Khách hàng ẩn danh"}</h4>
                        {/* Phân hạng khách hàng VIP Tier */}
                        <span
                          className="customer-tier-badge"
                          style={{ color: tier.color, backgroundColor: tier.bg, borderColor: tier.color }}
                          title={`Tổng chi tiêu trọn đời (LTV): ${formatPrice(userStats.totalSpent)}`}
                        >
                          <TierIcon /> {tier.name} · {formatPrice(userStats.totalSpent)}
                        </span>
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
                          <FaStickyNote /> <strong>Khách dặn:</strong> {order.note}
                        </p>
                      )}

                      {/* Ghi chú nội bộ bí mật của Admin */}
                      <div className="internal-note-container">
                        {internalNoteEditingId === order.id ? (
                          <div className="internal-note-edit-box">
                            <textarea
                              value={internalNoteText}
                              onChange={(e) => setInternalNoteText(e.target.value)}
                              placeholder="Ghi chú nội bộ cho nhân viên (khách không thấy)..."
                              rows={2}
                            />
                            <div className="internal-note-btns">
                              <button
                                className="btn-save-note"
                                onClick={() => handleSaveInternalNote(order.id)}
                              >
                                Lưu ghi chú
                              </button>
                              <button
                                className="btn-cancel-note"
                                onClick={() => setInternalNoteEditingId(null)}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="internal-note-display"
                            onClick={() => {
                              setInternalNoteEditingId(order.id);
                              setInternalNoteText(order.internalNote || "");
                            }}
                            title="Click để sửa ghi chú nội bộ"
                          >
                            <FaLock /> <strong>Ghi chú nội bộ:</strong>{" "}
                            {order.internalNote || (
                              <span className="empty-note-hint">Click để thêm ghi chú...</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Products Section */}
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

                {/* 4. Footer Actions & Trả hàng RMA */}
                <div className="order-card-footer">
                  <div className="action-buttons">
                    {order.status === "pending" && (
                      <>
                        <button
                          className="btn-approve"
                          onClick={() => handleUpdateStatus(order.id, "confirmed")}
                        >
                          <FaCheck /> Duyệt &amp; Đóng gói
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => handleUpdateStatus(order.id, "cancelled")}
                        >
                          <FaBan /> Hủy đơn
                        </button>
                      </>
                    )}

                    {order.status === "confirmed" && (
                      <button
                        className="btn-ship"
                        onClick={() => {
                          setShippingModalOrder(order);
                          setCarrierInput(CARRIER_OPTIONS[0]);
                          setTrackingCodeInput(`TRACK-${Date.now().toString().slice(-8)}`);
                        }}
                      >
                        <FaShippingFast /> Giao hàng &amp; Gán mã vận đơn
                      </button>
                    )}

                    {order.status === "shipping" && (
                      <button
                        className="btn-complete"
                        onClick={() => handleUpdateStatus(order.id, "delivered")}
                      >
                        <FaCheck /> Đã giao thành công
                      </button>
                    )}

                    {order.status === "delivered" && (
                      <button
                        className="btn-complete"
                        onClick={() => handleUpdateStatus(order.id, "completed")}
                      >
                        <FaCheck /> Hoàn tất đơn
                      </button>
                    )}

                    {/* Nút yêu cầu/xử lý trả hàng RMA cho các đơn đã giao hoặc đang có vấn đề */}
                    {(order.status === "delivered" || order.status === "completed" || order.status === "shipping") && (
                      <button
                        className="btn-rma"
                        title="Tạo luồng trả hàng & hoàn tiền (RMA)"
                        onClick={() => {
                          setRmaModalOrder(order);
                          setRefundAmountInput(String(orderTotal));
                        }}
                      >
                        <FaUndoAlt /> Trả hàng / Hoàn tiền
                      </button>
                    )}

                    {(order.status === "completed" ||
                      order.status === "cancelled" ||
                      order.status === "returned") && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <FaTrash /> Xóa hẳn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          MODAL: IN PHIẾU XUẤT KHO / HÓA ĐƠN GIAO HÀNG (PRINT SLIP)
         ========================================================= */}
      {printOrder && (
        <div className="print-modal-overlay" onClick={() => setPrintOrder(null)}>
          <div className="print-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="print-modal-actions-bar no-print">
              <button
                className="btn-do-print"
                onClick={() => window.print()}
              >
                <FaPrint /> In phiếu xuất kho ngay
              </button>
              <button
                className="btn-close-print"
                onClick={() => setPrintOrder(null)}
              >
                Đóng
              </button>
            </div>

            {/* VÙNG IN HÓA ĐƠN / PHIẾU XUẤT KHO A4/A5 */}
            <div className="dispatch-slip printable-area">
              <div className="slip-header">
                <div className="slip-logo">
                  <h2>HCORE STORE</h2>
                  <p>Hệ Thống Phân Phối Máy Tính &amp; Linh Kiện Cao Cấp</p>
                  <p>Hotline: 1900 8888 · Website: hcore.vn</p>
                </div>
                <div className="slip-meta">
                  <h3>PHIẾU XUẤT KHO &amp; GIAO HÀNG</h3>
                  <p>
                    Mã đơn: <strong>#{printOrder.orderCode || printOrder.id}</strong>
                  </p>
                  <p>
                    Ngày in: {new Date().toLocaleDateString("vi-VN")} {new Date().toLocaleTimeString("vi-VN")}
                  </p>
                  <div className="slip-barcode">
                    <FaBarcode /> *{printOrder.orderCode || printOrder.id}*
                  </div>
                </div>
              </div>

              <div className="slip-addresses">
                <div className="slip-address-box">
                  <h4>ĐƠN VỊ VẬN CHUYỂN</h4>
                  <p>Hãng: <strong>{printOrder.shippingCarrier || "HCore Express"}</strong></p>
                  <p>Mã vận đơn: <strong>{printOrder.trackingCode || "Chưa tạo"}</strong></p>
                  <p>Trạng thái thanh toán: <strong>{printOrder.paymentStatus === "paid" ? "ĐÃ THANH TOÁN ĐỦ" : "THU TIỀN KHI GIAO (COD)"}</strong></p>
                </div>
                <div className="slip-address-box">
                  <h4>NGƯỜI NHẬN HÀNG</h4>
                  <p>Họ tên: <strong>{printOrder.customerName}</strong></p>
                  <p>Số điện thoại: <strong>{printOrder.phone}</strong></p>
                  <p>Địa chỉ: {printOrder.address}</p>
                  {printOrder.note && <p>Ghi chú khách: <em>{printOrder.note}</em></p>}
                </div>
              </div>

              <table className="slip-items-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên sản phẩm &amp; Cấu hình</th>
                    <th>Đơn giá</th>
                    <th style={{ textAlign: "center" }}>Số lượng</th>
                    <th style={{ textAlign: "right" }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(printOrder.products || []).map((p, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{p.name || `Sản phẩm #${p.productId}`}</td>
                      <td>{Number(p.unitPrice || 0).toLocaleString("vi-VN")}₫</td>
                      <td style={{ textAlign: "center" }}><strong>{p.quantity}</strong></td>
                      <td style={{ textAlign: "right" }}>
                        {(Number(p.unitPrice || 0) * Number(p.quantity || 1)).toLocaleString("vi-VN")}₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="slip-summary-block">
                <div className="slip-total-line">
                  <span>Tổng tiền thanh toán:</span>
                  <strong>{formatPrice(printOrder.totalAmount)}</strong>
                </div>
                <p className="slip-cod-note">
                  Số tiền cần thu người nhận:{" "}
                  <strong>
                    {printOrder.paymentStatus === "paid"
                      ? "0₫ (Đã thanh toán trước qua VNPAY/Chuyển khoản)"
                      : formatPrice(printOrder.totalAmount)}
                  </strong>
                </p>
              </div>

              <div className="slip-signatures">
                <div className="sign-col">
                  <p>Người lập phiếu</p>
                  <div className="sign-space"></div>
                  <span>{currentUser?.fullName || "Admin"}</span>
                </div>
                <div className="sign-col">
                  <p>Thủ kho xuất hàng</p>
                  <div className="sign-space"></div>
                  <span>(Ký, ghi rõ họ tên)</span>
                </div>
                <div className="sign-col">
                  <p>Nhân viên giao vận</p>
                  <div className="sign-space"></div>
                  <span>(Ký, ghi rõ họ tên)</span>
                </div>
                <div className="sign-col">
                  <p>Người nhận hàng</p>
                  <div className="sign-space"></div>
                  <span>(Ký nhận nguyên vẹn)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: GÁN ĐƠN VỊ VẬN CHUYỂN & MÃ VẬN ĐƠN
         ========================================================= */}
      {shippingModalOrder && (
        <div className="modal-overlay" onClick={() => setShippingModalOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              <span>Xuất kho giao hàng #{shippingModalOrder.orderCode || shippingModalOrder.id}</span>
              <button
                type="button"
                onClick={() => setShippingModalOrder(null)}
                className="modal-close-btn"
              >
                &times;
              </button>
            </h3>

            <form onSubmit={handleSaveShippingInfo} className="form-layouts">
              <div className="form-item">
                <label>Đơn vị vận chuyển (Carrier) *</label>
                <select
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  required
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-item">
                <label>Mã vận đơn (Tracking Code / Waybill) *</label>
                <input
                  type="text"
                  value={trackingCodeInput}
                  onChange={(e) => setTrackingCodeInput(e.target.value)}
                  placeholder="VD: GHN-88239123 hoặc VT-99210"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShippingModalOrder(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  Xác nhận giao hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: TRẢ HÀNG & HOÀN TIỀN (RMA)
         ========================================================= */}
      {rmaModalOrder && (
        <div className="modal-overlay" onClick={() => setRmaModalOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              <span>Xử lý Trả hàng / Hoàn tiền (RMA) #{rmaModalOrder.orderCode || rmaModalOrder.id}</span>
              <button
                type="button"
                onClick={() => setRmaModalOrder(null)}
                className="modal-close-btn"
              >
                &times;
              </button>
            </h3>

            <form onSubmit={handleProcessRma} className="form-layouts">
              <div className="form-item">
                <label>Lý do trả hàng / khiếu nại *</label>
                <select
                  value={rmaReason}
                  onChange={(e) => setRmaReason(e.target.value)}
                >
                  <option value="Hàng lỗi kỹ thuật / không hoạt động">Hàng lỗi kỹ thuật / không hoạt động</option>
                  <option value="Hư hỏng / nứt vỡ khi vận chuyển">Hư hỏng / nứt vỡ khi vận chuyển</option>
                  <option value="Giao sai linh kiện / sai phân loại SKU">Giao sai linh kiện / sai phân loại SKU</option>
                  <option value="Khách đổi ý trả hàng theo chính sách 7 ngày">Khách đổi ý trả hàng theo chính sách 7 ngày</option>
                </select>
              </div>

              <div className="form-item">
                <label>Số tiền hoàn lại cho khách (VNĐ) *</label>
                <input
                  type="number"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-item">
                <label>Phương thức hoàn tiền</label>
                <select
                  value={refundMethodInput}
                  onChange={(e) => setRefundMethodInput(e.target.value)}
                >
                  <option value="Chuyển khoản ngân hàng">Chuyển khoản ngân hàng trực tiếp</option>
                  <option value="Hoàn tiền qua cổng VNPAY">Hoàn tiền qua cổng VNPAY Sandbox</option>
                  <option value="Cộng điểm ví voucher">Cộng điểm ví voucher thành viên</option>
                </select>
              </div>

              <div className="form-checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={restockItemCheck}
                    onChange={(e) => setRestockItemCheck(e.target.checked)}
                  />
                  Tự động nhập lại số lượng vào kho (Restock)
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setRmaModalOrder(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save rma">
                  Xác nhận hoàn tiền &amp; Trả hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster position="top-right" richColors />
    </div>
  );
};

export default AdminOrders;
