import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { createNotification } from "../../utils/notify";
import {
  FaShoppingBag,
  FaUser,
  FaCheck,
  FaTruck,
  FaTrash,
  FaBan,
} from "react-icons/fa";
import "./AdminOrders.css";

const API_URL = "http://localhost:3000";
const STATUS_LABEL = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`);
      if (!response.ok) throw new Error("Không thể lấy danh sách đơn hàng.");
      const data = await response.json();
      setOrders(data.reverse()); // Sắp xếp đơn mới nhất lên đầu
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tải danh sách đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (
      newStatus === "cancelled" &&
      !window.confirm("Bạn có chắc chắn muốn HỦY đơn hàng này?")
    )
      return;
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        toast.success(
          newStatus === "cancelled"
            ? "Đã hủy đơn hàng!"
            : "Cập nhật trạng thái thành công!",
        );

        // Báo cho khách hàng biết đơn hàng của họ vừa đổi trạng thái
        // Báo cho khách hàng biết đơn hàng của họ vừa đổi trạng thái
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
    } catch (error) {
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
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "DELETE",
      });

      // 👉 log để xem chính xác server trả về gì
      console.log("DELETE status:", response.status);
      let bodyText = "";
      try {
        bodyText = await response.text();
        console.log("DELETE body:", bodyText);
      } catch (e) {
        console.log("Không đọc được body:", e);
      }

      if (response.ok) {
        toast.success("Xóa vĩnh viễn đơn hàng thành công!");
        fetchOrders();
      } else {
        toast.error(`Không thể xóa đơn hàng. (status ${response.status})`);
        // vẫn refetch để UI đồng bộ với DB thực tế
        fetchOrders();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Có lỗi xảy ra khi xóa.");
      fetchOrders(); // đề phòng DB đã xóa nhưng fetch bị lỗi mạng
    }
  };

  const filteredOrders = orders.filter((order) =>
    activeTab === "all" ? true : order.status === activeTab,
  );
  const getCountByStatus = (status) =>
    status === "all"
      ? orders.length
      : orders.filter((o) => o.status === status).length;
  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  if (loading)
    return <div className="loading-box">Đang tải danh sách đơn hàng...</div>;

  return (
    <div className="admin-orders-page">
      <h2 className="admin-title">
        <FaShoppingBag /> QUẢN LÝ ĐƠN HÀNG
      </h2>

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
            {tab === "completed" && "Thành công"}
            {tab === "cancelled" && "Đã hủy"}
            {` (${getCountByStatus(tab)})`}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">Không có đơn hàng nào trong mục này.</div>
      ) : (
        <div className="orders-card-container">
          {filteredOrders.map((order) => (
            <div className="order-card" key={order.id}>
              {/* Header */}
              <div className="order-card-header">
                <div>
                  <h3 className="order-code">#{order.orderCode}</h3>

                  <span className={`status-badge ${order.status}`}>
                    {order.status === "pending" && "Chờ xử lý"}
                    {order.status === "confirmed" && "Đã xác nhận"}
                    {order.status === "shipping" && "Đang giao"}
                    {order.status === "completed" && "Hoàn thành"}
                    {order.status === "cancelled" && "Đã hủy"}
                  </span>
                </div>

                <div className="order-total">
                  {formatPrice(
                    order.totalAmount > 0
                      ? order.totalAmount
                      : (order.products || []).reduce(
                          (sum, p) => sum + p.unitPrice * p.quantity,
                          0,
                        ),
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="order-card-body">
                {/* Customer */}
                <div className="customer-section">
                  <div className="customer-avatar">
                    <FaUser />
                  </div>

                  <div className="customer-info">
                    <h4>{order.customerName}</h4>

                    <p>
                      <strong>SĐT:</strong> {order.phone}
                    </p>

                    <p className="address-text">
                      <strong>Địa chỉ:</strong> {order.address}
                    </p>
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

                        <p>Số lượng: {prod.quantity}</p>

                        <span>{formatPrice(prod.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="order-card-footer">
                <div className="action-buttons">
                  {order.status === "pending" && (
                    <>
                      <button
                        className="btn-approve"
                        onClick={() =>
                          handleUpdateStatus(order.id, "confirmed")
                        }
                      >
                        <FaCheck />
                        Duyệt
                      </button>

                      <button
                        className="btn-cancel"
                        onClick={() =>
                          handleUpdateStatus(order.id, "cancelled")
                        }
                      >
                        <FaBan />
                        Hủy
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
                      onClick={() => handleUpdateStatus(order.id, "completed")}
                    >
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
          ))}
        </div>
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default AdminOrders;
