import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBox,
  FaLayerGroup,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import "./ProductManager.css";

const BASE_URL = "http://localhost:3000";

const TARGET_OPTIONS = [
  { value: "products", label: "Sản phẩm Nổi Bật (Trang chủ)" },
  { value: "ProductMenus", label: "PC Gaming & Flagship (Menu)" },
  { value: "LaptopUser", label: "Laptop & Notebooks" },
  { value: "catenogies", label: "Danh mục PC & Máy tính" },
  { value: "eventList", label: "Linh kiện & Phụ kiện" },
  { value: "ProductPagies", label: "Gian hàng & Showroom" },
  { value: "appliances", label: "Thiết bị & Gia dụng công nghệ" },
  { value: "demoUnits", label: "Máy trải nghiệm & Demo" },
];

const EMPTY_FORM = {
  name: "",
  price: "",
  oldPrice: "",
  category: "",
  brand: "",
  stock: "25",
  status: "Còn hàng",
  image: "",
  description: "",
};

const ProductManager = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedTarget, setSelectedTarget] = useState("products");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = async (target) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${target}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data.filter((item) => !item.deleted) : []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải dữ liệu danh sách sản phẩm!");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedTarget);
  }, [selectedTarget]);

  // Lọc và tìm kiếm
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        String(item.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.brand || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "in_stock" && String(item.status || "").toLowerCase().includes("còn")) ||
        (statusFilter === "out_of_stock" && !String(item.status || "").toLowerCase().includes("còn"));

      return matchSearch && matchStatus;
    });
  }, [items, searchTerm, statusFilter]);

  // Phân trang
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      price: item.price !== undefined ? String(item.price) : "",
      oldPrice: item.oldPrice !== undefined ? String(item.oldPrice) : "",
      category: item.category || "",
      brand: item.brand || "",
      stock: item.stock !== undefined ? String(item.stock) : item.stockLeft !== undefined ? String(item.stockLeft) : "25",
      status: item.status || "Còn hàng",
      image: item.image || "",
      description: item.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên sản phẩm!");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.warning("Vui lòng nhập giá sản phẩm hợp lệ!");
      return;
    }
    if (!form.image.trim()) {
      toast.warning("Vui lòng nhập đường dẫn hình ảnh sản phẩm!");
      return;
    }

    const stockVal = Number(form.stock) >= 0 ? Number(form.stock) : 25;
    const priceVal = Number(form.price);
    const oldPriceVal = form.oldPrice ? Number(form.oldPrice) : priceVal;

    const maxId = items.length > 0 ? Math.max(...items.map((i) => Number(i.id) || 0)) : 0;
    const nextId = maxId + 1;

    const itemData = {
      name: form.name.trim(),
      price: priceVal,
      oldPrice: oldPriceVal,
      stock: stockVal,
      stockLeft: stockVal,
      status: form.status || "Còn hàng",
      category: form.category ? form.category.trim() : "",
      brand: form.brand ? form.brand.trim() : "",
      image: form.image.trim(),
      description: form.description ? form.description.trim() : "",
      deleted: false,
    };

    if (!editingId) {
      itemData.id = nextId;
      itemData.rating = 5;
      itemData.reviewsCount = 0;
      itemData.soldCount = 0;
    }

    try {
      const url = editingId ? `${BASE_URL}/${selectedTarget}/${editingId}` : `${BASE_URL}/${selectedTarget}`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (res.ok) {
        toast.success(editingId ? "Cập nhật sản phẩm thành công!" : "Thêm mới sản phẩm thành công!");
        setIsModalOpen(false);
        fetchData(selectedTarget);
      } else {
        toast.error("Máy chủ phản hồi lỗi, không thể lưu dữ liệu!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Thất bại: Lỗi kết nối tới máy chủ API!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    try {
      const res = await fetch(`${BASE_URL}/${selectedTarget}/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const updated = items.filter((item) => item.id !== id);
        setItems(updated);
        toast.success("Đã xóa sản phẩm thành công!");
      } else {
        toast.error("Không thể xóa sản phẩm trên máy chủ!");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi xóa dữ liệu!");
    }
  };

  return (
    <div className="pm-container">
      <div className="pm-card">
        {/* HEADER CONTROLS */}
        <div className="pm-header-wrapper">
          <div className="pm-controls">
            <div className="pm-title-group">
              <FaBox className="pm-title-icon" />
              <h2>Quản Lý Sản Phẩm</h2>
              <span className="pm-total-badge">{filteredItems.length} sản phẩm</span>
            </div>

            {/* Chọn bảng danh mục */}
            <div className="pm-target-wrap">
              <FaLayerGroup className="pm-input-icon" />
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="pm-select-target"
                title="Chọn kho danh mục để quản lý"
              >
                {TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pm-header-actions">
            {/* Thanh tìm kiếm */}
            <div className="pm-search-box">
              <FaSearch className="pm-search-icon" />
              <input
                type="text"
                placeholder="Tìm tên, ID, thương hiệu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pm-search-input"
              />
            </div>

            {/* Lọc trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pm-filter-select"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in_stock">Còn hàng</option>
              <option value="out_of_stock">Hết hàng</option>
            </select>

            <button onClick={openAddModal} className="pm-btn-add">
              <FaPlus /> Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* BẢNG SẢN PHẨM */}
        <div className="pm-table-responsive">
          <table className="pm-table">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>ID</th>
                <th style={{ width: "80px" }}>Hình ảnh</th>
                <th>Tên sản phẩm & Thông tin</th>
                <th style={{ width: "160px" }}>Giá bán</th>
                <th style={{ width: "120px" }}>Tồn kho</th>
                <th style={{ width: "130px" }}>Trạng thái</th>
                <th style={{ width: "140px", textAlign: "center" }}>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="pm-loading-td">
                    Đang tải dữ liệu từ máy chủ MongoDB...
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="pm-empty-td">
                    <div className="pm-empty-container">
                      <FaSearch className="pm-empty-icon" />
                      <h4>Không tìm thấy sản phẩm nào phù hợp</h4>
                      <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái</p>
                      {(searchTerm || statusFilter !== "all") && (
                        <button
                          type="button"
                          className="pm-btn-clear-filters"
                          onClick={() => {
                            setSearchTerm("");
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
                currentItems.map((item) => {
                  const stockNum = item.stockLeft !== undefined && item.stockLeft !== null ? Number(item.stockLeft) : Number(item.stock || 0);
                  const isAvailable = String(item.status || "").toLowerCase().includes("còn") && stockNum > 0;

                  return (
                    <tr key={item.id}>
                      <td className="pm-id-cell">#{item.id}</td>
                      <td>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="pm-product-img"
                          onError={(e) => {
                            e.target.src = "https://picsum.photos/60/60";
                          }}
                        />
                      </td>
                      <td className="pm-name-cell">
                        <div className="pm-product-name">{item.name}</div>
                        <div className="pm-product-meta">
                          {item.category && <span className="pm-meta-tag">{item.category}</span>}
                          {item.brand && <span className="pm-meta-tag brand">{item.brand}</span>}
                          {item.rating && <span className="pm-meta-tag rating">★ {item.rating}</span>}
                        </div>
                      </td>
                      <td className="pm-price-cell">
                        <div className="pm-price-current">
                          {Number(item.price || 0).toLocaleString("vi-VN")}₫
                        </div>
                        {item.oldPrice && Number(item.oldPrice) > Number(item.price) && (
                          <div className="pm-price-old">
                            {Number(item.oldPrice).toLocaleString("vi-VN")}₫
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`pm-stock-badge ${stockNum <= 5 ? "low" : ""}`}>
                          {stockNum} cái
                        </span>
                      </td>
                      <td>
                        <span className={`pm-status-badge ${isAvailable ? "available" : "unavailable"}`}>
                          {isAvailable ? <FaCheckCircle /> : <FaTimesCircle />}
                          {item.status || (stockNum > 0 ? "Còn hàng" : "Hết hàng")}
                        </span>
                      </td>
                      <td>
                        <div className="pm-action-group">
                          <button
                            onClick={() => openEditModal(item)}
                            className="pm-btn-edit"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <FaEdit /> Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="pm-btn-delete"
                            title="Xóa sản phẩm"
                          >
                            <FaTrash /> Xóa
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

        {/* PHÂN TRANG */}
        {filteredItems.length > itemsPerPage && (
          <div className="pm-pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pm-page-btn nav"
            >
              ◀ Trang trước
            </button>

            <span className="pm-page-info">
              Trang <strong>{currentPage}</strong> / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pm-page-btn nav"
            >
              Trang sau ▶
            </button>
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA SẢN PHẨM */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              <span>{editingId ? `Cập nhật sản phẩm #${editingId}` : "Thêm sản phẩm mới"}</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
              >
                &times;
              </button>
            </h3>

            <form onSubmit={handleSubmit} className="form-layouts">
              {/* Tên sản phẩm */}
              <div className="form-groups">
                <label>Tên sản phẩm *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="VD: PC GAMING RYZEN 7-RTX 5070..."
                  required
                />
              </div>

              {/* Hàng 2: Giá & Giá cũ */}
              <div className="form-row-2">
                <div className="form-groups">
                  <label>Giá bán hiện tại (VNĐ) *</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="VD: 32990000"
                    min="1000"
                    required
                  />
                </div>
                <div className="form-groups">
                  <label>Giá gốc niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    name="oldPrice"
                    value={form.oldPrice}
                    onChange={handleChange}
                    placeholder="VD: 36990000"
                  />
                </div>
              </div>

              {/* Hàng 3: Tồn kho & Trạng thái */}
              <div className="form-row-2">
                <div className="form-groups">
                  <label>Số lượng tồn kho *</label>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="VD: 25"
                    min="0"
                    required
                  />
                </div>
                <div className="form-groups">
                  <label>Trạng thái</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="Còn hàng">Còn hàng</option>
                    <option value="Hết hàng">Hết hàng</option>
                  </select>
                </div>
              </div>

              {/* Hàng 4: Danh mục & Thương hiệu */}
              <div className="form-row-2">
                <div className="form-groups">
                  <label>Danh mục phân loại</label>
                  <input
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="VD: PC Gaming, Laptop, VGA..."
                  />
                </div>
                <div className="form-groups">
                  <label>Thương hiệu</label>
                  <input
                    type="text"
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                    placeholder="VD: ASUS, MSI, Gigabyte..."
                  />
                </div>
              </div>

              {/* URL Hình ảnh */}
              <div className="form-groups">
                <label>Đường dẫn hình ảnh (URL hoặc /images/...) *</label>
                <input
                  type="text"
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="VD: https://... hoặc /images/pc-gaming.png"
                  required
                />
              </div>

              {/* Mô tả ngắn */}
              <div className="form-groups">
                <label>Mô tả tóm tắt</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Thông số kỹ thuật hoặc ưu điểm nổi bật..."
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-submit">
                  {editingId ? "Lưu thay đổi" : "Tạo sản phẩm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
