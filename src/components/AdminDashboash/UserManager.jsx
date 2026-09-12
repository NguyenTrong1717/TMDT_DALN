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
} from "react-icons/fa";
import "./UserManager.css";

const BASE_URL = "http://localhost:3000/users";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^0\d{9}$/;

const UserManager = () => {
  // =========================
  // DATA STATES
  // =========================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================
  // FILTER STATES
  // =========================
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
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
  const itemsPerPage = 5;

  // =========================
  // MODAL STATES
  // =========================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // =========================
  // FORM STATES
  // =========================
  const defaultForm = {
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
    status: "active",
  };

  const [form, setForm] = useState(defaultForm);

  // =========================
  // FETCH USERS DATA
  // =========================
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(BASE_URL);

      if (!res.ok) {
        throw new Error("Không thể lấy dữ liệu.");
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setUsers([]);
        return;
      }

      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể kết nối tới json-server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      toast.warning("Số điện thoại không hợp lệ.");
      return false;
    }

    if (form.password.trim().length < 8) {
      toast.warning("Mật khẩu phải từ 8 ký tự trở lên.");
      return false;
    }

    return true;
  };

  // =========================
  // SORT HANDLER
  // =========================
  const handleSort = (field) => {
    const nextOrder =
      sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(nextOrder);
  };

  // =========================
  // ENGINE: FILTER + SEARCH + SORT
  // =========================
  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();
    let result = [...users];

    result = result.filter((user) => {
      const matchSearch =
        user.fullName?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.username?.toLowerCase().includes(keyword) ||
        user.phone?.includes(keyword);

      const matchRole = roleFilter === "all" ? true : user.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ? true : user.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });

    result.sort((a, b) => {
      if (sortField === "id") {
        return sortOrder === "asc"
          ? Number(a.id) - Number(b.id)
          : Number(b.id) - Number(a.id);
      }

      const valueA = String(a[sortField] || "");
      const valueB = String(b[sortField] || "");

      return sortOrder === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });

    return result;
  }, [users, searchTerm, roleFilter, statusFilter, sortField, sortOrder]);

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
      fullName: user.fullName,
      username: user.username || user.email.split("@")[0],
      email: user.email,
      phone: user.phone || "",
      password: user.password,
      role: user.role,
      status: user.status,
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
      (user) => user.email?.toLowerCase() === email && user.id !== editingId,
    );
    if (duplicatedEmail) {
      toast.error("Email đã tồn tại trong hệ thống.");
      return;
    }

    const duplicatedUsername = users.some(
      (user) =>
        user.username?.toLowerCase() === username.toLowerCase() &&
        user.id !== editingId,
    );
    if (duplicatedUsername) {
      toast.error("Username đã tồn tại.");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      username,
      email,
      phone: form.phone.trim(),
      password: form.password,
      role: form.role,
      status: form.status,
    };

    try {
      setIsSubmitting(true);

      if (editingId) {
        const res = await fetch(`${BASE_URL}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();

        const updatedUser = { ...payload, id: editingId };

        setUsers((prev) =>
          prev.map((user) =>
            user.id === editingId ? { ...user, ...updatedUser } : user,
          ),
        );
        toast.success("Cập nhật thành viên thành công.");
      } else {
        const newUser = {
          id: String(Date.now()),
          createdAt: new Date().toISOString(),
          ...payload,
        };

        const res = await fetch(BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser),
        });

        if (!res.ok) throw new Error();

        setUsers((prev) => [newUser, ...prev]);
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
        ? "Bạn có chắc muốn khóa tài khoản này?"
        : "Bạn có chắc muốn mở khóa tài khoản này?";

    if (!window.confirm(message)) return;

    try {
      const res = await fetch(`${BASE_URL}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error();

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, status: nextStatus } : item,
        ),
      );
      toast.success(
        nextStatus === "locked"
          ? "Đã khóa tài khoản."
          : "Đã mở khóa tài khoản.",
      );
    } catch (err) {
      console.error(err);
      toast.error("Không thể cập nhật trạng thái.");
    }
  };

  // =========================
  // ROLE MANAGER (AUTHORIZATION)
  // =========================
  const toggleRole = async (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (!window.confirm(`Chuyển quyền thành ${nextRole.toUpperCase()}?`))
      return;

    try {
      const res = await fetch(`${BASE_URL}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      if (!res.ok) throw new Error();

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, role: nextRole } : item,
        ),
      );
      toast.success("Đã thay đổi quyền thành công.");
    } catch (err) {
      console.error(err);
      toast.error("Không thể thay đổi quyền.");
    }
  };

  // =========================
  // DELETE USER
  // =========================
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa người dùng này?")) return;

    try {
      const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setUsers((prev) => prev.filter((user) => user.id !== id));
      toast.success("Đã xóa người dùng.");
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error("Xóa người dùng thất bại.");
    }
  };

  return (
    <div className="um-container">
      <div className="um-card">
        {/* HEADER AREA */}
        <div className="um-header-wrapper">
          <div>
            <h2>Quản Lý Người Dùng</h2>
            <p className="um-subtitle">
              Quản lý tài khoản, phân quyền và trạng thái người dùng
            </p>
          </div>
          <button onClick={openAddModal} className="um-btn-add">
            <FaUserPlus />
            <span>Thêm thành viên</span>
          </button>
        </div>

        {/* DASHBOARD STATS CARD */}
        <div className="um-dashboard">
          <div className="um-stat-card">
            <h4>Tổng thành viên</h4>
            <h2>{users.length}</h2>
            <span>Toàn bộ tài khoản</span>
          </div>
          <div className="um-stat-card">
            <h4>Quản trị viên</h4>
            <h2>{users.filter((user) => user.role === "admin").length}</h2>
            <span>Admin hệ thống</span>
          </div>
          <div className="um-stat-card">
            <h4>Người dùng</h4>
            <h2>{users.filter((user) => user.role === "user").length}</h2>
            <span>Thành viên</span>
          </div>
          <div className="um-stat-card">
            <h4>Đang hoạt động</h4>
            <h2>{users.filter((user) => user.status === "active").length}</h2>
            <span>Active</span>
          </div>
          <div className="um-stat-card">
            <h4>Đã khóa</h4>
            <h2>{users.filter((user) => user.status === "locked").length}</h2>
            <span>Locked</span>
          </div>
        </div>

        {/* FILTER BAR AREA */}
        <div className="um-filter-bar">
          <div className="um-search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên, username, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="um-filter-group">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả quyền</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>

        {/* ==========================================================================
            TABLE AREA (ĐÃ ĐƯỢC CHỈNH SỬA BỌC THÀNH CÔNG THEO CHUẨN HTML5)
           ========================================================================== */}
        <table className="um-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort("id")}
                style={{ cursor: "pointer" }}
              >
                ID <FaSort size={12} />
              </th>
              <th>Người dùng</th>
              <th
                onClick={() => handleSort("email")}
                style={{ cursor: "pointer" }}
              >
                Email <FaSort size={12} />
              </th>
              <th>Số điện thoại</th>
              <th
                onClick={() => handleSort("role")}
                style={{ cursor: "pointer" }}
              >
                Vai trò <FaSort size={12} />
              </th>
              <th
                onClick={() => handleSort("status")}
                style={{ cursor: "pointer" }}
              >
                Trạng thái <FaSort size={12} />
              </th>
              <th style={{ textAlign: "center", width: "220px" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "40px" }}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : currentUsers.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#94a3b8",
                  }}
                >
                  Không tìm thấy người dùng.
                </td>
              </tr>
            ) : (
              currentUsers.map((user) => (
                <tr key={user.id}>
                  <td>#{user.id}</td>
                  <td>
                    <div className="um-user-info">
                      <div className="um-avatar">
                        {user.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="um-user-name">{user.fullName}</div>
                        <div className="um-user-username">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone || "--"}</td>
                  <td>
                    <span className={`um-role-badge ${user.role}`}>
                      {user.role === "admin" ? "ADMIN" : "USER"}
                    </span>
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
                        title="Chi tiết"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDetailOpen(true);
                        }}
                      >
                        <FaEye />
                      </button>
                      <button
                        className="btn-icon role"
                        title="Đổi quyền"
                        onClick={() => toggleRole(user)}
                      >
                        <FaUserShield />
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
                        {user.status === "active" ? (
                          <FaUserSlash />
                        ) : (
                          <FaUserCheck />
                        )}
                      </button>
                      <button
                        className="btn-icon edit"
                        title="Chỉnh sửa"
                        onClick={() => openEditModal(user)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn-icon delete"
                        title="Xóa"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION SECTION */}
        {totalPages > 1 && (
          <div className="um-pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ◀
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
              ▶
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
              <h3>{editingId ? "CẬP NHẬT NGƯỜI DÙNG" : "THÊM NGƯỜI DÙNG"}</h3>
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
                    placeholder="Nhập họ và tên..."
                  />
                </div>
                <div className="form-groups">
                  <label>Username</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleInputChange}
                    placeholder="Username..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-groups">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="abc@gmail.com"
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
                <label>Mật khẩu *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="********"
                />
              </div>
              <div className="form-row">
                <div className="form-groups">
                  <label>Vai trò</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleInputChange}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-groups">
                  <label>Trạng thái</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="locked">Đã khóa</option>
                  </select>
                </div>
              </div>
              <div className="um-modal-actions">
                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "ĐANG LƯU..."
                    : editingId
                      ? "CẬP NHẬT"
                      : "THÊM MỚI"}
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
          MODAL: DETAIL PROFILE
      ========================== */}
      {isDetailOpen && selectedUser && (
        <div
          className="um-modal-overlay"
          onClick={() => setIsDetailOpen(false)}
        >
          <div
            className="um-modal-content detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="um-modal-header">
              <h3>CHI TIẾT NGƯỜI DÙNG</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsDetailOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="detail-profile">
              <div className="detail-avatar">
                {selectedUser.fullName?.charAt(0)?.toUpperCase()}
              </div>
              <h2>{selectedUser.fullName}</h2>
              <p>@{selectedUser.username}</p>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span>ID</span>
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
                <span>Username</span>
                <strong>{selectedUser.username}</strong>
              </div>
              <div className="detail-item">
                <span>Vai trò</span>
                <span className={`um-role-badge ${selectedUser.role}`}>
                  {selectedUser.role === "admin" ? "ADMIN" : "USER"}
                </span>
              </div>
              <div className="detail-item">
                <span>Trạng thái</span>
                <span className={`um-status-badge ${selectedUser.status}`}>
                  {selectedUser.status === "active" ? "HOẠT ĐỘNG" : "ĐÃ KHÓA"}
                </span>
              </div>
              <div className="detail-item full-width">
                <span>Ngày tạo tài khoản</span>
                <strong>
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleString("vi-VN")
                    : "Không xác định"}
                </strong>
              </div>
              <div className="detail-item full-width">
                <span>Mật khẩu</span>
                <strong>********</strong>
              </div>
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
                <span>Chỉnh sửa</span>
              </button>
              <button
                className="btn-close"
                onClick={() => setIsDetailOpen(false)}
              >
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
