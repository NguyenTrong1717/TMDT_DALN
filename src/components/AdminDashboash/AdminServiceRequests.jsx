import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { createNotification } from "../../utils/notify";
import "./AdminServiceRequests.css";

const STATUS_LABELS = {
  pending: { label: "Chưa xử lý", color: "#e0a800" },
  processing: { label: "Đang xử lý", color: "#0d6efd" },
  done: { label: "Đã xử lý", color: "#198754" },
};

const AdminServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [selected, setSelected] = useState(null); // request đang xem chi tiết

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3000/serviceRequests?_sort=createdAt&_order=desc",
      );
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được danh sách yêu cầu!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const serviceOptions = useMemo(() => {
    const set = new Set(requests.map((r) => r.service));
    return Array.from(set);
  }, [requests]);

  // MỚI: đếm số lượng theo từng trạng thái để hiển thị thẻ thống kê
  const stats = useMemo(() => {
    const counts = { pending: 0, processing: 0, done: 0 };
    requests.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    return { total: requests.length, ...counts };
  }, [requests]);

  const filtered = requests.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchService = serviceFilter === "all" || r.service === serviceFilter;
    return matchStatus && matchService;
  });

  // MỚI: bấm vào thẻ thống kê sẽ lọc bảng theo trạng thái tương ứng
  const handleStatCardClick = (status) => {
    setStatusFilter((prev) => (prev === status ? "all" : status));
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await fetch(`http://localhost:3000/serviceRequests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const target = requests.find((r) => r.id === id);

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
      );
      if (selected?.id === id) {
        setSelected((prev) => ({ ...prev, status: newStatus }));
      }
      toast.success("Đã cập nhật trạng thái!");

      // MỚI: chỉ gửi thông báo riêng cho khách hàng đã gửi yêu cầu này
      // khi trạng thái vừa chuyển sang "Đã xử lý"
      if (newStatus === "done" && target && target.status !== "done") {
        createNotification({
          userId: target.userId,
          type: "service",
          title: `Yêu cầu dịch vụ "${target.service}" đã được xử lý`,
          message: `Yêu cầu của bạn về "${target.service}" đã được xử lý xong. Cảm ơn bạn đã sử dụng dịch vụ!`,
          link: "/lien-he",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật thất bại!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa yêu cầu này? Hành động không thể hoàn tác."))
      return;

    try {
      const res = await fetch(`http://localhost:3000/serviceRequests/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }

      setRequests((prev) => prev.filter((r) => r.id !== id));

      if (selected?.id === id) {
        setSelected(null);
      }

      toast.success("Đã xóa yêu cầu!");
    } catch (err) {
      console.error(err);
      toast.error("Xóa thất bại!");
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="asr-wrapper">
      <div className="asr-header">
        <h2>Yêu Cầu Dịch Vụ</h2>
        <p className="asr-header-subtitle">
          Quản lý các yêu cầu hỗ trợ từ khách hàng
        </p>
      </div>

      {/* MỚI: dải thẻ thống kê số lượng theo trạng thái */}
      <div className="asr-stats">
        <button
          type="button"
          className={`asr-stat-card asr-stat-card--total ${
            statusFilter === "all" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <p className="asr-stat-label">Tổng yêu cầu</p>
          <p className="asr-stat-value">{stats.total}</p>
        </button>
        <button
          type="button"
          className={`asr-stat-card asr-stat-card--pending ${
            statusFilter === "pending" ? "active" : ""
          }`}
          onClick={() => handleStatCardClick("pending")}
        >
          <p className="asr-stat-label">Chưa xử lý</p>
          <p className="asr-stat-value">{stats.pending}</p>
        </button>
        <button
          type="button"
          className={`asr-stat-card asr-stat-card--processing ${
            statusFilter === "processing" ? "active" : ""
          }`}
          onClick={() => handleStatCardClick("processing")}
        >
          <p className="asr-stat-label">Đang xử lý</p>
          <p className="asr-stat-value">{stats.processing}</p>
        </button>
        <button
          type="button"
          className={`asr-stat-card asr-stat-card--done ${
            statusFilter === "done" ? "active" : ""
          }`}
          onClick={() => handleStatCardClick("done")}
        >
          <p className="asr-stat-label">Đã xử lý</p>
          <p className="asr-stat-value">{stats.done}</p>
        </button>
      </div>

      <div className="asr-filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        >
          <option value="all">Tất cả dịch vụ</option>
          {serviceOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button className="asr-refresh" onClick={fetchRequests}>
          Làm mới
        </button>
      </div>

      {loading ? (
        <p className="asr-loading">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className="asr-empty">Không có yêu cầu nào.</p>
      ) : (
        <div className="asr-table-wrap">
          <table className="asr-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Liên hệ</th>
                <th>Dịch vụ</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.fullName}</td>
                  <td>
                    <div>{r.phone}</div>
                    <div className="asr-email">{r.email}</div>
                  </td>
                  <td>{r.service}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>
                    <span
                      className="asr-status-badge"
                      style={{
                        backgroundColor: STATUS_LABELS[r.status]?.color,
                      }}
                    >
                      {STATUS_LABELS[r.status]?.label || r.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="asr-view-btn"
                      onClick={() => setSelected(r)}
                    >
                      Xem
                    </button>
                    <button
                      className="asr-delete-btn"
                      onClick={() => handleDelete(r.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CHI TIẾT */}
      {selected && (
        <div className="asr-backdrop" onClick={() => setSelected(null)}>
          <div className="asr-modal" onClick={(e) => e.stopPropagation()}>
            <button className="asr-close" onClick={() => setSelected(null)}>
              &times;
            </button>
            <h3>{selected.service}</h3>
            <div className="asr-detail-row">
              <strong>Họ tên:</strong> {selected.fullName}
            </div>
            <div className="asr-detail-row">
              <strong>Email:</strong> {selected.email}
            </div>
            <div className="asr-detail-row">
              <strong>SĐT:</strong> {selected.phone}
            </div>
            <div className="asr-detail-row">
              <strong>Ngày gửi:</strong> {formatDate(selected.createdAt)}
            </div>
            <div className="asr-detail-row">
              <strong>Nội dung:</strong>
              <p>{selected.message || "(Không có ghi chú)"}</p>
            </div>

            <div className="asr-status-actions">
              <strong>Cập nhật trạng thái:</strong>
              <div className="asr-status-btns">
                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                  <button
                    key={key}
                    className={`asr-status-option ${selected.status === key ? "active" : ""}`}
                    style={{ borderColor: val.color, color: val.color }}
                    onClick={() => handleUpdateStatus(selected.id, key)}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServiceRequests;
