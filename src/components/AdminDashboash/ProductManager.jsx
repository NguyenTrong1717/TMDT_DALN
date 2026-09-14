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
  FaFileExcel,
  FaExclamationTriangle,
  FaBarcode,
  FaCoins,
} from "react-icons/fa";
import { exportToCsv, logAudit } from "../../utils/exportCsv";
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
  sku: "",
  name: "",
  costPrice: "",
  price: "",
  oldPrice: "",
  category: "",
  brand: "",
  stock: "25",
  lowStockThreshold: "5",
  status: "Còn hàng",
  image: "",
  description: "",
  variants: [],
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

  // Quản lý biến thể (Variants) trong modal
  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [variantSku, setVariantSku] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

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
      const keyword = searchTerm.toLowerCase().trim();
      const matchSearch =
        !keyword ||
        String(item.name || "").toLowerCase().includes(keyword) ||
        String(item.sku || "").toLowerCase().includes(keyword) ||
        String(item.id || "").toLowerCase().includes(keyword) ||
        String(item.category || "").toLowerCase().includes(keyword) ||
        String(item.brand || "").toLowerCase().includes(keyword);

      const stockNum =
        item.stockLeft !== undefined && item.stockLeft !== null
          ? Number(item.stockLeft)
          : Number(item.stock || 0);

      const isAvailable = String(item.status || "").toLowerCase().includes("còn") && stockNum > 0;

      let matchStatus = true;
      if (statusFilter === "in_stock") matchStatus = isAvailable;
      else if (statusFilter === "out_of_stock") matchStatus = !isAvailable;
      else if (statusFilter === "low_stock") matchStatus = stockNum <= Number(item.lowStockThreshold || 5);

      return matchSearch && matchStatus;
    });
  }, [items, searchTerm, statusFilter]);

  // Phân trang
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

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
    setForm({
      ...EMPTY_FORM,
      sku: `SKU-${Date.now().toString().slice(-6)}`,
    });
    setVariantName("");
    setVariantPrice("");
    setVariantStock("");
    setVariantSku("");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    const stockVal =
      item.stock !== undefined
        ? String(item.stock)
        : item.stockLeft !== undefined
          ? String(item.stockLeft)
          : "25";

    setForm({
      sku: item.sku || `SKU-${String(item.id).padStart(4, "0")}`,
      name: item.name || "",
      costPrice: item.costPrice !== undefined ? String(item.costPrice) : "",
      price: item.price !== undefined ? String(item.price) : "",
      oldPrice: item.oldPrice !== undefined ? String(item.oldPrice) : "",
      category: item.category || "",
      brand: item.brand || "",
      stock: stockVal,
      lowStockThreshold: item.lowStockThreshold !== undefined ? String(item.lowStockThreshold) : "5",
      status: item.status || "Còn hàng",
      image: item.image || "",
      description: item.description || "",
      variants: Array.isArray(item.variants) ? item.variants : [],
    });
    setVariantName("");
    setVariantPrice("");
    setVariantStock("");
    setVariantSku("");
    setIsModalOpen(true);
  };

  // Thêm biến thể sản phẩm (Variant)
  const handleAddVariant = () => {
    if (!variantName.trim()) {
      toast.warning("Vui lòng nhập tên tùy chọn / biến thể!");
      return;
    }
    const newVariant = {
      id: Date.now().toString(),
      sku: variantSku.trim() || `${form.sku || "SKU"}-${form.variants.length + 1}`,
      name: variantName.trim(),
      price: variantPrice ? Number(variantPrice) : Number(form.price || 0),
      stock: variantStock ? Number(variantStock) : Number(form.stock || 25),
    };
    setForm((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant],
    }));
    setVariantName("");
    setVariantPrice("");
    setVariantStock("");
    setVariantSku("");
    toast.success(`Đã thêm biến thể: ${newVariant.name}`);
  };

  const handleRemoveVariant = (idx) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên sản phẩm!");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.warning("Vui lòng nhập giá bán sản phẩm hợp lệ!");
      return;
    }
    if (!form.image.trim()) {
      toast.warning("Vui lòng nhập đường dẫn hình ảnh sản phẩm!");
      return;
    }

    const stockVal = Number(form.stock) >= 0 ? Number(form.stock) : 25;
    const priceVal = Number(form.price);
    const costPriceVal = form.costPrice ? Number(form.costPrice) : Math.round(priceVal * 0.75);
    const oldPriceVal = form.oldPrice ? Number(form.oldPrice) : priceVal;
    const lowStockThresholdVal = Number(form.lowStockThreshold) >= 0 ? Number(form.lowStockThreshold) : 5;

    const maxId = items.length > 0 ? Math.max(...items.map((i) => Number(i.id) || 0)) : 0;
    const nextId = maxId + 1;

    const itemData = {
      sku: form.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      name: form.name.trim(),
      costPrice: costPriceVal,
      price: priceVal,
      oldPrice: oldPriceVal,
      stock: stockVal,
      stockLeft: stockVal,
      lowStockThreshold: lowStockThresholdVal,
      status: form.status || (stockVal > 0 ? "Còn hàng" : "Hết hàng"),
      category: form.category.trim(),
      brand: form.brand.trim(),
      image: form.image.trim(),
      description: form.description.trim(),
      variants: form.variants || [],
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const res = await fetch(`${BASE_URL}/${selectedTarget}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        });
        if (!res.ok) throw new Error("Cập nhật sản phẩm thất bại!");

        setItems((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...itemData } : item))
        );
        toast.success(`Đã cập nhật sản phẩm "${itemData.name}" thành công!`);
        logAudit(currentUser, "Cập nhật sản phẩm", `#${editingId} - ${itemData.name}`, `Giá: ${priceVal}, Tồn: ${stockVal}`);
      } else {
        const newItem = {
          id: nextId.toString(),
          ...itemData,
          soldCount: 0,
          createdAt: new Date().toISOString(),
        };

        const res = await fetch(`${BASE_URL}/${selectedTarget}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
        if (!res.ok) throw new Error("Thêm sản phẩm mới thất bại!");

        const created = await res.json();
        setItems((prev) => [created, ...prev]);
        toast.success(`Đã thêm mới sản phẩm "${itemData.name}"!`);
        logAudit(currentUser, "Thêm mới sản phẩm", `#${created.id} - ${itemData.name}`, `Bảng: ${selectedTarget}`);
      }

      setIsModalOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Có lỗi xảy ra khi lưu dữ liệu sản phẩm!");
    }
  };

  const handleDelete = async (id) => {
    const itemToDelete = items.find((i) => i.id === id);
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${itemToDelete?.name || id}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/${selectedTarget}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa sản phẩm thất bại!");

      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa sản phẩm thành công!");
      logAudit(currentUser, "Xóa sản phẩm", `#${id} - ${itemToDelete?.name || ""}`, `Bảng: ${selectedTarget}`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể xóa sản phẩm khỏi máy chủ!");
    }
  };

  // Xuất file Excel (CSV)
  const handleExportCsv = () => {
    try {
      const headers = [
        { label: "Mã ID", key: "id" },
        { label: "Mã SKU", key: (r) => r.sku || `SKU-${r.id}` },
        { label: "Tên sản phẩm", key: "name" },
        { label: "Danh mục", key: "category" },
        { label: "Thương hiệu", key: "brand" },
        { label: "Giá vốn (VNĐ)", key: (r) => r.costPrice || "" },
        { label: "Giá bán lẻ (VNĐ)", key: "price" },
        { label: "Giá niêm yết (VNĐ)", key: "oldPrice" },
        { label: "Lợi nhuận dự kiến (VNĐ)", key: (r) => (r.costPrice ? Number(r.price) - Number(r.costPrice) : "") },
        { label: "Tồn kho thực tế", key: (r) => r.stockLeft ?? r.stock ?? 0 },
        { label: "Trạng thái", key: "status" },
        { label: "Số lượng biến thể", key: (r) => (r.variants || []).length },
      ];

      exportToCsv(`Danh_sach_san_pham_${selectedTarget}`, headers, filteredItems);
      toast.success(`Đã xuất ${filteredItems.length} sản phẩm ra file Excel (CSV)!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="pm-container">
      <div className="pm-card">
        {/* HEADER BAR */}
        <div className="pm-header-wrapper">
          <div className="pm-controls">
            <div className="pm-title-group">
              <FaBox className="pm-title-icon" />
              <h2>QUẢN LÝ SẢN PHẨM &amp; KHO HÀNG</h2>
            </div>
            <span className="pm-total-badge">{items.length} sản phẩm</span>

            <div className="pm-target-wrap">
              <FaLayerGroup className="pm-input-icon" />
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="pm-select-target"
                title="Chọn nhóm sản phẩm"
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
            <div className="pm-search-box">
              <FaSearch className="pm-search-icon" />
              <input
                type="text"
                placeholder="Tìm theo tên, SKU, ID, hãng..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pm-search-input"
              />
              {searchTerm && (
                <button
                  className="pm-clear-search-btn"
                  onClick={() => setSearchTerm("")}
                >
                  &times;
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="pm-filter-select"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in_stock">Còn hàng</option>
              <option value="low_stock">⚠️ Cảnh báo sắp hết (≤5)</option>
              <option value="out_of_stock">Hết hàng</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="pm-btn-export"
              title="Xuất danh sách ra file Excel CSV"
            >
              <FaFileExcel /> Xuất Excel
            </button>

            <button onClick={openAddModal} className="pm-btn-add">
              <FaPlus /> Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU SẢN PHẨM */}
        <div className="pm-table-responsive">
          <table className="pm-table">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Mã SKU / ID</th>
                <th style={{ width: "70px" }}>Hình ảnh</th>
                <th>Tên sản phẩm &amp; Cấu hình</th>
                <th>Giá vốn &amp; Bán lẻ</th>
                <th>Tồn kho &amp; Biến thể</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "center", width: "160px" }}>Hành động</th>
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
                  const stockNum =
                    item.stockLeft !== undefined && item.stockLeft !== null
                      ? Number(item.stockLeft)
                      : Number(item.stock || 0);

                  const isAvailable =
                    String(item.status || "").toLowerCase().includes("còn") && stockNum > 0;

                  const cost = Number(item.costPrice || 0);
                  const price = Number(item.price || 0);
                  const profit = price - cost;
                  const isLowStock = stockNum <= Number(item.lowStockThreshold || 5);

                  return (
                    <tr key={item.id}>
                      <td className="pm-id-cell">
                        <div className="pm-sku-text">
                          <FaBarcode className="pm-barcode-icon" />
                          <span>{item.sku || `SKU-${item.id}`}</span>
                        </div>
                        <span className="pm-id-sub">#{item.id}</span>
                      </td>

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
                          {item.variants?.length > 0 && (
                            <span className="pm-meta-tag variant-count">
                              {item.variants.length} biến thể SKU
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="pm-price-cell">
                        <div className="pm-price-current">
                          {price.toLocaleString("vi-VN")}₫
                        </div>
                        {cost > 0 && (
                          <div className="pm-cost-text">
                            Vốn: {cost.toLocaleString("vi-VN")}₫
                            <span className="pm-profit-badge" title="Lợi nhuận gộp">
                              +{(profit).toLocaleString("vi-VN")}₫
                            </span>
                          </div>
                        )}
                        {item.oldPrice && Number(item.oldPrice) > price && (
                          <div className="pm-price-old">
                            Niêm yết: {Number(item.oldPrice).toLocaleString("vi-VN")}₫
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="pm-stock-block">
                          <span
                            className={`pm-stock-badge ${
                              stockNum === 0 ? "out" : isLowStock ? "low" : ""
                            }`}
                          >
                            {isLowStock && <FaExclamationTriangle />}
                            {stockNum} trong kho
                          </span>
                          {item.variants?.length > 0 && (
                            <span className="pm-variants-chip">
                              Tùy chọn: {item.variants.map((v) => v.name).join(", ")}
                            </span>
                          )}
                        </div>
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
                            title="Chỉnh sửa sản phẩm & kho"
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

      {/* MODAL THÊM / SỬA SẢN PHẨM & BIẾN THỂ KHO */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>
              <span>
                {editingId ? `Cập nhật sản phẩm #${editingId}` : "Thêm sản phẩm mới vào kho"}
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
              >
                &times;
              </button>
            </h3>

            <form onSubmit={handleSubmit} className="form-layouts">
              <div className="form-row">
                <div className="form-item">
                  <label>Mã SKU Kho *</label>
                  <input
                    type="text"
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="VD: SKU-PC-GAMING-01"
                    required
                  />
                </div>

                <div className="form-item flex-2">
                  <label>Tên sản phẩm *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="VD: PC Gaming HCore Ryzen 7 RTX 4070"
                    required
                  />
                </div>
              </div>

              {/* TÀI CHÍNH & GIÁ VỐN */}
              <div className="form-row">
                <div className="form-item">
                  <label>Giá vốn nhập kho (VNĐ)</label>
                  <input
                    type="number"
                    name="costPrice"
                    value={form.costPrice}
                    onChange={handleChange}
                    placeholder="VD: 15000000"
                  />
                  <small className="form-hint">Dùng để tính lợi nhuận nội bộ</small>
                </div>

                <div className="form-item">
                  <label>Giá bán lẻ (VNĐ) *</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="VD: 18500000"
                    required
                  />
                </div>

                <div className="form-item">
                  <label>Giá niêm yết (Gốc) (VNĐ)</label>
                  <input
                    type="number"
                    name="oldPrice"
                    value={form.oldPrice}
                    onChange={handleChange}
                    placeholder="VD: 20000000"
                  />
                </div>
              </div>

              {/* TỒN KHO & PHÂN LOẠI */}
              <div className="form-row">
                <div className="form-item">
                  <label>Số lượng tồn kho *</label>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="25"
                    min="0"
                    required
                  />
                </div>

                <div className="form-item">
                  <label>Ngưỡng cảnh báo hết hàng</label>
                  <input
                    type="number"
                    name="lowStockThreshold"
                    value={form.lowStockThreshold}
                    onChange={handleChange}
                    placeholder="5"
                    min="1"
                  />
                </div>

                <div className="form-item">
                  <label>Trạng thái</label>
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="Còn hàng">Còn hàng</option>
                    <option value="Hết hàng">Hết hàng</option>
                    <option value="Sắp về hàng">Sắp về hàng</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-item">
                  <label>Danh mục</label>
                  <input
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="VD: pc-gaming, laptop, vga"
                  />
                </div>

                <div className="form-item">
                  <label>Thương hiệu (Brand)</label>
                  <input
                    type="text"
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                    placeholder="VD: ASUS, MSI, Intel, AMD"
                  />
                </div>
              </div>

              <div className="form-item full">
                <label>Đường dẫn hình ảnh *</label>
                <input
                  type="text"
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="https://... hoặc /images/..."
                  required
                />
              </div>

              <div className="form-item full">
                <label>Mô tả chi tiết sản phẩm</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Thông số kỹ thuật, bảo hành, quà tặng đi kèm..."
                ></textarea>
              </div>

              {/* KHU VỰC QUẢN LÝ BIẾN THỂ SKU (VARIANTS) */}
              <div className="variants-section">
                <div className="variants-header">
                  <h4>
                    <FaCoins /> Biến thể sản phẩm (SKU Variants)
                  </h4>
                  <small>Cấu hình ram/ổ cứng, màu sắc hoặc phiên bản</small>
                </div>

                <div className="variants-input-row">
                  <input
                    type="text"
                    placeholder="Mã SKU (VD: SKU-RAM-32G)"
                    value={variantSku}
                    onChange={(e) => setVariantSku(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Tên tùy chọn (VD: 32GB RAM / 1TB SSD)"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Giá biến thể"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Tồn kho"
                    value={variantStock}
                    onChange={(e) => setVariantStock(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="btn-add-variant"
                  >
                    + Thêm
                  </button>
                </div>

                {form.variants?.length > 0 && (
                  <div className="variants-list">
                    {form.variants.map((v, idx) => (
                      <div className="variant-pill" key={v.id || idx}>
                        <span className="v-sku">{v.sku}</span>
                        <strong className="v-name">{v.name}</strong>
                        <span className="v-price">
                          {Number(v.price || form.price).toLocaleString("vi-VN")}₫
                        </span>
                        <span className="v-stock">Kho: {v.stock}</span>
                        <button
                          type="button"
                          className="v-remove"
                          onClick={() => handleRemoveVariant(idx)}
                          title="Xóa biến thể"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-save">
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
