import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaBolt,
  FaSearch,
  FaClock,
  FaSave,
  FaPlus,
  FaTimes,
} from "react-icons/fa";
import "./FlashSaleManager.css";

const API_URL = "http://localhost:3000";
const SOURCES = [
  { key: "LaptopUser", label: "Laptop" },
  { key: "eventList", label: "Linh kiện" },
  { key: "catenogies", label: "PC" },
];

const CATEGORIES_BY_SOURCE = {
  LaptopUser: [
    "laptop",
    "laptop-cu",
    "laptop-do-hoa",
    "laptop-gaming",
    "laptop-moi",
  ],
  eventList: ["cpu", "hdd", "mainboard", "monitor", "psu", "ram", "vga"],
  catenogies: ["top-ban-chay", "top-cuc-khung", "giai-nhiet", "man-hinh"],
};

const EMPTY_FORM = {
  source: "LaptopUser",
  name: "",
  price: "",
  discount: "10",
  category: CATEGORIES_BY_SOURCE.LaptopUser[0],
  image: "",
  status: "Còn hàng",
};

const toDatetimeLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const FlashSaleManager = () => {
  const [items, setItems] = useState([]); // gộp cả 2 nguồn, gắn thêm field "source"
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [onlyActive, setOnlyActive] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [savingTime, setSavingTime] = useState(false);
  const [editingId, setEditingId] = useState(null); // `${source}-${id}` đang sửa % giảm
  const [draftDiscount, setDraftDiscount] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [laptops, parts, cate, settings] = await Promise.all([
        fetch(`${API_URL}/LaptopUser`).then((r) => r.json()),
        fetch(`${API_URL}/eventList`).then((r) => r.json()),
        fetch(`${API_URL}/catenogies`).then((r) => r.json()),
        fetch(`${API_URL}/settings/flashSale`).then((r) =>
          r.ok ? r.json() : null,
        ),
      ]);
      const merged = [
        ...laptops.map((p) => ({ ...p, source: "LaptopUser" })),
        ...parts.map((p) => ({ ...p, source: "eventList" })),
        ...cate.map((p) => ({ ...p, source: "catenogies" })),
      ];
      setItems(merged);
      if (settings?.endTime) setEndTime(toDatetimeLocal(settings.endTime));
    } catch (err) {
      console.error("Lỗi tải dữ liệu Flash Sale:", err);
      toast.error("Không thể tải danh sách sản phẩm!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleToggleFlashSale = async (item) => {
    const nextValue = !item.flashSale;
    try {
      const res = await fetch(`${API_URL}/${item.source}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashSale: nextValue }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id && p.source === item.source
            ? { ...p, flashSale: nextValue }
            : p,
        ),
      );
      toast.success(
        nextValue
          ? `Đã thêm "${item.name}" vào Flash Sale`
          : `Đã gỡ "${item.name}" khỏi Flash Sale`,
      );
    } catch {
      toast.error("Không thể cập nhật trạng thái Flash Sale!");
    }
  };

  const handleStartEditDiscount = (item) => {
    setEditingId(`${item.source}-${item.id}`);
    setDraftDiscount(String(item.discount || 0));
  };

  const handleSaveDiscount = async (item) => {
    const percent = Number(draftDiscount);
    if (Number.isNaN(percent) || percent < 0 || percent > 90) {
      toast.warning("Phần trăm giảm giá phải từ 0 đến 90!");
      return;
    }
    const basePrice = item.oldPrice || item.price;
    const newPrice = Math.round((basePrice * (100 - percent)) / 100);
    try {
      const res = await fetch(`${API_URL}/${item.source}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount: percent,
          oldPrice: basePrice,
          price: newPrice,
        }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id && p.source === item.source
            ? { ...p, discount: percent, oldPrice: basePrice, price: newPrice }
            : p,
        ),
      );
      toast.success("Đã cập nhật giảm giá!");
      setEditingId(null);
    } catch {
      toast.error("Không thể cập nhật giảm giá!");
    }
  };

  const handleSaveEndTime = async () => {
    if (!endTime) {
      toast.warning("Vui lòng chọn thời gian kết thúc!");
      return;
    }
    setSavingTime(true);
    try {
      const isoTime = new Date(endTime).toISOString();
      const res = await fetch(`${API_URL}/settings/flashSale`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "flashSale", endTime: isoTime }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã cập nhật thời gian kết thúc Flash Sale!");
    } catch {
      toast.error("Không thể lưu thời gian kết thúc!");
    } finally {
      setSavingTime(false);
    }
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Đổi loại sản phẩm thì reset danh mục cho khớp
      if (field === "source") {
        next.category = CATEGORIES_BY_SOURCE[value][0];
      }
      return next;
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();

    const price = Number(form.price);
    const discount = Number(form.discount);

    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên sản phẩm!");
      return;
    }
    if (!price || price <= 0) {
      toast.warning("Vui lòng nhập giá bán hợp lệ!");
      return;
    }
    if (Number.isNaN(discount) || discount < 0 || discount > 90) {
      toast.warning("Phần trăm giảm giá phải từ 0 đến 90!");
      return;
    }

    // Giá bán nhập vào được xem là giá SAU giảm -> tính ngược ra giá gốc
    const oldPrice =
      discount > 0 ? Math.round(price / (1 - discount / 100)) : price;

    const newProduct = {
      id: Date.now().toString(),
      name: form.name.trim(),
      price,
      oldPrice,
      discount,
      category: form.category,
      status: form.status || "Còn hàng",
      soldPercent: 0,
      stockLeft: 20,
      image: form.image.trim() || "/images/no-image.jpg",
      flashSale: true, // Vừa tạo là hiện thẳng trên trang Flash Sale
      deleted: false,
    };

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/${form.source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      // db.json (qua json-server) đã "hứng" giá trị mới -> đồng bộ luôn vào state
      setItems((prev) => [{ ...saved, source: form.source }, ...prev]);
      toast.success(`Đã thêm "${newProduct.name}" vào Flash Sale!`);
      setForm(EMPTY_FORM);
      setShowAddModal(false);
    } catch {
      toast.error("Không thể thêm sản phẩm mới!");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = item.name
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const matchSource =
        sourceFilter === "all" ? true : item.source === sourceFilter;
      const matchActive = onlyActive ? item.flashSale : true;
      return matchSearch && matchSource && matchActive;
    });
  }, [items, search, sourceFilter, onlyActive]);

  const activeCount = items.filter((i) => i.flashSale).length;

  return (
    <div className="fsm-page">
      <div className="admin-title">
        <FaBolt />
        <span>Quản Lý Flash Sale</span>
      </div>

      {/* Cấu hình thời gian */}
      <div className="fsm-time-card">
        <div className="fsm-time-info">
          <FaClock className="fsm-time-icon" />
          <div>
            <div className="fsm-time-label">Thời gian kết thúc Flash Sale</div>
            <div className="fsm-time-sub">
              Đồng hồ đếm ngược trên trang Flash Sale sẽ chạy đến thời điểm này
            </div>
          </div>
        </div>
        <div className="fsm-time-actions">
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <button
            className="fsm-btn-save-time"
            onClick={handleSaveEndTime}
            disabled={savingTime}
          >
            <FaSave /> {savingTime ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="fsm-stats">
        <div className="fsm-stat-box">
          <span className="fsm-stat-num">{items.length}</span>
          <span className="fsm-stat-label">Tổng sản phẩm</span>
        </div>
        <div className="fsm-stat-box fsm-stat-box--accent">
          <span className="fsm-stat-num">{activeCount}</span>
          <span className="fsm-stat-label">Đang trong Flash Sale</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="fsm-toolbar">
        <div className="fsm-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Tìm sản phẩm theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="fsm-filters">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">Tất cả loại</option>
            {SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="fsm-checkbox">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Chỉ hiện SP đang Sale
          </label>
          <button
            className="fsm-btn-add"
            onClick={() => {
              setForm(EMPTY_FORM);
              setShowAddModal(true);
            }}
          >
            <FaPlus /> Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Bảng sản phẩm */}
      <div className="fsm-table-wrap">
        {loading ? (
          <div className="fsm-empty">Đang tải dữ liệu...</div>
        ) : filtered.length === 0 ? (
          <div className="fsm-empty">Không tìm thấy sản phẩm phù hợp.</div>
        ) : (
          <table className="fsm-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Loại</th>
                <th>Giá gốc</th>
                <th>% Giảm</th>
                <th>Giá bán</th>
                <th>Flash Sale</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const rowKey = `${item.source}-${item.id}`;
                const isEditing = editingId === rowKey;
                return (
                  <tr
                    key={rowKey}
                    className={item.flashSale ? "fsm-row--active" : ""}
                  >
                    <td>
                      <div className="fsm-product-cell">
                        <img src={item.image} alt={item.name} />
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td>{SOURCES.find((s) => s.key === item.source)?.label}</td>
                    <td>{(item.oldPrice || item.price)?.toLocaleString()}đ</td>
                    <td>
                      {isEditing ? (
                        <div className="fsm-discount-edit">
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={draftDiscount}
                            onChange={(e) => setDraftDiscount(e.target.value)}
                          />
                          <button onClick={() => handleSaveDiscount(item)}>
                            Lưu
                          </button>
                          <button
                            className="fsm-cancel"
                            onClick={() => setEditingId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          className="fsm-discount-btn"
                          onClick={() => handleStartEditDiscount(item)}
                        >
                          -{item.discount || 0}%
                        </button>
                      )}
                    </td>
                    <td className="fsm-price-cell">
                      {item.price?.toLocaleString()}đ
                    </td>
                    <td>
                      <label className="fsm-switch">
                        <input
                          type="checkbox"
                          checked={!!item.flashSale}
                          onChange={() => handleToggleFlashSale(item)}
                        />
                        <span className="fsm-slider" />
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal thêm sản phẩm mới */}
      {showAddModal && (
        <div
          className="fsm-modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div className="fsm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fsm-modal__head">
              <h3>Thêm sản phẩm vào Flash Sale</h3>
              <button
                className="fsm-modal__close"
                onClick={() => setShowAddModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="fsm-form" onSubmit={handleAddProduct}>
              <div className="fsm-form__row">
                <label>
                  Loại sản phẩm
                  <select
                    value={form.source}
                    onChange={(e) => handleFormChange("source", e.target.value)}
                  >
                    {SOURCES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Danh mục
                  <select
                    value={form.category}
                    onChange={(e) =>
                      handleFormChange("category", e.target.value)
                    }
                  >
                    {CATEGORIES_BY_SOURCE[form.source].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Tên sản phẩm
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="VD: Laptop Asus Vivobook 15..."
                  required
                />
              </label>

              <label>
                Link ảnh sản phẩm
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => handleFormChange("image", e.target.value)}
                  placeholder="/images/ten-anh.jpg"
                />
              </label>

              <div className="fsm-form__row">
                <label>
                  Giá bán (sau giảm)
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => handleFormChange("price", e.target.value)}
                    placeholder="9500000"
                    required
                  />
                </label>
                <label>
                  % Giảm giá
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={form.discount}
                    onChange={(e) =>
                      handleFormChange("discount", e.target.value)
                    }
                  />
                </label>
              </div>

              <p className="fsm-form__hint">
                Giá gốc sẽ được tự tính ngược từ giá bán và % giảm giá.
              </p>

              <div className="fsm-form__actions">
                <button
                  type="button"
                  className="fsm-form__cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="fsm-form__submit"
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu vào Flash Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashSaleManager;
