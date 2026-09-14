import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  FaSearch,
  FaUserPlus,
  FaUserShield,
  FaUserCheck,
  FaUserSlash,
  FaEye,
  FaEdit,
  FaTrashAlt,
  FaSort,
  FaFileDownload,
  FaCrown,
  FaBoxes,
  FaHeadset,
  FaStickyNote,
  FaSave,
} from "react-icons/fa";
import { exportToCsv, logAudit } from "../../utils/exportCsv";
import "./UserManager.css";

const BASE_URL = "http://localhost:3000/users";
const ORDERS_URL = "http://localhost:3000/orders";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^0\d{9}$/;

// Định nghĩa phân hạng thành viên
export const getCustomerTier = (spent = 0) => {
  if (spent >= 40000000) {
    return { key: "diamond", label: "Kim Cương", icon: "💎", badgeClass: "tier-diamond" };
  }
  if (spent >= 15000000) {
    return { key: "gold", label: "Vàng", icon: "🥇", badgeClass: "tier-gold" };
  }
  if (spent >= 5000000) {
    return { key: "silver", label: "Bạc", icon: "🥈", badgeClass: "tier-silver" };
  }
  return { key: "bronze", label: "Đồng", icon: "🥉", badgeClass: "tier-bronze" };
};

export const ROLE_CONFIG = {
  admin: { label: "Admin", badgeClass: "role-admin", icon: <FaUserShield /> },
  warehouse: { label: "Kho vận", badgeClass: "role-warehouse", icon: <FaBoxes /> },
  support: { label: "CSKH", badgeClass: "role-support", icon: <FaHeadset /> },
  user: { label: "Khách hàng", badgeClass: "role-user", icon: null },
};

const UserManager = () => {
  // =========================
  // DATA STATES
  // =========================
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================
  // FILTER STATES
  // =========================
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // =========================
  // SORT STATES
  // =========================
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");

  // =========================
  // PAGINATION STATES
  // =========================
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // =========================
  // MODAL STATES
  // =========================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [noteEdit, setNoteEdit] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // =========================
  // FORM STATES
  // =========================
  const defaultForm = {
    fullName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    role: "user",
    status: "active",
    internalNote: "",
  };

  const [form, setForm] = useState(defaultForm);

  // =========================
  // FETCH USERS & ORDERS DATA
  // =========================
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsers, resOrders] = await Promise.all([
        fetch(BASE_URL).catch(() => null),
        fetch(ORDERS_URL).catch(() => null),
      ]);

      if (resUsers && resUsers.ok) {
        const usersData = await resUsers.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } else {
        toast.error("Không thể lấy dữ liệu danh sách người dùng.");
      }

      if (resOrders && resOrders.ok) {
        const ordersData = await resOrders.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tính toán LTV và Thống kê cho mỗi User
  const usersWithStats = useMemo(() => {
    return users.map((u) => {
      const userOrders = orders.filter((o) => {
        const matchId = o.userId && String(o.userId) === String(u.id);
        const matchEmail =
          o.customerInfo?.email &&
          u.email &&
          o.customerInfo.email.trim().toLowerCase() === u.email.trim().toLowerCase();
        const matchPhone =
          o.customerInfo?.phone && u.phone && o.customerInfo.phone.trim() === u.phone.trim();
        return matchId || matchEmail || matchPhone;
      });

      const validOrders = userOrders.filter(
        (o) => o.status !== "cancelled" && o.paymentStatus !== "refunded"
      );

      const totalSpent = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const tierInfo = getCustomerTier(totalSpent);

      return {
        ...u,
        orderCount: userOrders.length,
        validOrderCount: validOrders.length,
        totalSpent,
        tierInfo,
        lastOrderDate: userOrders.length
          ? [...userOrders].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0]?.date
          : null,
      };
    });
  }, [users, orders]);

  // =========================
  // INPUT HANDLER
  // =========================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // FORM VALIDATION
  // =========================
  const validateForm = () => {
    if (!form.fullName.trim()) {
      toast.warning("Vui lòng nhập họ và tên.");
      return false;
    }

    if (!emailRegex.test(form.email.trim())) {
      toast.warning("Email không đúng định dạng.");
      return false;
    }

    if (form.phone.trim() && !phoneRegex.test(form.phone.trim())) {
      toast.warning("Số điện thoại không hợp lệ (cần đúng 10 số, bắt đầu bằng 0).");
      return false;
    }

    if (!editingId && form.password.trim().length < 6) {
      toast.warning("Mật khẩu phải từ 6 ký tự trở lên.");
      return false;
    }

    return true;
  };

  // =========================
  // SORT HANDLER
  // =========================
  const handleSort = (field) => {
    const nextOrder = sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(nextOrder);
  };

  // =========================
  // ENGINE: FILTER + SEARCH + SORT
  // =========================
  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();
    let result = [...usersWithStats];

    result = result.filter((user) => {
      const matchSearch =
        user.fullName?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.username?.toLowerCase().includes(keyword) ||
        user.phone?.includes(keyword) ||
        user.address?.toLowerCase().includes(keyword) ||
        user.internalNote?.toLowerCase().includes(keyword);

      const matchRole = roleFilter === "all" ? true : user.role === roleFilter;
      const matchTier = tierFilter === "all" ? true : user.tierInfo?.key === tierFilter;
      const matchStatus = statusFilter === "all" ? true : user.status === statusFilter;

      return matchSearch && matchRole && matchTier && matchStatus;
    });

    result.sort((a, b) => {
      if (sortField === "id") {
        return sortOrder === "asc" ? Number(a.id) - Number(b.id) : Number(b.id) - Number(a.id);
      }
      if (sortField === "totalSpent") {
        return sortOrder === "asc" ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent;
      }
      if (sortField === "orderCount") {
        return sortOrder === "asc" ? a.orderCount - b.orderCount : b.orderCount - a.orderCount;
      }

      const valueA = String(a[sortField] || "");
      const valueB = String(b[sortField] || "");

      return sortOrder === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });

    return result;
  }, [usersWithStats, searchTerm, roleFilter, tierFilter, statusFilter, sortField, sortOrder]);

  // =========================
  // PAGINATION ENGINE
  // =========================
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName || "",
      username: user.username || user.email.split("@")[0],
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      password: user.password || "",
      role: user.role || "user",
      status: user.status || "active",
      internalNote: user.internalNote || "",
    });
    setIsModalOpen(true);
  };

  // =========================
  // SUBMIT HANDLER (ADD / UPDATE)
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const email = form.email.trim().toLowerCase();
    const username = form.username.trim() || email.split("@")[0];

    const duplicatedEmail = users.some(
      (user) => user.email?.toLowerCase() === email && user.id !== editingId
    );
    if (duplicatedEmail) {
      toast.error("Email đã tồn tại trong hệ thống.");
      return;
    }

    const duplicatedUsername = users.some(
      (user) => user.username?.toLowerCase() === username.toLowerCase() && user.id !== editingId
    );
    if (duplicatedUsername) {
      toast.error("Tên người dùng (username) đã tồn tại.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingId) {
        const updatePayload = {
          fullName: form.fullName.trim(),
          username,
          email,
          phone: form.phone.trim(),
          address: form.address.trim(),
          role: form.role,
          status: form.status,
          internalNote: form.internalNote.trim(),
        };

        if (form.password.trim()) {
          updatePayload.password = form.password.trim();
        }

        const res = await fetch(`${BASE_URL}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!res.ok) throw new Error("Cập nhật thất bại");

        const updatedUser = await res.json();
        setUsers((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...updatedUser } : item))
        );

        await logAudit(
          { fullName: "Admin System", role: "admin" },
          "Cập nhật người dùng",
          `Người dùng #${editingId}`,
          `Sửa thông tin: ${form.fullName} | Quyền: ${form.role}`
        );

        toast.success("Cập nhật thông tin người dùng thành công!");
      } else {
        const newUser = {
          fullName: form.fullName.trim(),
          username,
          email,
          phone: form.phone.trim(),
          address: form.address.trim(),
          password: form.password.trim(),
          role: form.role,
          status: form.status,
          internalNote: form.internalNote.trim(),
          createdAt: new Date().toISOString(),
        };

        const res = await fetch(BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser),
        });

        if (!res.ok) throw new Error("Thêm thất bại");

        const createdUser = await res.json();
        setUsers((prev) => [createdUser, ...prev]);

        await logAudit(
          { fullName: "Admin System", role: "admin" },
          "Thêm người dùng mới",
          `Người dùng #${createdUser.id || "Mới"}`,
          `Tạo tài khoản: ${createdUser.fullName} (${createdUser.email})`
        );

        toast.success("Thêm thành viên mới thành công.");
      }

      setCurrentPage(1);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu dữ liệu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================
  // LOCK / UNLOCK ACCOUNT
  // =========================
  const toggleStatus = async (user) => {
    const nextStatus = user.status === "active" ? "locked" : "active";
    const message =
      nextStatus === "locked"
        ? `Bạn có chắc muốn KHÓA tài khoản ${user.fullName}?`
        : `Bạn có chắc muốn MỞ KHÓA tài khoản ${user.fullName}?`;

    if (!window.confirm(message)) return;

    try {
      const res = await fetch(`${BASE_URL}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error();

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item))
      );

      await logAudit(
        { fullName: "Admin System", role: "admin" },
        nextStatus === "locked" ? "Khóa tài khoản" : "Mở khóa tài khoản",
        `Người dùng #${user.id} (${user.fullName})`,
        `Trạng thái mới: ${nextStatus}`
      );

      toast.success(nextStatus === "locked" ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    } catch (err) {
      console.error(err);
      toast.error("Không thể cập nhật trạng thái.");
    }
  };

  // =========================
  // ROLE MANAGER (AUTHORIZATION)
  // =========================
  const handleChangeRole = async (user, newRole) => {
    if (user.role === newRole) return;
    if (
      !window.confirm(
        `Chuyển quyền của "${user.fullName}" thành ${ROLE_CONFIG[newRole]?.label.toUpperCase()}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error();

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, role: newRole } : item))
      );

      await logAudit(
        { fullName: "Admin System", role: "admin" },
        "Phân quyền nhân viên",
        `Người dùng #${user.id} (${user.fullName})`,
        `Chuyển từ "${user.role}" sang "${newRole}"`
      );

      toast.success(`Đã chuyển vai trò thành ${ROLE_CONFIG[newRole]?.label}!`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể thay đổi quyền.");
    }
  };

  // =========================
  // SAVE INTERNAL NOTE QUICKLY
  // =========================
  const handleSaveInternalNote = async (userId) => {
    try {
      setIsSavingNote(true);
      const res = await fetch(`${BASE_URL}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote: noteEdit.trim() }),
      });

      if (!res.ok) throw new Error();

      setUsers((prev) =>
        prev.map((item) =>
          item.id === userId ? { ...item, internalNote: noteEdit.trim() } : item
        )
      );

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev) => ({ ...prev, internalNote: noteEdit.trim() }));
      }

      await logAudit(
        { fullName: "Admin System", role: "admin" },
        "Cập nhật ghi chú nội bộ",
        `Khách hàng #${userId}`,
        `Nội dung: ${noteEdit.trim() || "(Xóa ghi chú)"}`
      );

      toast.success("Đã lưu ghi chú nội bộ!");
    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu ghi chú.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // =========================
  // DELETE USER
  // =========================
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa người dùng "${user.fullName}" (#${user.id})?`)) {
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setUsers((prev) => prev.filter((u) => u.id !== user.id));

      await logAudit(
        { fullName: "Admin System", role: "admin" },
        "Xóa người dùng",
        `Người dùng #${user.id}`,
        `Họ tên: ${user.fullName} | Email: ${user.email}`
      );

      toast.success("Đã xóa người dùng khỏi hệ thống.");
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error("Xóa người dùng thất bại.");
    }
  };

  // =========================
  // EXPORT EXCEL (CSV)
  // =========================
  const handleExportCsv = () => {
    try {
      const headers = [
        { label: "ID", key: "id" },
        { label: "Họ và tên", key: "fullName" },
        { label: "Username", key: "username" },
        { label: "Email", key: "email" },
        { label: "Số điện thoại", key: (u) => u.phone || "" },
        { label: "Vai trò", key: (u) => ROLE_CONFIG[u.role]?.label || u.role },
        { label: "Phân hạng", key: (u) => u.tierInfo?.label || "Đồng" },
        { label: "Tổng chi tiêu LTV (VNĐ)", key: (u) => u.totalSpent || 0 },
        { label: "Số đơn mua", key: (u) => u.orderCount || 0 },
        { label: "Trạng thái", key: (u) => (u.status === "active" ? "Hoạt động" : "Đã khóa") },
        { label: "Ghi chú nội bộ", key: (u) => u.internalNote || "" },
        { label: "Địa chỉ", key: (u) => u.address || "" },
        { label: "Ngày tạo", key: (u) => u.createdAt || "" },
      ];

      exportToCsv("Danh_Sach_Nguoi_Dung_Khach_Hang", headers, filteredUsers);
      toast.success(`Đã xuất file báo cáo cho ${filteredUsers.length} người dùng!`);

      logAudit(
        { fullName: "Admin System", role: "admin" },
        "Xuất báo cáo Excel",
        "Danh sách người dùng",
        `Số lượng xuất: ${filteredUsers.length} dòng`
      );
    } catch (err) {
      toast.error(err.message || "Xuất file thất bại.");
    }
  };

  // Tổng quan chỉ số Dashboard
  const totalRevenue = useMemo(
    () => usersWithStats.reduce((sum, u) => sum + (u.totalSpent || 0), 0),
    [usersWithStats]
  );
  const vipCount = useMemo(
    () =>
      usersWithStats.filter(
        (u) => u.tierInfo?.key === "diamond" || u.tierInfo?.key === "gold"
      ).length,
    [usersWithStats]
  );
  const staffCount = useMemo(
    () => usersWithStats.filter((u) => u.role !== "user").length,
    [usersWithStats]
  );

  return (
    <div className="um-container">
      <div className="um-card">
        {/* HEADER AREA */}
        <div className="um-header-wrapper">
          <div>
            <h2>Quản Lý Người Dùng &amp; Khách Hàng (CRM)</h2>
            <p className="um-subtitle">
              Lịch sử chi tiêu (LTV), phân hạng hội viên, phân quyền nhân sự &amp; ghi chú nội bộ
            </p>
          </div>
          <div className="um-header-actions">
            <button
              onClick={handleExportCsv}
              className="um-btn-export"
              title="Xuất danh sách ra file Excel / CSV (UTF-8 BOM)"
            >
              <FaFileDownload />
              <span>Xuất Excel</span>
            </button>
            <button onClick={openAddModal} className="um-btn-add">
              <FaUserPlus />
              <span>Thêm thành viên</span>
            </button>
          </div>
        </div>

        {/* DASHBOARD STATS CARD (BENTO BOX GRID) */}
        <div className="um-dashboard">
          <div className="um-stat-card">
            <h4>Tổng thành viên</h4>
            <h2>{users.length}</h2>
            <span>Toàn bộ tài khoản</span>
          </div>
          <div className="um-stat-card highlight-staff">
            <h4>Nhân sự hệ thống</h4>
            <h2>{staffCount}</h2>
            <span>Admin / Kho / CSKH</span>
          </div>
          <div className="um-stat-card highlight-vip">
            <h4>Khách hàng VIP</h4>
            <h2>{vipCount}</h2>
            <span>Hạng Vàng &amp; Kim Cương</span>
          </div>
          <div className="um-stat-card highlight-ltv">
            <h4>Tổng chi tiêu LTV</h4>
            <h2>{totalRevenue.toLocaleString("vi-VN")}₫</h2>
            <span>Doanh thu tích lũy</span>
          </div>
          <div className="um-stat-card">
            <h4>Đang hoạt động</h4>
            <h2>{users.filter((user) => user.status === "active").length}</h2>
            <span>Active accounts</span>
          </div>
        </div>

        {/* FILTER BAR AREA */}
        <div className="um-filter-bar">
          <div className="um-search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên, username, email, SĐT, ghi chú..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="um-filter-group">
            {/* Filter Quyền */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Admin (Quản trị)</option>
              <option value="warehouse">Kho vận</option>
              <option value="support">CSKH / Hỗ trợ</option>
              <option value="user">Khách hàng</option>
            </select>

            {/* Filter Phân hạng */}
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả phân hạng</option>
              <option value="diamond">💎 Kim Cương (≥ 40tr)</option>
              <option value="gold">🥇 Vàng (≥ 15tr)</option>
              <option value="silver">🥈 Bạc (≥ 5tr)</option>
              <option value="bronze">🥉 Đồng (&lt; 5tr)</option>
            </select>

            {/* Filter Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>

        {/* TABLE AREA */}
        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("id")} style={{ cursor: "pointer", width: "60px" }}>
                  ID <FaSort size={11} />
                </th>
                <th>Khách hàng / Nhân sự</th>
                <th onClick={() => handleSort("email")} style={{ cursor: "pointer" }}>
                  Email &amp; SĐT <FaSort size={11} />
                </th>
                <th>Phân quyền</th>
                <th onClick={() => handleSort("totalSpent")} style={{ cursor: "pointer" }}>
                  Hạng &amp; LTV <FaSort size={11} />
                </th>
                <th>Ghi chú nội bộ</th>
                <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                  Trạng thái <FaSort size={11} />
                </th>
                <th style={{ textAlign: "center", width: "190px" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                    <div className="um-loading-spinner">Đang tải dữ liệu khách hàng &amp; đơn...</div>
                  </td>
                </tr>
              ) : currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "48px 24px" }}>
                    <div className="um-empty-state">
                      <FaSearch className="um-empty-icon" />
                      <h4>Không tìm thấy người dùng phù hợp</h4>
                      <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc bên trên</p>
                      {(searchTerm ||
                        roleFilter !== "all" ||
                        tierFilter !== "all" ||
                        statusFilter !== "all") && (
                        <button
                          type="button"
                          className="um-btn-clear-filters"
                          onClick={() => {
                            setSearchTerm("");
                            setRoleFilter("all");
                            setTierFilter("all");
                            setStatusFilter("all");
                            setCurrentPage(1);
                          }}
                        >
                          Xóa bộ lọc &amp; Xem tất cả
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => {
                  const roleObj = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
                  return (
                    <tr key={user.id}>
                      <td className="um-id-cell">#{user.id}</td>
                      <td>
                        <div className="um-user-info">
                          <div
                            className={`um-avatar ${
                              user.role === "admin"
                                ? "avatar-admin"
                                : user.tierInfo?.key === "diamond"
                                ? "avatar-diamond"
                                : ""
                            }`}
                          >
                            {user.fullName?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="um-user-name">
                              {user.fullName}
                              {user.role === "admin" && (
                                <span className="admin-star" title="Quản trị viên">
                                  ★
                                </span>
                              )}
                            </div>
                            <div className="um-user-username">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="um-contact-info">
                          <div className="um-email">{user.email}</div>
                          <div className="um-phone">{user.phone || "--"}</div>
                        </div>
                      </td>
                      <td>
                        {/* Dropdown thay đổi vai trò trực tiếp */}
                        <select
                          className={`um-role-select ${roleObj.badgeClass}`}
                          value={user.role || "user"}
                          onChange={(e) => handleChangeRole(user, e.target.value)}
                        >
                          <option value="user">Khách hàng</option>
                          <option value="support">CSKH</option>
                          <option value="warehouse">Kho vận</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <div className="um-ltv-cell">
                          <span className={`um-tier-badge ${user.tierInfo?.badgeClass}`}>
                            {user.tierInfo?.icon} {user.tierInfo?.label}
                          </span>
                          <div className="um-spent-amount">
                            {user.totalSpent.toLocaleString("vi-VN")}₫
                            <span className="um-order-badge" title="Số đơn hàng thành công">
                              ({user.validOrderCount} đơn)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="um-note-cell">
                          {user.internalNote ? (
                            <span className="um-note-text" title={user.internalNote}>
                              <FaStickyNote className="um-note-icon" />
                              {user.internalNote}
                            </span>
                          ) : (
                            <span className="um-note-empty">--</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`um-status-badge ${user.status}`}>
                          {user.status === "active" ? "HOẠT ĐỘNG" : "ĐÃ KHÓA"}
                        </span>
                      </td>
                      <td>
                        <div className="um-action-group">
                          <button
                            className="btn-icon view"
                            title="Xem chi tiết & Ghi chú"
                            onClick={() => {
                              setSelectedUser(user);
                              setNoteEdit(user.internalNote || "");
                              setIsDetailOpen(true);
                            }}
                          >
                            <FaEye />
                          </button>
                          <button
                            className={`btn-icon status ${user.status}`}
                            title={
                              user.status === "active"
                                ? "Khóa tài khoản"
                                : "Mở khóa tài khoản"
                            }
                            onClick={() => toggleStatus(user)}
                          >
                            {user.status === "active" ? <FaUserSlash /> : <FaUserCheck />}
                          </button>
                          <button
                            className="btn-icon edit"
                            title="Chỉnh sửa tài khoản"
                            onClick={() => openEditModal(user)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn-icon delete"
                            title="Xóa người dùng"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION SECTION */}
        {totalPages > 1 && (
          <div className="um-pagination">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              ◀ Trước
            </button>
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  className={currentPage === page ? "active" : ""}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Sau ▶
            </button>
          </div>
        )}
      </div>

      {/* =========================
          MODAL: ADD / EDIT
      ========================== */}
      {isModalOpen && (
        <div className="um-modal-overlay">
          <div className="um-modal-content">
            <div className="um-modal-header">
              <h3>{editingId ? "CẬP NHẬT NGƯỜI DÙNG" : "THÊM THÀNH VIÊN MỚI"}</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="um-form">
              <div className="form-row">
                <div className="form-groups">
                  <label>Họ và tên *</label>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleInputChange}
                    placeholder="Nguyễn Văn A..."
                  />
                </div>
                <div className="form-groups">
                  <label>Tên đăng nhập (Username)</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleInputChange}
                    placeholder="nguyenvana..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-groups">
                  <label>Email liên hệ *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="form-groups">
                  <label>Số điện thoại</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="0912345678"
                  />
                </div>
              </div>

              <div className="form-groups">
                <label>Địa chỉ giao hàng mặc định</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleInputChange}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                />
              </div>

              <div className="form-groups">
                <label>
                  Mật khẩu {editingId ? "(để trống nếu không đổi)" : "*"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder={editingId ? "Nhập mật khẩu mới..." : "Tối thiểu 6 ký tự"}
                />
              </div>

              <div className="form-row">
                <div className="form-groups">
                  <label>Phân quyền nhân sự</label>
                  <select name="role" value={form.role} onChange={handleInputChange}>
                    <option value="user">Khách hàng (User)</option>
                    <option value="support">CSKH / Hỗ trợ (Support)</option>
                    <option value="warehouse">Quản lý kho vận (Warehouse)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div className="form-groups">
                  <label>Trạng thái tài khoản</label>
                  <select name="status" value={form.status} onChange={handleInputChange}>
                    <option value="active">Hoạt động bình thường</option>
                    <option value="locked">Tạm khóa tài khoản</option>
                  </select>
                </div>
              </div>

              <div className="form-groups">
                <label>Ghi chú nội bộ của Admin</label>
                <textarea
                  name="internalNote"
                  value={form.internalNote}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Ghi chú sở thích khách hàng, lưu ý giao hàng, phân loại đặc biệt..."
                />
              </div>

              <div className="um-modal-actions">
                <button type="submit" className="btn-confirm" disabled={isSubmitting}>
                  {isSubmitting ? "ĐANG LƯU..." : editingId ? "CẬP NHẬT" : "THÊM MỚI"}
                </button>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  HỦY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          MODAL: DETAIL PROFILE & INTERNAL NOTE
      ========================== */}
      {isDetailOpen && selectedUser && (
        <div className="um-modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="um-modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3>HỒ SƠ KHÁCH HÀNG &amp; THÀNH VIÊN</h3>
              <button className="modal-close-btn" onClick={() => setIsDetailOpen(false)}>
                ×
              </button>
            </div>

            <div className="detail-profile">
              <div
                className={`detail-avatar ${
                  selectedUser.tierInfo?.key === "diamond" ? "avatar-diamond" : ""
                }`}
              >
                {selectedUser.fullName?.charAt(0)?.toUpperCase()}
              </div>
              <h2>{selectedUser.fullName}</h2>
              <p>@{selectedUser.username}</p>
              <div className="detail-badges">
                <span className={`um-tier-badge ${selectedUser.tierInfo?.badgeClass}`}>
                  {selectedUser.tierInfo?.icon} Hạng {selectedUser.tierInfo?.label}
                </span>
                <span className={`um-role-badge role-${selectedUser.role}`}>
                  {ROLE_CONFIG[selectedUser.role]?.label || selectedUser.role}
                </span>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>ID Thành viên</span>
                <strong>#{selectedUser.id}</strong>
              </div>
              <div className="detail-item">
                <span>Email</span>
                <strong>{selectedUser.email}</strong>
              </div>
              <div className="detail-item">
                <span>Số điện thoại</span>
                <strong>{selectedUser.phone || "--"}</strong>
              </div>
              <div className="detail-item">
                <span>Trạng thái</span>
                <span className={`um-status-badge ${selectedUser.status}`}>
                  {selectedUser.status === "active" ? "HOẠT ĐỘNG" : "ĐÃ KHÓA"}
                </span>
              </div>
              <div className="detail-item">
                <span>Tổng chi tiêu (LTV)</span>
                <strong className="ltv-highlight">
                  {selectedUser.totalSpent?.toLocaleString("vi-VN")}₫
                </strong>
              </div>
              <div className="detail-item">
                <span>Đơn hàng tích lũy</span>
                <strong>{selectedUser.orderCount || 0} đơn hàng</strong>
              </div>
              <div className="detail-item full-width">
                <span>Địa chỉ giao hàng mặc định</span>
                <strong>{selectedUser.address || "Chưa cập nhật"}</strong>
              </div>
              <div className="detail-item full-width">
                <span>Ngày tham gia</span>
                <strong>
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleString("vi-VN")
                    : "Không xác định"}
                </strong>
              </div>
            </div>

            {/* Khối Ghi chú nội bộ Admin */}
            <div className="um-detail-internal-notes">
              <div className="internal-notes-header">
                <label>
                  <FaStickyNote /> Ghi chú nội bộ dành cho Ban Quản Trị:
                </label>
                <button
                  type="button"
                  className="btn-save-note"
                  onClick={() => handleSaveInternalNote(selectedUser.id)}
                  disabled={isSavingNote}
                >
                  <FaSave />
                  <span>{isSavingNote ? "Đang lưu..." : "Lưu ghi chú"}</span>
                </button>
              </div>
              <textarea
                value={noteEdit}
                onChange={(e) => setNoteEdit(e.target.value)}
                placeholder="Ghi chú sở thích, phản hồi đặc biệt, mức độ ưu tiên hoặc cảnh báo giao nhận..."
                rows={3}
              />
            </div>

            <div className="um-modal-actions">
              <button
                className="btn-confirm"
                onClick={() => {
                  setIsDetailOpen(false);
                  openEditModal(selectedUser);
                }}
              >
                <FaEdit />
                <span>Chỉnh sửa toàn diện</span>
              </button>
              <button className="btn-close" onClick={() => setIsDetailOpen(false)}>
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

export default UserManager;
