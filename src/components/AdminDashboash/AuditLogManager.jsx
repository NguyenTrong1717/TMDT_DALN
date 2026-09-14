import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  FaSearch,
  FaHistory,
  FaFileDownload,
  FaFilter,
  FaSyncAlt,
  FaEye,
  FaTrashAlt,
  FaUserShield,
  FaBoxes,
  FaHeadset,
  FaUser,
  FaCalendarAlt,
  FaTag,
} from "react-icons/fa";
import { exportToCsv } from "../../utils/exportCsv";
import "./AuditLogManager.css";

const BASE_URL = "http://localhost:3000/auditLogs";

const INITIAL_SEEDS = [
  {
    id: "log-1",
    actor: "Nguyễn Văn Admin",
    role: "admin",
    action: "Cấu hình hệ thống",
    target: "Cài đặt thanh toán & Logistics",
    details: "Tách rời Trạng thái Giao hàng (Shipping Status) và Trạng thái Thanh toán (Payment Status)",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "log-2",
    actor: "Trần Kho Vận",
    role: "warehouse",
    action: "In phiếu xuất kho",
    target: "Đơn hàng #DH-17412",
    details: "Xuất phiếu đóng gói A4/A5, gán đơn vị Giao Hàng Nhanh (GHN), mã vận đơn GHN-88492019",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "log-3",
    actor: "Lê CSKH",
    role: "support",
    action: "Xử lý Trả hàng (RMA)",
    target: "Đơn hàng #DH-17380",
    details: "Duyệt yêu cầu hoàn tiền 1.850.000₫ do linh kiện không tương thích; hoàn trả tồn kho +1 chiếc",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "log-4",
    actor: "Nguyễn Văn Admin",
    role: "admin",
    action: "Phân quyền nhân viên",
    target: "Người dùng #U09 (Phạm Hùng)",
    details: "Chuyển vai trò từ Khách hàng sang Quản lý Kho vận (warehouse)",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
  {
    id: "log-5",
    actor: "Trần Kho Vận",
    role: "warehouse",
    action: "Cập nhật tồn kho",
    target: "Sản phẩm Card RTX 4070 Super",
    details: "Nhập thêm 15 chiếc, cập nhật giá vốn 14.500.000₫, giá bán lẻ 17.200.000₫ (lợi nhuận 2.700.000₫/chiếc)",
    timestamp: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
  },
];

const AuditLogManager = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Lấy dữ liệu Audit Logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?_sort=timestamp&_order=desc`);
      if (!res.ok) throw new Error("Không thể tải nhật ký thao tác");

      let data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        // Tự động seed các logs ban đầu nếu chưa có
        for (const seed of INITIAL_SEEDS) {
          await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(seed),
          }).catch(() => null);
        }
        data = INITIAL_SEEDS;
      }
      setLogs(data);
    } catch (err) {
      console.warn("Lỗi fetch audit logs, dùng dữ liệu mẫu:", err);
      setLogs(INITIAL_SEEDS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Lọc & Tìm kiếm
  const filteredLogs = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();
    return logs.filter((log) => {
      const matchSearch =
        !keyword ||
        log.actor?.toLowerCase().includes(keyword) ||
        log.action?.toLowerCase().includes(keyword) ||
        log.target?.toLowerCase().includes(keyword) ||
        log.details?.toLowerCase().includes(keyword);

      const matchAction =
        actionFilter === "all" ||
        log.action?.toLowerCase().includes(actionFilter.toLowerCase());

      const matchRole = roleFilter === "all" || log.role === roleFilter;

      return matchSearch && matchAction && matchRole;
    });
  }, [logs, searchTerm, actionFilter, roleFilter]);

  // Phân trang
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Xuất Excel
  const handleExportCsv = () => {
    try {
      const headers = [
        { label: "Mã Log", key: "id" },
        { label: "Thời gian", key: (l) => new Date(l.timestamp).toLocaleString("vi-VN") },
        { label: "Người thực hiện", key: "actor" },
        { label: "Vai trò", key: (l) => (l.role || "admin").toUpperCase() },
        { label: "Hành động", key: "action" },
        { label: "Đối tượng tác động", key: "target" },
        { label: "Chi tiết thay đổi", key: "details" },
      ];
      exportToCsv("Nhat_Ky_Thao_Tac_He_Thong", headers, filteredLogs);
      toast.success(`Đã xuất báo cáo ${filteredLogs.length} dòng nhật ký thao tác!`);
    } catch (err) {
      toast.error(err.message || "Xuất file thất bại");
    }
  };

  // Badge màu cho từng hành động
  const getActionBadgeClass = (action = "") => {
    const act = action.toLowerCase();
    if (act.includes("xóa") || act.includes("khóa")) return "badge-danger";
    if (act.includes("thêm") || act.includes("tạo") || act.includes("mở")) return "badge-success";
    if (act.includes("phân quyền") || act.includes("cấu hình")) return "badge-purple";
    if (act.includes("in") || act.includes("xuất kho") || act.includes("kho")) return "badge-amber";
    if (act.includes("trả") || act.includes("hoàn tiền") || act.includes("rma")) return "badge-rose";
    return "badge-blue";
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <FaUserShield className="role-icon admin" title="Admin" />;
      case "warehouse":
        return <FaBoxes className="role-icon warehouse" title="Kho vận" />;
      case "support":
        return <FaHeadset className="role-icon support" title="CSKH" />;
      default:
        return <FaUser className="role-icon user" title="Người dùng" />;
    }
  };

  return (
    <div className="audit-container">
      <div className="audit-card">
        {/* Header */}
        <div className="audit-header">
          <div>
            <div className="audit-title-wrap">
              <FaHistory className="audit-main-icon" />
              <h2>Nhật Ký Thao Tác Hệ Thống (Audit Logs)</h2>
            </div>
            <p className="audit-subtitle">
              Truy vết chi tiết mọi thay đổi: Đơn hàng, Tồn kho, Giá vốn, Phân quyền nhân sự &amp; Hoàn tiền (RMA)
            </p>
          </div>
          <div className="audit-header-actions">
            <button onClick={fetchLogs} className="btn-audit-refresh" title="Làm mới">
              <FaSyncAlt className={loading ? "spin" : ""} />
              <span>Làm mới</span>
            </button>
            <button onClick={handleExportCsv} className="btn-audit-export">
              <FaFileDownload />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Bento Stats */}
        <div className="audit-stats-grid">
          <div className="audit-stat-item">
            <span className="stat-label">Tổng số thao tác</span>
            <span className="stat-value">{logs.length}</span>
            <span className="stat-hint">Lịch sử được ghi nhận</span>
          </div>
          <div className="audit-stat-item highlight-admin">
            <span className="stat-label">Thao tác Quản trị (Admin)</span>
            <span className="stat-value">
              {logs.filter((l) => l.role === "admin").length}
            </span>
            <span className="stat-hint">Cấu hình &amp; phân quyền</span>
          </div>
          <div className="audit-stat-item highlight-warehouse">
            <span className="stat-label">Kho &amp; Vận chuyển</span>
            <span className="stat-value">
              {logs.filter((l) => l.role === "warehouse" || l.action?.includes("kho")).length}
            </span>
            <span className="stat-hint">In đơn &amp; cập nhật kho</span>
          </div>
          <div className="audit-stat-item highlight-rma">
            <span className="stat-label">Hỗ trợ &amp; RMA</span>
            <span className="stat-value">
              {logs.filter((l) => l.action?.toLowerCase().includes("trả") || l.action?.toLowerCase().includes("rma")).length}
            </span>
            <span className="stat-hint">Đổi trả / Hoàn tiền</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="audit-filter-bar">
          <div className="audit-search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Tìm theo người thực hiện, hành động, đối tượng, chi tiết..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="audit-filter-group">
            <div className="filter-select-wrap">
              <FaFilter className="filter-icon" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả hành động</option>
                <option value="Cập nhật">Cập nhật</option>
                <option value="Thêm">Thêm mới</option>
                <option value="Xóa">Xóa</option>
                <option value="Phân quyền">Phân quyền</option>
                <option value="Kho">Kho vận &amp; In đơn</option>
                <option value="RMA">Trả hàng / RMA</option>
                <option value="Xuất">Xuất báo cáo</option>
              </select>
            </div>

            <div className="filter-select-wrap">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Admin</option>
                <option value="warehouse">Kho vận</option>
                <option value="support">CSKH</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: "170px" }}>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Đối tượng tác động</th>
                <th>Chi tiết thay đổi</th>
                <th style={{ width: "90px", textAlign: "center" }}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                    Đang tải nhật ký kiểm toán...
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "48px 24px" }}>
                    <div className="audit-empty-state">
                      <FaHistory className="audit-empty-icon" />
                      <h4>Không có nhật ký nào phù hợp</h4>
                      <p>Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="audit-time-cell">
                        <FaCalendarAlt className="time-icon" />
                        <span>
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString("vi-VN")
                            : "--"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="audit-actor-cell">
                        {getRoleIcon(log.role)}
                        <div>
                          <div className="actor-name">{log.actor || "Admin"}</div>
                          <span className={`actor-role ${log.role || "admin"}`}>
                            {log.role?.toUpperCase() || "ADMIN"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`audit-badge ${getActionBadgeClass(log.action)}`}>
                        <FaTag className="badge-icon" />
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <strong className="audit-target-text">{log.target}</strong>
                    </td>
                    <td>
                      <p className="audit-details-snippet" title={log.details}>
                        {log.details}
                      </p>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn-view-log"
                        onClick={() => setSelectedLog(log)}
                        title="Xem chi tiết"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="audit-pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ◀ Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={currentPage === page ? "active" : ""}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Sau ▶
            </button>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selectedLog && (
        <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="audit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <h3>CHI TIẾT NHẬT KÝ THAO TÁC</h3>
              <button className="modal-close-btn" onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <div className="audit-modal-body">
              <div className="log-detail-row">
                <span>Mã định danh log:</span>
                <strong>#{selectedLog.id}</strong>
              </div>
              <div className="log-detail-row">
                <span>Thời gian ghi nhận:</span>
                <strong>{new Date(selectedLog.timestamp).toLocaleString("vi-VN")}</strong>
              </div>
              <div className="log-detail-row">
                <span>Người thực hiện:</span>
                <strong>
                  {selectedLog.actor} ({selectedLog.role?.toUpperCase()})
                </strong>
              </div>
              <div className="log-detail-row">
                <span>Hành động:</span>
                <span className={`audit-badge ${getActionBadgeClass(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="log-detail-row">
                <span>Đối tượng tác động:</span>
                <strong>{selectedLog.target}</strong>
              </div>
              <div className="log-detail-content">
                <span>Nội dung chi tiết &amp; thay đổi:</span>
                <div className="details-box">{selectedLog.details}</div>
              </div>
            </div>
            <div className="audit-modal-footer">
              <button className="btn-close-modal" onClick={() => setSelectedLog(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" richColors closeButton duration={3000} />
    </div>
  );
};

export default AuditLogManager;
