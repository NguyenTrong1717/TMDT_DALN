export const ORDER_TRANSITIONS = Object.freeze({
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
});

export const SERVICE_TRANSITIONS = Object.freeze({
  pending: ["processing"],
  processing: ["done", "pending"],
  done: ["processing"],
});

export const RETURN_TRANSITIONS = Object.freeze({
  requested: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["completed", "failed"],
  failed: ["processing"],
  completed: [],
  rejected: [],
});

export const TIER_THRESHOLDS = Object.freeze([
  { key: "diamond", label: "Kim Cương", min: 40_000_000 },
  { key: "gold", label: "Vàng", min: 15_000_000 },
  { key: "silver", label: "Bạc", min: 5_000_000 },
  { key: "bronze", label: "Đồng", min: 0 },
]);

export const getCustomerTier = (spent = 0) =>
  TIER_THRESHOLDS.find((tier) => Number(spent) >= tier.min) || TIER_THRESHOLDS.at(-1);

export const assertOrderTransition = (order, nextStatus) => {
  if (!ORDER_TRANSITIONS[order.status]?.includes(nextStatus)) {
    throw Object.assign(new Error(`Không thể chuyển đơn từ ${order.status} sang ${nextStatus}.`), {
      status: 409,
    });
  }
  const online = ["vnpay", "momo"].includes(order.paymentMethod);
  if (online && order.paymentStatus !== "paid" && nextStatus !== "cancelled") {
    throw Object.assign(new Error("Đơn thanh toán online chưa được cổng thanh toán xác nhận."), {
      status: 409,
    });
  }
  if (nextStatus === "completed" && order.paymentStatus !== "paid") {
    throw Object.assign(new Error("Chỉ hoàn tất đơn sau khi đã ghi nhận thanh toán."), { status: 409 });
  }
};

export const paidNetAmount = (order) => {
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded") return 0;
  return Math.max(0, Number(order.totalAmount || 0) - Number(order.refundedAmount || 0));
};

export const refundableAmount = (order) =>
  Math.max(0, Number(order.totalAmount || 0) - Number(order.refundedAmount || 0));

export const validatePositiveMoney = (value, max, label = "Số tiền") => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error(`${label} phải là số lớn hơn 0.`), { status: 400 });
  }
  if (amount > max) {
    throw Object.assign(new Error(`${label} vượt quá số tiền còn có thể hoàn.`), { status: 409 });
  }
  return Math.round(amount);
};

export const buildStatusHistoryEntry = ({ from, to, actor, reason, at = new Date() }) => ({
  from,
  to,
  actorId: String(actor.id),
  actorName: actor.fullName || actor.username || actor.email || String(actor.id),
  actorRole: actor.role,
  reason: String(reason || "").trim() || null,
  at: at.toISOString(),
});

