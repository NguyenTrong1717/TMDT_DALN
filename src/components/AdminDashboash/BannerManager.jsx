import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSearch,
  FaImage,
  FaToggleOn,
  FaToggleOff,
  FaExternalLinkAlt,
  FaLayerGroup,
  FaCheckCircle,
  FaBan,
} from "react-icons/fa";
import { clearBannerCache } from "../../hooks/useBanners";
import "./BannerManager.css";

const API_URL = "http://localhost:3000";

const PLACEMENT_CONFIG = {
  hero_main: {
    label: "Slider Chính (Hero)",
    badgeColor: "#d70018",
    sizeTip: "Khuyến nghị: 800 × 385 px",
  },
  hero_side: {
    label: "3 Banner Cạnh Slider",
    badgeColor: "#ea580c",
    sizeTip: "Khuyến nghị: 390 × 120 px",
  },
  promo_tiles: {
    label: "4 Khối Nổi Bật Dưới Slider",
    badgeColor: "#0284c7",
    sizeTip: "Khuyến nghị: 285 × 110 px",
  },
  strip_wide: {
    label: "Banner Dài Ngang Trang",
    badgeColor: "#7c3aed",
    sizeTip: "Khuyến nghị: 1200 × 120 px",
  },
  category_promo: {
    label: "Khuyến Mãi Danh Mục",
    badgeColor: "#059669",
    sizeTip: "Khuyến nghị: 1200 × 180 px",
  },
  skyscraper_left: {
    label: "Dọc Mép Trái (Skyscraper)",
    badgeColor: "#b91c1c",
    sizeTip: "Khuyến nghị: 155 × 580 px",
  },
  skyscraper_right: {
    label: "Dọc Mép Phải (Skyscraper)",
    badgeColor: "#991b1b",
    sizeTip: "Khuyến nghị: 155 × 580 px",
  },
};

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  image: "",
  imageMobile: "",
  link: "/",
  placement: "hero_main",
  category: "",
  order: 0,
  active: true,
  startAt: "",
  endAt: "",
};

export default function BannerManager() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlacement, setFilterPlacement] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [previewImgModal, setPreviewImgModal] = useState(null);

  const getAdminHeaders = () => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      return {
        "Content-Type": "application/json",
        "x-user-id": String(currentUser?.id || ""),
      };
    } catch {
      return { "Content-Type": "application/json" };
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/banners`, {
          headers: getAdminHeaders(),
        });
        if (!res.ok) throw new Error(`Lỗi server (${res.status})`);
        const data = await res.json();
        if (!ignore) {
          setBanners(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          toast.error("Không tải được danh sách banner: " + err.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditModal = (b) => {
    setEditingId(b.id);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image: b.image || "",
      imageMobile: b.imageMobile || "",
      link: b.link || "/",
      placement: b.placement || "hero_main",
      category: b.category || "",
      order: Number(b.order) || 0,
      active: b.active !== false,
      startAt: b.startAt ? b.startAt.slice(0, 16) : "",
      endAt: b.endAt ? b.endAt.slice(0, 16) : "",
    });
    setFormOpen(true);
  };

  const closeModal = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleToggleActive = async (banner) => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/banners/${banner.id}/toggle`,
        {
          method: "PATCH",
          headers: getAdminHeaders(),
        },
      );
      if (!res.ok) throw new Error("Thao tác thất bại");
      const updated = await res.json();

      setBanners((prev) =>
        prev.map((item) => (item.id === banner.id ? updated : item)),
      );
      clearBannerCache();
      toast.success(
        `Đã ${updated.active ? "bật" : "tắt"} banner "${updated.title}"`,
      );
    } catch (err) {
      toast.error("Lỗi khi chuyển trạng thái: " + err.message);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa banner "${banner.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/banners/${banner.id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error("Không thể xóa banner");

      setBanners((prev) => prev.filter((item) => item.id !== banner.id));
      clearBannerCache();
      toast.success(`Đã xóa banner "${banner.title}" thành công`);
    } catch (err) {
      toast.error("Lỗi khi xóa banner: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return toast.error("Vui lòng nhập tiêu đề banner");
    }
    if (!form.image.trim()) {
      return toast.error("Vui lòng nhập đường dẫn hình ảnh banner");
    }
    if (!form.link.trim()) {
      return toast.error("Vui lòng nhập liên kết khi click");
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        image: form.image.trim(),
        imageMobile: form.imageMobile.trim(),
        link: form.link.trim(),
        placement: form.placement,
        category: form.category.trim(),
        order: Number(form.order) || 0,
        active: Boolean(form.active),
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      };

      const url = editingId
        ? `${API_URL}/api/admin/banners/${editingId}`
        : `${API_URL}/api/admin/banners`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi server (${res.status})`);
      }

      const saved = await res.json();

      if (editingId) {
        setBanners((prev) =>
          prev.map((item) => (item.id === editingId ? saved : item)),
        );
        toast.success("Cập nhật banner thành công!");
      } else {
        setBanners((prev) => [saved, ...prev]);
        toast.success("Thêm banner mới thành công!");
      }

      clearBannerCache();
      closeModal();
    } catch (err) {
      toast.error(err.message || "Không thể lưu banner");
    } finally {
      setSaving(false);
    }
  };

  // Lọc danh sách banner theo từ khóa, vị trí, trạng thái
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchSearch =
        !searchTerm.trim() ||
        (b.title &&
          b.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.subtitle &&
          b.subtitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.link && b.link.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.category &&
          b.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchPlacement =
        filterPlacement === "all" || b.placement === filterPlacement;

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && b.active) ||
        (filterStatus === "inactive" && !b.active);

      return matchSearch && matchPlacement && matchStatus;
    });
  }, [banners, searchTerm, filterPlacement, filterStatus]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((b) => b.active).length;
    const inactive = total - active;
    const placementsCount = new Set(banners.map((b) => b.placement)).size;
    return { total, active, inactive, placementsCount };
  }, [banners]);

  return (
    <div className="banner-manager-container">
      {/* 1. HEADER & THỐNG KÊ */}
      <div className="bm-header">
        <div className="bm-header-title">
          <div className="bm-title-row">
            <FaImage className="bm-header-icon" />
            <h1>Quản Lý Hệ Thống Banner & Quảng Cáo</h1>
          </div>
          <p className="bm-subtitle">
            Điều phối hiển thị tất cả các banner Hero, Khối Khuyến Mãi, Dải
            Ngang và Skyscraper 2 bên mép màn hình.
          </p>
        </div>

        <button
          type="button"
          className="bm-btn-create"
          onClick={openCreateModal}
        >
          <FaPlus /> Thêm Banner Mới
        </button>
      </div>

      {/* 2. STATS CARDS */}
      <div className="bm-stats-row">
        <div className="bm-stat-card">
          <div className="bm-stat-info">
            <span className="bm-stat-label">Tổng số banner</span>
            <span className="bm-stat-value">{stats.total}</span>
          </div>
          <div className="bm-stat-icon-wrap stat-total">
            <FaLayerGroup />
          </div>
        </div>

        <div className="bm-stat-card">
          <div className="bm-stat-info">
            <span className="bm-stat-label">Đang hiển thị</span>
            <span className="bm-stat-value stat-active-val">{stats.active}</span>
          </div>
          <div className="bm-stat-icon-wrap stat-active">
            <FaCheckCircle />
          </div>
        </div>

        <div className="bm-stat-card">
          <div className="bm-stat-info">
            <span className="bm-stat-label">Đang tạm tắt</span>
            <span className="bm-stat-value stat-inactive-val">
              {stats.inactive}
            </span>
          </div>
          <div className="bm-stat-icon-wrap stat-inactive">
            <FaBan />
          </div>
        </div>

        <div className="bm-stat-card">
          <div className="bm-stat-info">
            <span className="bm-stat-label">Vị trí triển khai</span>
            <span className="bm-stat-value">{stats.placementsCount} / 7</span>
          </div>
          <div className="bm-stat-icon-wrap stat-places">
            <FaImage />
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR LỌC & TÌM KIẾM */}
      <div className="bm-toolbar">
        <div className="bm-search-box">
          <FaSearch className="bm-search-icon" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, đường dẫn link, danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="bm-clear-search"
              onClick={() => setSearchTerm("")}
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div className="bm-filter-group">
          <select
            value={filterPlacement}
            onChange={(e) => setFilterPlacement(e.target.value)}
            className="bm-filter-select"
          >
            <option value="all">Tất cả vị trí (7 vị trí)</option>
            {Object.entries(PLACEMENT_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bm-filter-select"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bật (Active)</option>
            <option value="inactive">Đang tắt (Inactive)</option>
          </select>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH BANNER */}
      <div className="bm-table-card">
        {loading ? (
          <div className="bm-loading-state">
            <div className="bm-spinner" />
            <p>Đang tải dữ liệu banner...</p>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="bm-empty-state">
            <FaImage className="bm-empty-icon" />
            <h3>Không tìm thấy banner nào</h3>
            <p>
              Hãy thử tìm kiếm bằng từ khóa khác hoặc bấm nút thêm banner mới.
            </p>
          </div>
        ) : (
          <div className="bm-table-responsive">
            <table className="bm-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Ảnh</th>
                  <th>Tiêu đề & Nội dung</th>
                  <th style={{ width: "170px" }}>Vị trí hiển thị</th>
                  <th style={{ width: "160px" }}>Liên kết (Link)</th>
                  <th style={{ width: "80px", textAlign: "center" }}>
                    Thứ tự
                  </th>
                  <th style={{ width: "110px", textAlign: "center" }}>
                    Trạng thái
                  </th>
                  <th style={{ width: "110px", textAlign: "center" }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBanners.map((banner) => {
                  const placeCfg = PLACEMENT_CONFIG[banner.placement] || {
                    label: banner.placement,
                    badgeColor: "#64748b",
                  };
                  return (
                    <tr
                      key={banner.id}
                      className={!banner.active ? "bm-row-inactive" : ""}
                    >
                      <td>
                        <div
                          className="bm-thumb-wrap"
                          onClick={() => setPreviewImgModal(banner.image)}
                          title="Nhấp để xem ảnh lớn"
                        >
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="bm-thumb-img"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                "https://placehold.co/100x60/f1f5f9/94a3b8?text=Loi+Anh";
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="bm-cell-info">
                          <strong className="bm-item-title">
                            {banner.title}
                          </strong>
                          {banner.subtitle && (
                            <span className="bm-item-subtitle">
                              {banner.subtitle}
                            </span>
                          )}
                          {banner.category && (
                            <span className="bm-item-cat">
                              Danh mục: {banner.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className="bm-placement-badge"
                          style={{ backgroundColor: placeCfg.badgeColor }}
                        >
                          {placeCfg.label}
                        </span>
                      </td>
                      <td>
                        <a
                          href={banner.link}
                          target="_blank"
                          rel="noreferrer"
                          className="bm-link-preview"
                          title={banner.link}
                        >
                          <span>{banner.link}</span>
                          <FaExternalLinkAlt className="bm-ext-icon" />
                        </a>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="bm-order-tag">{banner.order ?? 0}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className={`bm-toggle-btn ${banner.active ? "active" : "inactive"}`}
                          onClick={() => handleToggleActive(banner)}
                          title={
                            banner.active
                              ? "Đang hiển thị - Bấm để tắt"
                              : "Đang ẩn - Bấm để bật"
                          }
                        >
                          {banner.active ? (
                            <>
                              <FaToggleOn /> BẬT
                            </>
                          ) : (
                            <>
                              <FaToggleOff /> TẮT
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="bm-actions">
                          <button
                            type="button"
                            className="bm-action-btn btn-edit"
                            onClick={() => openEditModal(banner)}
                            title="Sửa banner"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className="bm-action-btn btn-delete"
                            onClick={() => handleDelete(banner)}
                            title="Xóa banner"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL THÊM / SỬA BANNER */}
      {formOpen && (
        <div className="bm-modal-overlay" onClick={closeModal}>
          <div
            className="bm-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bm-modal-header">
              <h3>
                {editingId ? "Chỉnh Sửa Banner" : "Thêm Banner Mới"}
              </h3>
              <button
                type="button"
                className="bm-modal-close"
                onClick={closeModal}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="bm-modal-form">
              <div className="bm-form-grid">
                {/* Vị trí Placement */}
                <div className="bm-form-group span-2">
                  <label>
                    Vị Trí Triển Khai (Placement) <span className="req">*</span>
                  </label>
                  <select
                    value={form.placement}
                    onChange={(e) =>
                      setForm({ ...form, placement: e.target.value })
                    }
                    className="bm-form-control"
                    required
                  >
                    {Object.entries(PLACEMENT_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label} ({key})
                      </option>
                    ))}
                  </select>
                  <span className="bm-field-hint">
                    📐 {PLACEMENT_CONFIG[form.placement]?.sizeTip}
                  </span>
                </div>

                {/* Tiêu đề */}
                <div className="bm-form-group span-2">
                  <label>
                    Tiêu Đề Banner <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="bm-form-control"
                    placeholder="VD: SIÊU TIỆC CÔNG NGHỆ - GIẢM ĐẾN 40%"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Phụ đề */}
                <div className="bm-form-group span-2">
                  <label>Phụ Đề (Subtitle)</label>
                  <input
                    type="text"
                    className="bm-form-control"
                    placeholder="VD: Áp dụng Laptop Gaming RTX 40 Series"
                    value={form.subtitle}
                    onChange={(e) =>
                      setForm({ ...form, subtitle: e.target.value })
                    }
                  />
                </div>

                {/* Đường dẫn ảnh Desktop */}
                <div className="bm-form-group span-2">
                  <label>
                    Đường Dẫn Hình Ảnh (URL / Path) <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="bm-form-control"
                    placeholder="VD: /images/banner_sky_laptop.png hoặc https://..."
                    value={form.image}
                    onChange={(e) =>
                      setForm({ ...form, image: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Live Preview ảnh */}
                {form.image && (
                  <div className="bm-preview-box span-2">
                    <span className="bm-preview-label">Xem trước ảnh:</span>
                    <div className="bm-preview-img-container">
                      <img
                        src={form.image}
                        alt="Preview"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "https://placehold.co/400x150/f1f5f9/94a3b8?text=Anh+Khong+Ton+Tai";
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Đường dẫn link khi click */}
                <div className="bm-form-group span-2">
                  <label>
                    Liên Kết Khi Click (Link URL) <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="bm-form-control"
                    placeholder="VD: /category/laptop hoặc /san-sale"
                    value={form.link}
                    onChange={(e) =>
                      setForm({ ...form, link: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Danh mục áp dụng */}
                <div className="bm-form-group">
                  <label>Danh Mục (Category Filter)</label>
                  <input
                    type="text"
                    className="bm-form-control"
                    placeholder="VD: laptop, pc, cpu..."
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </div>

                {/* Thứ tự ưu tiên */}
                <div className="bm-form-group">
                  <label>Thứ Tự Ưu Tiên (Order)</label>
                  <input
                    type="number"
                    min="0"
                    className="bm-form-control"
                    value={form.order}
                    onChange={(e) =>
                      setForm({ ...form, order: Number(e.target.value) })
                    }
                  />
                  <span className="bm-field-hint">Số nhỏ hiển thị trước</span>
                </div>

                {/* Trạng thái Bật / Tắt */}
                <div className="bm-form-group span-2">
                  <label className="bm-switch-label">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm({ ...form, active: e.target.checked })
                      }
                    />
                    <span className="bm-switch-text">
                      Kích hoạt hiển thị banner này ngay lập tức
                    </span>
                  </label>
                </div>
              </div>

              <div className="bm-modal-footer">
                <button
                  type="button"
                  className="bm-btn-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bm-btn-submit"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu Thay Đổi"
                      : "Thêm Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL PHÓNG TO XEM ẢNH */}
      {previewImgModal && (
        <div
          className="bm-modal-overlay"
          onClick={() => setPreviewImgModal(null)}
        >
          <div
            className="bm-lightbox-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="bm-lightbox-close"
              onClick={() => setPreviewImgModal(null)}
            >
              <FaTimes />
            </button>
            <img
              src={previewImgModal}
              alt="Zoomed banner"
              className="bm-lightbox-img"
            />
          </div>
        </div>
      )}
    </div>
  );
}
