import { useEffect, useState } from "react";
// --- THƯ VIỆN SONNER CAO CẤP ---
import { toast, Toaster } from "sonner";
import "./ProductManager.css";

const BASE_URL = "http://localhost:3000";

const ProductManager = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedTarget, setSelectedTarget] = useState("products");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    image: "",
  });

  // ===== LOGIC PHÂN TRANG =====
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const fetchData = async (target) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${target}`);
      const data = await res.json();
      setItems(data.filter((item) => !item.deleted));
      setCurrentPage(1); // Reset về trang 1 khi đổi danh mục
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedTarget);
  }, [selectedTarget]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ name: "", price: "", image: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: item.price,
      image: item.image,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Kiểm tra bỏ trống dữ liệu cơ bản
    if (!form.name.trim() || !form.price || !form.image.trim()) {
      toast.warning("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    const maxId =
      items.length > 0
        ? Math.max(...items.map((item) => Number(item.id) || 0))
        : 0;
    const nextId = maxId + 1;

    const itemData = {
      id: nextId,
      name: form.name,
      price: Number(form.price),
      image: form.image,
      deleted: false,
    };

    if (editingId) {
      delete itemData.id;
    }

    try {
      let res;
      if (editingId) {
        res = await fetch(`${BASE_URL}/${selectedTarget}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        });
      } else {
        res = await fetch(`${BASE_URL}/${selectedTarget}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        });
      }

      if (res.ok) {
        toast.success(
          editingId
            ? "Cập nhật sản phẩm thành công!"
            : "Thêm mới sản phẩm thành công!",
        );
        setIsModalOpen(false);
        fetchData(selectedTarget);
      } else {
        toast.error("Máy chủ phản hồi lỗi, không thể lưu dữ liệu!");
      }
    } catch (err) {
      toast.error("Thất bại: Lỗi kết nối tới Server json-server!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn muốn xoá sản phẩm này?")) return;

    try {
      const res = await fetch(`${BASE_URL}/${selectedTarget}/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const updatedItems = items.filter((item) => item.id !== id);
        setItems(updatedItems);
        const newTotalPages = Math.ceil(updatedItems.length / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages >= 1) {
          setCurrentPage(newTotalPages);
        }
        toast.success("Đã xóa vĩnh viễn sản phẩm khỏi hệ thống!");
      } else {
        toast.error("Không thể xóa sản phẩm trên server!");
      }
    } catch (err) {
      toast.error("Lỗi kết nối Server khi xóa dữ liệu!");
    }
  };

  return (
    <div className="pm-container">
      {/* KHU VỰC BẢNG DANH SÁCH */}
      <div className="pm-card">
        <div className="pm-header-wrapper">
          <div className="pm-controls">
            <h2>Danh sách sản phẩm ({items.length})</h2>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="pm-select-target"
            >
              <option value="products">Products</option>
              <option value="catenogies">Categories</option>
              <option value="eventList">Event List</option>
              <option value="LaptopUser">Laptop User</option>
              <option value="ProductPagies">Product Pagies</option>
              <option value="demoUnits">Prodemo</option>
              <option value="appliances">ProductMangaNew</option>
            </select>
          </div>

          <button onClick={openAddModal} className="pm-btn-add">
            Thêm sản phẩm mới
          </button>
        </div>

        <table className="pm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Giá tiền</th>
              <th style={{ textAlign: "center" }}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Loading...
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#94a3b8",
                  }}
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>
                    <img
                      src={item.image}
                      alt=""
                      className="pm-product-img"
                      onError={(e) =>
                        (e.target.src = "https://picsum.photos/50/50")
                      }
                    />
                  </td>
                  <td className="pm-product-name">{item.name}</td>
                  <td className="pm-product-price">
                    {item.price?.toLocaleString("vi-VN")}đ
                  </td>
                  <td>
                    <div className="pm-action-group">
                      <button
                        onClick={() => openEditModal(item)}
                        className="pm-btn-edit"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="pm-btn-delete"
                      >
                        DELETE
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* THANH PHÂN TRANG */}
        {items.length > itemsPerPage && (
          <div
            className="pm-pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "5px",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: currentPage === 1 ? "#f1f5f9" : "#fff",
                color: currentPage === 1 ? "#94a3b8" : "#334155",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontWeight: "600",
              }}
            >
              ◀
            </button>
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const isActive = currentPage === pageNumber;
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  style={{
                    padding: "6px 14px",
                    border: "1px solid",
                    borderColor: isActive ? "#0056cb" : "#cbd5e1",
                    borderRadius: "6px",
                    background: isActive ? "#0056cb" : "#fff",
                    color: isActive ? "#fff" : "#334155",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: currentPage === totalPages ? "#f1f5f9" : "#fff",
                color: currentPage === totalPages ? "#94a3b8" : "#334155",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontWeight: "600",
              }}
            >
              ▶
            </button>
          </div>
        )}
      </div>

      {/* GIAO DIỆN MODAL NỔI */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              {editingId ? "CẬP NHẬT SẢN PHẨM" : "THÊM SẢN PHẨM MỚI"}
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                X
              </button>
            </h3>

            <form onSubmit={handleSubmit} className="form-layouts">
              <div className="form-groups">
                <label>Tên sản phẩm *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nhập tên sản phẩm..."
                />
              </div>

              <div className="form-groups">
                <label>Giá bán (VNĐ) *</label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Nhập giá tiền..."
                />
              </div>

              <div className="form-groups">
                <label>Đường dẫn hình ảnh *</label>
                <input
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="Ví dụ: /images/pc.jpg hoặc link web..."
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-submit">
                  {editingId ? "XÁC NHẬN CẬP NHẬT" : "XÁC NHẬN LƯU"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-cancel"
                >
                  Quay lại danh sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster position="top-right" richColors closeButton duration={3000} />
    </div>
  );
};

export default ProductManager;
