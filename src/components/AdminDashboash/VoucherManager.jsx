import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { createNotification } from "../../utils/notify";
import { FaTicketAlt, FaPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import "./VoucherManager.css";

const API_URL = "http://localhost:3000";

const EMPTY_FORM = {
  code: "",
  type: "amount", // "amount" | "percent"
  value: "",
  maxDiscount: "", // chỉ áp dụng khi type = percent
  minOrder: "",
  des: "",
  expiredAt: "",
  maxCollect: "",
};

const formatVnd = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
const isExpired = (v) => new Date(v.expiredAt) < new Date();
const isSoldOut = (v) => v.collectedCount >= v.maxCollect;

const VoucherManager = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchVouchers = async () => {
    try {
      const res = await fetch(`${API_URL}/vouchers`);
      const data = await res.json();
      setVouchers(data.reverse());
    } catch (err) {
      console.error(err);
      toast.error("Không tải được danh sách voucher.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (v) => {
    setEditingId(v.id);
    setForm({
      code: v.code,
      type: v.type,
      value: v.value,
      maxDiscount: v.maxDiscount || "",
      minOrder: v.minOrder,
      des: v.des,
      expiredAt: v.expiredAt,
      maxCollect: v.maxCollect,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.code.trim()) return "Vui lòng nhập mã voucher.";
    if (!form.value || Number(form.value) <= 0)
      return "Giá trị giảm không hợp lệ.";
    if (!form.minOrder || Number(form.minOrder) < 0)
      return "Đơn tối thiểu không hợp lệ.";
    if (!form.expiredAt) return "Vui lòng chọn ngày hết hạn.";
    if (!form.maxCollect || Number(form.maxCollect) <= 0)
      return "Số lượt thu thập không hợp lệ.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder),
      des: form.des.trim(),
      expiredAt: form.expiredAt,
      maxCollect: Number(form.maxCollect),
      ...(form.type === "percent" && {
        maxDiscount: Number(form.maxDiscount || 0),
      }),
    };

    try {
      if (editingId) {
        const res = await fetch(`${API_URL}/vouchers/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Cập nhật voucher thành công!");
      } else {
        const res = await fetch(`${API_URL}/vouchers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, collectedCount: 0 }),
        });
        if (!res.ok) throw new Error();
        toast.success("Tạo voucher thành công!");

        // Bắn thông báo broadcast cho toàn bộ user biết có voucher mới
        const headline =
          payload.type === "amount"
            ? formatVnd(payload.value)
            : `${payload.value}%`;
        createNotification({
          userId: null,
          type: "voucher",
          title: `Voucher mới: Giảm ${headline}`,
          message: `${payload.des || "Nhập mã " + payload.code} — đơn tối thiểu ${formatVnd(payload.minOrder)}. Nhanh tay thu thập trước khi hết hạn ${new Date(payload.expiredAt).toLocaleDateString("vi-VN")}!`,
          link: "/tri-an-khach-hang",
        });
      }

      closeForm();
      fetchVouchers();
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v) => {
    if (
      !window.confirm(
        `Xoá voucher "${v.code}"? Hành động này không thể hoàn tác.`,
      )
    )
      return;
    try {
      const res = await fetch(`${API_URL}/vouchers/${v.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Đã xoá voucher.");
      fetchVouchers();
    } catch (err) {
      toast.error("Không thể xoá voucher.");
    }
  };

  if (loading)
    return <div className="loading-box">Đang tải danh sách voucher...</div>;

  return (
    <div className="voucher-manager-page">
      <div className="voucher-manager-header">
        <h2 className="admin-title">
          <FaTicketAlt /> QUẢN LÝ VOUCHER
        </h2>
        <button className="btn-create-voucher" onClick={openCreateForm}>
          <FaPlus /> Tạo voucher mới
        </button>
      </div>

      {formOpen && (
        <div className="voucher-form-overlay" onClick={closeForm}>
          <form
            className="voucher-form"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="voucher-form-header">
              <h3>{editingId ? "Chỉnh sửa voucher" : "Tạo voucher mới"}</h3>
              <button type="button" className="btn-close" onClick={closeForm}>
                <FaTimes />
              </button>
            </div>

            <div className="voucher-form-body">
              <label>
                Mã voucher
                <input
                  value={form.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  placeholder="VD: SANMUAHE50K"
                />
              </label>

              <label>
                Loại giảm giá
                <select
                  value={form.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                >
                  <option value="amount">Giảm số tiền cố định (đ)</option>
                  <option value="percent">Giảm theo phần trăm (%)</option>
                </select>
              </label>

              <label>
                Giá trị giảm {form.type === "amount" ? "(đ)" : "(%)"}
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => handleChange("value", e.target.value)}
                  placeholder={form.type === "amount" ? "50000" : "10"}
                />
              </label>

              {form.type === "percent" && (
                <label>
                  Giảm tối đa (đ)
                  <input
                    type="number"
                    value={form.maxDiscount}
                    onChange={(e) =>
                      handleChange("maxDiscount", e.target.value)
                    }
                    placeholder="100000"
                  />
                </label>
              )}

              <label>
                Đơn tối thiểu (đ)
                <input
                  type="number"
                  value={form.minOrder}
                  onChange={(e) => handleChange("minOrder", e.target.value)}
                  placeholder="500000"
                />
              </label>

              <label>
                Mô tả
                <textarea
                  value={form.des}
                  onChange={(e) => handleChange("des", e.target.value)}
                  placeholder="Giảm 50k cho đơn hàng từ 500k"
                  rows={2}
                />
              </label>

              <label>
                Ngày hết hạn
                <input
                  type="date"
                  value={form.expiredAt}
                  onChange={(e) => handleChange("expiredAt", e.target.value)}
                />
              </label>

              <label>
                Số lượt thu thập tối đa
                <input
                  type="number"
                  value={form.maxCollect}
                  onChange={(e) => handleChange("maxCollect", e.target.value)}
                  placeholder="500"
                />
              </label>
            </div>

            <div className="voucher-form-footer">
              <button type="button" className="btn-cancel" onClick={closeForm}>
                Huỷ
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving
                  ? "Đang lưu..."
                  : editingId
                    ? "Lưu thay đổi"
                    : "Tạo voucher"}
              </button>
            </div>
          </form>
        </div>
      )}

      {vouchers.length === 0 ? (
        <div className="no-vouchers">Chưa có voucher nào.</div>
      ) : (
        <div className="voucher-manager-list">
          {vouchers.map((v) => {
            const expired = isExpired(v);
            const soldOut = isSoldOut(v);
            return (
              <div className="voucher-manager-card" key={v.id}>
                <div className="voucher-manager-card__value">
                  {v.type === "amount" ? formatVnd(v.value) : `${v.value}%`}
                </div>

                <div className="voucher-manager-card__info">
                  <h4>{v.code}</h4>
                  <p>{v.des}</p>
                  <p className="meta">
                    Đơn tối thiểu {formatVnd(v.minOrder)} · HSD{" "}
                    {new Date(v.expiredAt).toLocaleDateString("vi-VN")}
                  </p>
                  <p className="meta">
                    Đã thu thập: {v.collectedCount}/{v.maxCollect}
                    {expired && (
                      <span className="tag tag--expired"> · Hết hạn</span>
                    )}
                    {!expired && soldOut && (
                      <span className="tag tag--soldout"> · Hết lượt</span>
                    )}
                  </p>
                </div>

                <div className="voucher-manager-card__actions">
                  <button className="btn-edit" onClick={() => openEditForm(v)}>
                    <FaEdit /> Sửa
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(v)}
                  >
                    <FaTrash /> Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default VoucherManager;
