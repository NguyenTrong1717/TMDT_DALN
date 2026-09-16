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
  FaMoneyBillWave,
} from "react-icons/fa";
import { exportToCsv, logAudit } from "../../utils/exportCsv";
import "./AdminOrders.css";
import { apiFetch, getCurrentUser, readJson } from "../../utils/api";

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
  const [returnRequests, setReturnRequests] = useState([]);
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

  // State cho Ghi chú nội bộ
  const [internalNoteEditingId, setInternalNoteEditingId] = useState(null);
  const [internalNoteText, setInternalNoteText] = useState("");

  const currentUser = getCurrentUser() || {};

  const fetchOrders = async () => {
    try {
      const [response, returnsResponse] = await Promise.all([
        apiFetch(`/api/admin/orders`),
        apiFetch(`/api/returns`),
      ]);
      if (!response.ok) throw new Error("Không thể lấy danh sách đơn hàng.");
      if (!returnsResponse.ok) throw new Error("Không thể lấy dữ liệu trả hàng.");
      const [data, returnsData] = await Promise.all([response.json(), returnsResponse.json()]);
      setOrders(Array.isArray(data) ? data.reverse() : []);
      setReturnRequests(Array.isArray(returnsData) ? returnsData : []);
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tải danh sách đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
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
      if (["paid", "partially_refunded"].includes(o.paymentStatus)) {
        map[uId].totalSpent += Math.max(0, Number(o.totalAmount || 0) - Number(o.refundedAmount || 0));
      }
    });
    return map;
  }, [orders]);

  const getCustomerTier = (totalSpent) => {
    if (totalSpent >= 40000000) return { name: "Kim Cương", icon: FaCrown, color: "#8b5cf6", bg: "#f5f3ff" };
    if (totalSpent >= 15000000) return { name: "Vàng", icon: FaMedal, color: "#eab308", bg: "#fefce8" };
    if (totalSpent >= 5000000) return { name: "Bạc", icon: FaMedal, color: "#64748b", bg: "#f8fafc" };
    return { name: "Đồng", icon: FaMedal, color: "#b45309", bg: "#fef3c7" };
  };

  // Cập nhật trạng thái giao hàng / đơn hàng
  const handleUpdateStatus = async (orderId, newStatus) => {
    let reason = "";
    const targetOrder = orders.find((item) => item.id === orderId);
    if (newStatus === "cancelled") {
      reason = window.prompt("Nhập lý do hủy đơn (bắt buộc):", "")?.trim() || "";
      if (!reason) return;
    }
    try {
      if (newStatus === "cancelled" && ["paid", "partially_refunded"].includes(targetOrder?.paymentStatus)) {
        const amountText = window.prompt("Nhập toàn bộ số tiền còn phải hoàn trước khi hủy (VND):", "")?.trim();
        const amount = Number(amountText);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Số tiền hoàn phải lớn hơn 0.");
        const reference = window.prompt("Nhập mã tham chiếu hoàn tiền thủ công:", "")?.trim();
        const evidence = reference ? window.prompt("Nhập bằng chứng/đường dẫn chứng từ hoàn:", "")?.trim() : "";
        if (!reference || !evidence) throw new Error("Chưa hủy đơn vì thiếu mã tham chiếu hoặc bằng chứng hoàn tiền.");
        const refundResult = await readJson(await apiFetch(`/api/admin/orders/${orderId}/manual-refund`, {
          method: "POST",
          body: JSON.stringify({ amount, reference, evidence, reason }),
        }));
        toast.info(refundResult.message);
      }
      const response = await apiFetch(
        `/api/admin/orders/${orderId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus, reason }),
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
      } else throw new Error((await response.json().catch(() => ({}))).error || "Không thể cập nhật trạng thái đơn.");
    } catch (error) {
      toast.error(error.message || "Có lỗi xảy ra khi cập nhật đơn.");
    }
  };

  // TÁCH RỜI: Cập nhật Trạng thái Thanh toán độc lập
  const handleUpdatePaymentStatus = async (orderId, nextPaymentStatus) => {
    try {
      const order = orders.find((item) => item.id === orderId);
      if (order?.paymentMethod !== "cod" || nextPaymentStatus !== "paid") {
        throw new Error("Thanh toán online chỉ được cập nhật từ kết quả đã xác minh của cổng thanh toán.");
      }
      const reference = window.prompt("Nhập mã đối soát/biên nhận thu COD:", "")?.trim();
      if (!reference) return;
      const res = await apiFetch(`/api/admin/orders/${orderId}/collect-cod`, {
        method: "POST",
        body: JSON.stringify({ reference }),
      });
      await readJson(res, "Xác nhận thu COD thất bại.");
      toast.success("Đã ghi nhận thu COD từ biên nhận.");
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
      const res = await apiFetch(`/api/admin/orders/${shippingModalOrder.id}/shipping`, {
        method: "PATCH",
        body: JSON.stringify({
          carrier: carrierInput,
          trackingCode: trackingCodeInput.trim(),
        }),
      });
      await readJson(res, "Không thể cập nhật thông tin vận chuyển!");

      toast.success(`Đã ghi nhận bàn giao cho "${carrierInput}". Mã tự sinh (nếu có) chỉ là mã nội bộ demo.`);
      logAudit(currentUser, "Cập nhật mã vận đơn", `Đơn #${shippingModalOrder.id}`, `Hãng: ${carrierInput}, Vận đơn: ${trackingCodeInput}`);
      setShippingModalOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Tạo yêu cầu RMA; các bước duyệt, nhận hàng, nhập kho và hoàn tiền được xử lý riêng.
  const handleProcessRma = async (e) => {
    e.preventDefault();
    if (!rmaModalOrder) return;
    try {
      const refundAmt = Number(refundAmountInput);
      if (!Number.isFinite(refundAmt) || refundAmt <= 0) throw new Error("Số tiền đề nghị phải lớn hơn 0.");
      const items = (rmaModalOrder.products || []).map((item) => ({ productId: item.productId, fromTable: item.fromTable, variantId: item.variantId || null, quantity: item.quantity }));
      const created = await readJson(await apiFetch(`/api/orders/${rmaModalOrder.id}/returns`, {
        method: "POST",
        body: JSON.stringify({ requestId: `admin_rma_${rmaModalOrder.id}_${Date.now()}`, reason: rmaReason, requestedAmount: refundAmt, items }),
      }), "Không thể tạo yêu cầu trả hàng.");
      toast.success(`Đã tạo yêu cầu ${created.id}. Cần duyệt, tiếp nhận và kiểm tra hàng trước khi nhập kho/ghi nhận hoàn tiền.`);
      setRmaModalOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateReturnStatus = async (request, status) => {
    const note = window.prompt("Nhập ghi chú xử lý (bắt buộc):", "")?.trim();
    if (!note) return;
    try {
      await readJson(await apiFetch(`/api/admin/returns/${request.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, assigneeId: currentUser.id, note }),
      }));
      toast.success(`Đã chuyển yêu cầu trả hàng sang ${status}.`);
      fetchOrders();
    } catch (error) { toast.error(error.message); }
  };

  const restockReturn = async (request) => {
    const reason = window.prompt("Ghi rõ kết quả kiểm tra và lý do hàng đủ điều kiện bán lại:", "")?.trim();
    if (!reason) return;
    try {
      const items = (request.items || []).map((item) => ({ productId: item.productId, fromTable: item.fromTable, variantId: item.variantId || null, quantity: item.quantity, resellable: true }));
      await readJson(await apiFetch(`/api/admin/returns/${request.id}/restock`, {
        method: "POST", body: JSON.stringify({ items, reason }),
      }));
      toast.success("Đã nhập lại đúng số lượng hàng thực nhận đủ điều kiện bán lại.");
      fetchOrders();
    } catch (error) { toast.error(error.message); }
  };

  const recordManualRefund = async (request) => {
    const amountText = window.prompt("Nhập số tiền đã hoàn thủ công (VND, phải lớn hơn 0):", "")?.trim();
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Số tiền hoàn phải lớn hơn 0.");
    const reference = window.prompt("Nhập mã tham chiếu giao dịch hoàn thủ công:", "")?.trim();
    const evidence = reference ? window.prompt("Nhập bằng chứng/đường dẫn chứng từ hoàn tiền:", "")?.trim() : "";
    if (!reference || !evidence) return toast.error("Cần mã tham chiếu và bằng chứng hoàn tiền.");
    try {
      const result = await readJson(await apiFetch(`/api/admin/returns/${request.id}/manual-refund`, {
        method: "POST", body: JSON.stringify({ amount, method: "bank_transfer", reference, evidence }),
      }));
      toast.success(result.message);
      fetchOrders();
    } catch (error) { toast.error(error.message); }
  };

  // Lưu ghi chú nội bộ của Admin
  const handleSaveInternalNote = async (orderId) => {
    try {
      const res = await apiFetch(`/api/admin/orders/${orderId}/internal-note`, {
        method: "PATCH",
        body: JSON.stringify({ internalNote: internalNoteText.trim() }),
      });
      await readJson(res, "Không thể lưu ghi chú!");

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
      const response = await apiFetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Đã lưu trữ đơn hàng; lịch sử vẫn được bảo toàn.");
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

  const filteredOrders = (() => {
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
  })();

  const totalFilteredRevenue = filteredOrders.reduce((sum, order) => {
      const amount =
        order.totalAmount > 0
          ? order.totalAmount
          : (order.products || []).reduce(
              (pSum, p) => pSum + (p.unitPrice || 0) * (p.quantity || 1),
              0,
            );
      return sum + amount;
    }, 0);

  if (loading)
    return <div className="admin-orders-loading">Đang tải danh sách đơn hàng...</div>;

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
            const returnRequest = returnRequests.find((item) => String(item.orderId) === String(order.id));
            const hasActiveReturn = returnRequest && ["requested", "approved", "processing"].includes(returnRequest.status);

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
                      disabled={!(["admin", "warehouse"].includes(currentUser.role) && order.paymentMethod === "cod" && order.status === "delivered" && order.paymentStatus !== "paid")}
                      title={order.paymentMethod === "cod" ? "COD chỉ được xác nhận sau khi giao và có mã đối soát" : "Thanh toán online do callback đã xác minh cập nhật"}
                    >
                      {PAYMENT_STATUSES.filter((ps) => ps.value === order.paymentStatus || ps.value === "paid").map((ps) => (
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
                          setTrackingCodeInput("");
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

                {returnRequest && (
                  <div className="rma-workflow-summary">
                    <strong>RMA {returnRequest.id}</strong>
                    <span>Trạng thái: {returnRequest.status}</span>
                    <span>Đề nghị: {formatPrice(returnRequest.requestedAmount)}</span>
                    <span>Lý do: {returnRequest.reason}</span>
                    {returnRequest.restockedAt && <span>Đã nhập lại kho: {returnRequest.restockedQuantity} sản phẩm</span>}
                    {returnRequest.manualRefund?.confirmedAt && (
                      <span>Đã ghi nhận hoàn thủ công: {formatPrice(returnRequest.manualRefund.amount)} · {returnRequest.manualRefund.reference}</span>
                    )}
                    <div className="action-buttons">
                      {["admin", "support"].includes(currentUser.role) && returnRequest.status === "requested" && (
                        <>
                          <button className="btn-approve" onClick={() => updateReturnStatus(returnRequest, "approved")}>Duyệt trả hàng</button>
                          <button className="btn-cancel" onClick={() => updateReturnStatus(returnRequest, "rejected")}>Từ chối</button>
                        </>
                      )}
                      {["admin", "warehouse"].includes(currentUser.role) && returnRequest.status === "approved" && (
                        <button className="btn-ship" onClick={() => updateReturnStatus(returnRequest, "processing")}>Đã nhận hàng, bắt đầu kiểm tra</button>
                      )}
                      {["admin", "warehouse"].includes(currentUser.role) && returnRequest.status === "processing" && !returnRequest.restockedAt && (
                        <button className="btn-approve" onClick={() => restockReturn(returnRequest)}>Nhập lại hàng đủ điều kiện</button>
                      )}
                      {currentUser.role === "admin" && returnRequest.status === "processing" && (
                        <button className="btn-rma" onClick={() => recordManualRefund(returnRequest)}>Ghi nhận hoàn thủ công</button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Footer Actions & Trả hàng RMA */}
                <div className="order-card-footer">
                  <div className="action-buttons">
                    {["admin", "warehouse"].includes(currentUser.role) && order.status === "pending" && (
                      <>
                        <button
                          className="btn-approve"
                          onClick={() => handleUpdateStatus(order.id, "confirmed")}
                        >
                          <FaCheck /> Duyệt &amp; Đóng gói
                        </button>
                        {currentUser.role === "admin" && <button
                          className="btn-cancel"
                          onClick={() => handleUpdateStatus(order.id, "cancelled")}
                        >
                          <FaBan /> Hủy đơn
                        </button>}
                      </>
                    )}

                    {["admin", "warehouse"].includes(currentUser.role) && order.status === "confirmed" && (
                      <><button
                        className="btn-ship"
                        onClick={() => {
                          setShippingModalOrder(order);
                          setCarrierInput(CARRIER_OPTIONS[0]);
                          setTrackingCodeInput("");
                        }}
                      >
                        <FaShippingFast /> Giao hàng &amp; Gán mã vận đơn
                      </button>{currentUser.role === "admin" && <button className="btn-cancel" onClick={() => handleUpdateStatus(order.id, "cancelled")}><FaBan /> Hủy đơn</button>}</>
                    )}

                    {["admin", "warehouse"].includes(currentUser.role) && order.status === "shipping" && (
                      <button
                        className="btn-complete"
                        onClick={() => handleUpdateStatus(order.id, "delivered")}
                      >
                        <FaCheck /> Đã giao thành công
                      </button>
                    )}

                    {["admin", "warehouse"].includes(currentUser.role) && order.status === "delivered" && (
                      <button
                        className="btn-complete"
                        onClick={() => handleUpdateStatus(order.id, "completed")}
                      >
                        <FaCheck /> Hoàn tất đơn
                      </button>
                    )}

                    {/* Nút yêu cầu/xử lý trả hàng RMA cho các đơn đã giao hoặc đang có vấn đề */}
                    {["admin", "support"].includes(currentUser.role) && !hasActiveReturn && (order.status === "delivered" || order.status === "completed") && (
                      <button
                        className="btn-rma"
                        title="Tạo luồng trả hàng & hoàn tiền (RMA)"
                        onClick={() => {
                          setRmaModalOrder(order);
                          setRefundAmountInput(String(orderTotal));
                        }}
                      >
                        <FaUndoAlt /> Tạo yêu cầu trả hàng
                      </button>
                    )}

                    {currentUser.role === "admin" && (order.status === "completed" ||
                      order.status === "cancelled" ||
                      order.status === "returned") && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <FaTrash /> Lưu trữ
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
        <div className="admin-dialog-backdrop" onClick={() => setShippingModalOrder(null)}>
          <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="shipping-dialog-title" onClick={(e) => e.stopPropagation()}>
            <header className="admin-dialog__header">
              <h3 id="shipping-dialog-title">Xuất kho giao hàng #{shippingModalOrder.orderCode || shippingModalOrder.id}</h3>
              <button
                type="button"
                onClick={() => setShippingModalOrder(null)}
                className="admin-dialog__close"
                aria-label="Đóng cửa sổ vận chuyển"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleSaveShippingInfo} className="admin-dialog__form">
              <div className="admin-dialog__field">
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

              <div className="admin-dialog__field">
                <label>Mã vận đơn (Tracking Code / Waybill) *</label>
                <input
                  type="text"
                  value={trackingCodeInput}
                  onChange={(e) => setTrackingCodeInput(e.target.value)}
                  placeholder="VD: GHN-88239123 hoặc VT-99210"
                  required
                />
              </div>

              <footer className="admin-dialog__actions">
                <button
                  type="button"
                  className="admin-dialog__button admin-dialog__button--secondary"
                  onClick={() => setShippingModalOrder(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="admin-dialog__button admin-dialog__button--primary">
                  Xác nhận giao hàng
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* =========================================================
          MODAL: TRẢ HÀNG & HOÀN TIỀN (RMA)
         ========================================================= */}
      {rmaModalOrder && (
        <div className="admin-dialog-backdrop" onClick={() => setRmaModalOrder(null)}>
          <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="rma-dialog-title" onClick={(e) => e.stopPropagation()}>
            <header className="admin-dialog__header">
              <h3 id="rma-dialog-title">Tạo yêu cầu trả hàng (RMA) #{rmaModalOrder.orderCode || rmaModalOrder.id}</h3>
              <button
                type="button"
                onClick={() => setRmaModalOrder(null)}
                className="admin-dialog__close"
                aria-label="Đóng cửa sổ trả hàng"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleProcessRma} className="admin-dialog__form">
              <div className="admin-dialog__field">
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

              <div className="admin-dialog__field">
                <label>Số tiền đề nghị hoàn (VNĐ) *</label>
                <input
                  type="number"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  required
                />
              </div>

              <p className="admin-dialog__notice">Việc tạo yêu cầu không tự nhập kho và không chuyển tiền. Các bước duyệt, nhận/kiểm tra hàng, nhập kho và ghi nhận chứng từ hoàn được thực hiện riêng.</p>

              <footer className="admin-dialog__actions">
                <button
                  type="button"
                  className="admin-dialog__button admin-dialog__button--secondary"
                  onClick={() => setRmaModalOrder(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="admin-dialog__button admin-dialog__button--primary">
                  Tạo yêu cầu
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      <Toaster position="top-right" richColors />
    </div>
  );
};

export default AdminOrders;
