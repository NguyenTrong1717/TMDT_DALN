import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { FaBoxOpen, FaCalendarAlt } from "react-icons/fa";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../Sevicer/Sevicer";
import "./UserOrders.css";

const API_URL = "http://localhost:3000";

const UserOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchMyOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/orders?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          // Đảo ngược để đơn hàng mới nhất lên đầu
          setOrders(data.reverse());
        } else {
          toast.error("Không thể tải danh sách đơn hàng!");
        }
      } catch (error) {
        console.error(error);
        toast.error("Có lỗi xảy ra khi kết nối server!");
      } finally {
        setLoading(false);
      }
    };

    fetchMyOrders();
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
      case "shipping":
        return <span className="status-badge shipping"> Đang giao hàng</span>;
      case "completed":
        return <span className="status-badge completed"> Đã hoàn thành</span>;
      case "cancelled":
        return <span className="status-badge cancelled"> Đã hủy</span>;
      default:
        return <span className="status-badge">Không xác định</span>;
    }
  };

  if (loading)
    return <div className="loading-box">Đang tải đơn hàng của bạn...</div>;

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
                {orders.map((order) => (
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
                ))}
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
