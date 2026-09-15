/**
 * HCORE STORE - EXPRESS MONGODB BACKEND SERVER (Unified / Ponytail)
 * Cung cấp RESTful API kết nối trực tiếp MongoDB Atlas Cloud.
 * Hỗ trợ toàn bộ CRUD collection + nghiệp vụ đặt hàng Checkout, VNPAY Sandbox & Admin.
 */
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import {
  PRODUCT_TABLES,
  createBaseOrder,
  createPaymentAttempt,
  fulfillOrder,
  isProtectedPaymentResource,
  processVnpayIpn,
  quoteCheckout,
  releaseCancelledOrder,
  sanitizeOrder,
  verifyVnpaySignature,
} from "./backend/vnpay.mjs";
import {
  getMomoConfig,
  createMomoPaymentAttempt,
  processMomoIpn,
  verifyMomoSignature,
} from "./backend/momo.mjs";

process.loadEnvFile?.();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "tmdt_daln";

app.use(cors());
app.use(express.json());

const client = new MongoClient(MONGO_URI);
await client.connect();
const db = client.db(DB_NAME);

const safeUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
console.log(`✅ [MongoDB Backend] Kết nối thành công: ${safeUri}/${DB_NAME}`);

// ==========================================
// HELPERS
// ==========================================
const formatDoc = (doc) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: rest.id !== undefined ? rest.id : String(_id) };
};

const buildIdQuery = (id) => ({
  $or: [
    { id },
    ...(Number.isFinite(+id) ? [{ id: +id }] : []),
    ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
  ],
});

const getClientIp = (req) =>
  req.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.socket.remoteAddress?.replace("::ffff:", "") ||
  "127.0.0.1";

const validateRequestId = (requestId) => {
  if (!requestId || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
    const error = new Error("Mã chống gửi trùng không hợp lệ.");
    error.status = 400;
    throw error;
  }
};

const handleError = (res, error) => {
  console.error("API ERROR:", error.message);
  res.status(error.status || 400).json({ error: error.message });
};

const getVnpayConfig = () => {
  const config = {
    tmnCode: process.env.VNP_TMN_CODE,
    hashSecret: process.env.VNP_HASH_SECRET,
    url: process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl: process.env.VNP_RETURN_URL || `http://127.0.0.1:${PORT}/api/payments/vnpay/return`,
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  };
  if (!config.tmnCode || !config.hashSecret) {
    const error = new Error("VNPAY Sandbox chưa được cấu hình đầy đủ trong .env.");
    error.status = 503;
    throw error;
  }
  return config;
};

// Đọc toàn bộ snapshot các bảng liên quan để phục vụ nghiệp vụ checkout
const getState = async () => {
  const tableNames = [
    "orders", "paymentAttempts", "cart", "vouchers", "userVouchers", "users",
    "products", "catenogies", "LaptopUser", "eventList", "appliances", "ProductPagies", "ProductMenus"
  ];
  const entries = await Promise.all(
    tableNames.map(async (name) => {
      const docs = await db.collection(name).find({}).toArray();
      return [name, docs.map(formatDoc)];
    })
  );
  const state = Object.fromEntries(entries);
  state.orders ||= [];
  state.paymentAttempts ||= [];
  state.cart ||= [];
  state.userVouchers ||= [];
  return state;
};

// Đồng bộ thay đổi từ state xuống MongoDB
const saveState = async (state) => {
  if (state.orders?.length) {
    for (const order of state.orders) {
      const { _id, ...clean } = order;
      await db.collection("orders").updateOne({ id: clean.id }, { $set: clean }, { upsert: true });
    }
  }
  if (state.paymentAttempts?.length) {
    for (const att of state.paymentAttempts) {
      const { _id, ...clean } = att;
      await db.collection("paymentAttempts").updateOne({ id: clean.id }, { $set: clean }, { upsert: true });
    }
  }
  if (state.userVouchers?.length) {
    for (const uv of state.userVouchers) {
      const { _id, ...clean } = uv;
      await db.collection("userVouchers").updateOne({ id: clean.id }, { $set: clean }, { upsert: true });
    }
  }
  const cartIds = (state.cart || []).map((c) => String(c.id));
  await db.collection("cart").deleteMany({ id: { $nin: cartIds } });

  for (const table of PRODUCT_TABLES) {
    for (const p of state[table] || []) {
      if (p.id !== undefined) {
        await db.collection(table).updateOne(
          { id: p.id },
          { $set: { stock: p.stock, soldCount: p.soldCount, stockLeft: p.stockLeft } }
        );
      }
    }
  }
};

const getUser = (req, state) => {
  const userId = req.get("x-user-id");
  const user = (state.users || []).find((u) => String(u.id) === String(userId));
  if (!user) {
    const error = new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
    error.status = 401;
    throw error;
  }
  return user;
};

const requireAdmin = (req, state) => {
  const user = getUser(req, state);
  if (user.role !== "admin") {
    const error = new Error("Bạn không có quyền quản trị.");
    error.status = 403;
    throw error;
  }
  return user;
};

const prepareCheckoutInput = (req, user) => ({
  ...req.body,
  userId: String(user.id),
  customer: req.body.customer || {},
});

const findIdempotentOrder = (state, userId, requestId) =>
  state.orders.find(
    (order) => String(order.userId) === String(userId) && order.idempotencyKey === requestId,
  );

const resultPayload = (order) => ({
  id: order.id,
  orderCode: order.orderCode,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.status,
  totalAmount: order.totalAmount,
  createdAt: order.createdAt,
  paidAt: order.paidAt || null,
  canRetryPayment:
    ["vnpay", "momo"].includes(order.paymentMethod) &&
    order.paymentStatus !== "paid" &&
    !["cancelled", "completed"].includes(order.status),
});

// ==========================================
// 1. NGHIỆP VỤ ĐẶT HÀNG & THANH TOÁN VNPAY
// ==========================================

// COD Checkout
app.post("/api/orders/checkout", async (req, res) => {
  try {
    const state = await getState();
    const user = getUser(req, state);
    validateRequestId(req.body.requestId);
    const method = req.body.paymentMethod;
    if (method !== "cod") return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ." });

    const existing = findIdempotentOrder(state, user.id, req.body.requestId);
    if (existing) {
      if (existing.paymentMethod !== method) {
        return res.status(409).json({ error: "Mã yêu cầu đã được dùng cho phương thức khác." });
      }
      return res.json({ order: sanitizeOrder(existing, { includeLookupToken: true }) });
    }

    const input = prepareCheckoutInput(req, user);
    const quote = quoteCheckout(state, input);
    const order = createBaseOrder({ input, quote, paymentMethod: method });
    order.paymentStatus = "unpaid";
    state.orders.push(order);
    fulfillOrder(state, order);
    await saveState(state);

    res.status(201).json({ order: sanitizeOrder(order, { includeLookupToken: true }) });
  } catch (error) {
    handleError(res, error);
  }
});

// Tạo phiên thanh toán VNPAY
app.post("/api/payments/vnpay/create", async (req, res) => {
  try {
    const config = getVnpayConfig();
    const state = await getState();
    const user = getUser(req, state);
    validateRequestId(req.body.requestId);

    const existing = findIdempotentOrder(state, user.id, req.body.requestId);
    if (existing) {
      if (existing.paymentMethod !== "vnpay") {
        return res.status(409).json({ error: "Mã yêu cầu đã được dùng cho phương thức khác." });
      }
      const attempt = state.paymentAttempts.find((item) => item.id === existing.latestPaymentAttemptId);
      return res.json({
        orderId: existing.id,
        orderCode: existing.orderCode,
        lookupToken: existing.lookupToken,
        paymentUrl: attempt?.paymentUrl || null,
      });
    }

    const input = prepareCheckoutInput(req, user);
    const now = new Date();
    const quote = quoteCheckout(state, input, { now });
    const order = createBaseOrder({ input, quote, paymentMethod: "vnpay", now });
    const attempt = createPaymentAttempt({ order, config, ipAddress: getClientIp(req), now });
    order.latestPaymentAttemptId = attempt.id;
    order.reservationExpiresAt = attempt.expiresAt;
    state.orders.push(order);
    state.paymentAttempts.push(attempt);
    await saveState(state);

    res.status(201).json({
      orderId: order.id,
      orderCode: order.orderCode,
      lookupToken: order.lookupToken,
      paymentUrl: attempt.paymentUrl,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Thử lại thanh toán VNPAY
app.post("/api/orders/:orderId/vnpay/retry", async (req, res) => {
  try {
    const config = getVnpayConfig();
    const state = await getState();
    const user = getUser(req, state);
    const order = state.orders.find((item) => item.id === req.params.orderId);
    if (!order || String(order.userId) !== String(user.id) || order.lookupToken !== req.body.lookupToken) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }
    if (order.paymentMethod !== "vnpay") return res.status(400).json({ error: "Đơn hàng không sử dụng VNPAY." });
    if (order.paymentStatus === "paid") return res.status(409).json({ error: "Đơn hàng đã được thanh toán." });
    if (["cancelled", "completed"].includes(order.status)) {
      return res.status(409).json({ error: "Trạng thái đơn hàng không cho phép thanh toán lại." });
    }

    const now = new Date();
    const input = {
      userId: order.userId,
      checkoutMode: order.checkoutMode,
      voucherCode: order.voucherCode,
      items: order.products.map((item) => ({
        productId: item.productId,
        fromTable: item.fromTable,
        quantity: item.quantity,
        cartId: item.cartId,
      })),
    };
    const quote = quoteCheckout(state, input, { now, excludeOrderId: order.id });
    Object.assign(order, quote, { paymentStatus: "pending", updatedAt: now.toISOString() });
    const attempt = createPaymentAttempt({ order, config, ipAddress: getClientIp(req), now });
    order.latestPaymentAttemptId = attempt.id;
    order.reservationExpiresAt = attempt.expiresAt;
    state.paymentAttempts.push(attempt);
    await saveState(state);

    res.status(201).json({
      paymentUrl: attempt.paymentUrl,
      lookupToken: order.lookupToken,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// VNPAY Return URL (Khách điều hướng trở lại từ trang thanh toán)
app.get("/api/payments/vnpay/return", async (req, res) => {
  let frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  let token = "";
  try {
    const config = getVnpayConfig();
    frontendUrl = config.frontendUrl;
    const state = await getState();
    const txnRef = req.query.vnp_TxnRef ? String(req.query.vnp_TxnRef) : null;
    const attempt = (state.paymentAttempts || []).find(
      (item) => txnRef && item.txnRef === txnRef,
    );
    const order =
      (attempt && (state.orders || []).find((item) => item.id === attempt.orderId)) ||
      (state.orders || []).find((item) => txnRef && item.orderCode === txnRef);
    const finalAttempt =
      attempt ||
      (order &&
        (state.paymentAttempts || []).find(
          (item) => item.id === order.latestPaymentAttemptId,
        ));

    token = order?.lookupToken || "";
    const signatureValid = verifyVnpaySignature(req.query, config.hashSecret);
    const vnpCode = req.query.vnp_ResponseCode;

    if (signatureValid && vnpCode === "00" && order && order.paymentStatus !== "paid") {
      fulfillOrder(state, order, new Date());
      if (finalAttempt) finalAttempt.status = "paid";
      order.paymentStatus = "paid";
      order.paidAt = new Date().toISOString();
      if (finalAttempt) order.paidPaymentAttemptId = finalAttempt.id;
      order.vnpTransactionNo = req.query.vnp_TransactionNo || null;
      order.reservationExpiresAt = null;
      order.updatedAt = new Date().toISOString();
      await saveState(state);
    } else if (vnpCode && vnpCode !== "00") {
      if (finalAttempt) {
        finalAttempt.status = "failed";
        finalAttempt.responseCode = vnpCode;
      }
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "failed";
        order.reservationExpiresAt = null;
        order.updatedAt = new Date().toISOString();
      }
      await saveState(state);
    }
  } catch (error) {
    console.error("VNPAY RETURN ERROR:", error.message);
  }
  const target = new URL("/payment-result", frontendUrl);
  target.searchParams.set("returned", "1");
  if (token) target.searchParams.set("token", token);
  if (req.query.vnp_ResponseCode) {
    target.searchParams.set("responseCode", String(req.query.vnp_ResponseCode));
  }
  res.redirect(target.toString());
});

// VNPAY IPN Webhook (VNPAY gọi ngầm cập nhật kết quả)
app.get("/api/payments/vnpay/ipn", async (req, res) => {
  try {
    const config = getVnpayConfig();
    const state = await getState();
    const result = processVnpayIpn({ state, query: req.query, config });
    if (result.changed) await saveState(state);
    res.json(result.response);
  } catch (error) {
    console.error("VNPAY IPN ERROR:", error.message);
    res.json({ RspCode: "99", Message: "Unknown error" });
  }
});

// Tạo phiên thanh toán MoMo Sandbox
app.post("/api/payments/momo/create", async (req, res) => {
  try {
    const config = getMomoConfig();
    const state = await getState();
    const user = getUser(req, state);
    validateRequestId(req.body.requestId);

    const existing = findIdempotentOrder(state, user.id, req.body.requestId);
    if (existing) {
      if (existing.paymentMethod !== "momo") {
        return res.status(409).json({ error: "Mã yêu cầu đã được dùng cho phương thức khác." });
      }
      const attempt = state.paymentAttempts.find((item) => item.id === existing.latestPaymentAttemptId);
      return res.json({
        orderId: existing.id,
        orderCode: existing.orderCode,
        lookupToken: existing.lookupToken,
        paymentUrl: attempt?.paymentUrl || null,
        qrCodeUrl: attempt?.qrCodeUrl || null,
        deeplink: attempt?.deeplink || null,
      });
    }

    const input = prepareCheckoutInput(req, user);
    const now = new Date();
    const quote = quoteCheckout(state, input, { now });
    const order = createBaseOrder({ input, quote, paymentMethod: "momo", now });
    const attempt = await createMomoPaymentAttempt({ order, config, ipAddress: getClientIp(req), now });
    order.latestPaymentAttemptId = attempt.id;
    order.reservationExpiresAt = attempt.expiresAt;
    state.orders.push(order);
    state.paymentAttempts.push(attempt);
    await saveState(state);

    res.status(201).json({
      orderId: order.id,
      orderCode: order.orderCode,
      lookupToken: order.lookupToken,
      paymentUrl: attempt.paymentUrl,
      qrCodeUrl: attempt.qrCodeUrl,
      deeplink: attempt.deeplink,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Thử lại thanh toán MoMo
app.post("/api/orders/:orderId/momo/retry", async (req, res) => {
  try {
    const config = getMomoConfig();
    const state = await getState();
    const user = getUser(req, state);
    const order = state.orders.find((item) => item.id === req.params.orderId);
    if (!order || String(order.userId) !== String(user.id) || order.lookupToken !== req.body.lookupToken) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }
    if (order.paymentMethod !== "momo") return res.status(400).json({ error: "Đơn hàng không sử dụng MoMo." });
    if (order.paymentStatus === "paid") return res.status(409).json({ error: "Đơn hàng đã được thanh toán." });
    if (["cancelled", "completed"].includes(order.status)) {
      return res.status(409).json({ error: "Trạng thái đơn hàng không cho phép thanh toán lại." });
    }

    const now = new Date();
    const input = {
      userId: order.userId,
      checkoutMode: order.checkoutMode,
      voucherCode: order.voucherCode,
      items: order.products.map((item) => ({
        productId: item.productId,
        fromTable: item.fromTable,
        quantity: item.quantity,
        cartId: item.cartId,
      })),
    };
    const quote = quoteCheckout(state, input, { now, excludeOrderId: order.id });
    Object.assign(order, quote, { paymentStatus: "pending", updatedAt: now.toISOString() });
    const attempt = await createMomoPaymentAttempt({ order, config, ipAddress: getClientIp(req), now });
    order.latestPaymentAttemptId = attempt.id;
    order.reservationExpiresAt = attempt.expiresAt;
    state.paymentAttempts.push(attempt);
    await saveState(state);

    res.status(201).json({
      paymentUrl: attempt.paymentUrl,
      qrCodeUrl: attempt.qrCodeUrl,
      deeplink: attempt.deeplink,
      lookupToken: order.lookupToken,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// MoMo Return URL (Khách điều hướng trở lại từ trang thanh toán)
app.get("/api/payments/momo/return", async (req, res) => {
  let frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  let token = "";
  try {
    const config = getMomoConfig();
    frontendUrl = config.frontendUrl;
    const state = await getState();
    let extra = {};
    try {
      if (req.query.extraData) {
        extra = JSON.parse(Buffer.from(req.query.extraData, "base64").toString("utf8"));
      }
    } catch {}

    const orderIdQuery = req.query.orderId ? String(req.query.orderId) : null;
    const requestIdQuery = req.query.requestId ? String(req.query.requestId) : null;

    const attempt = (state.paymentAttempts || []).find(
      (item) =>
        (orderIdQuery && item.txnRef === orderIdQuery) ||
        (requestIdQuery && item.momoRequestId === requestIdQuery),
    );

    const order =
      (attempt && (state.orders || []).find((item) => item.id === attempt.orderId)) ||
      (state.orders || []).find(
        (item) =>
          (orderIdQuery && item.orderCode === orderIdQuery) ||
          (extra.orderId && item.id === extra.orderId) ||
          (extra.lookupToken && item.lookupToken === extra.lookupToken),
      );

    const finalAttempt =
      attempt ||
      (order &&
        (state.paymentAttempts || []).find(
          (item) => item.id === order.latestPaymentAttemptId,
        ));

    token = order?.lookupToken || extra.lookupToken || "";
    const signatureValid = verifyMomoSignature(req.query, config.secretKey, config.accessKey);
    const resCode = Number(req.query.resultCode);

    if (signatureValid && resCode === 0 && order && order.paymentStatus !== "paid") {
      fulfillOrder(state, order, new Date());
      if (finalAttempt) finalAttempt.status = "paid";
      order.paymentStatus = "paid";
      order.paidAt = new Date().toISOString();
      if (finalAttempt) order.paidPaymentAttemptId = finalAttempt.id;
      order.momoTransId = req.query.transId || null;
      order.reservationExpiresAt = null;
      order.updatedAt = new Date().toISOString();
      await saveState(state);
    } else if (resCode !== 0) {
      if (finalAttempt) {
        finalAttempt.status = "failed";
        finalAttempt.resultCode = resCode;
        finalAttempt.message = req.query.message || "Giao dịch bị hủy hoặc thất bại";
      }
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "failed";
        order.reservationExpiresAt = null;
        order.updatedAt = new Date().toISOString();
      }
      await saveState(state);
    }
  } catch (error) {
    console.error("MOMO RETURN ERROR:", error.message);
  }
  const target = new URL("/payment-result", frontendUrl);
  target.searchParams.set("returned", "1");
  if (token) target.searchParams.set("token", token);
  if (req.query.resultCode !== undefined) {
    target.searchParams.set("resultCode", String(req.query.resultCode));
  }
  if (req.query.message) {
    target.searchParams.set("message", String(req.query.message));
  }
  res.redirect(target.toString());
});

// MoMo IPN Webhook (MoMo gửi ngầm thông báo kết quả)
app.post("/api/payments/momo/ipn", async (req, res) => {
  try {
    const config = getMomoConfig();
    const state = await getState();
    const result = processMomoIpn({ state, body: req.body, config });
    if (result.changed) await saveState(state);
    res.status(result.status || 200).json(result.response);
  } catch (error) {
    console.error("MOMO IPN ERROR:", error.message);
    res.status(500).json({ resultCode: 99, message: "Unknown error" });
  }
});

// Tra cứu trạng thái thanh toán bằng token
app.get("/api/payments/result/:lookupToken", async (req, res) => {
  const doc = await db.collection("orders").findOne({ lookupToken: req.params.lookupToken });
  if (!doc) return res.status(404).json({ error: "Không tìm thấy kết quả thanh toán." });
  res.json(resultPayload(formatDoc(doc)));
});

// Đơn hàng của người dùng đang đăng nhập
app.get("/api/orders/mine", async (req, res) => {
  try {
    const userId = req.get("x-user-id");
    if (!userId) return res.status(401).json({ error: "Chưa đăng nhập." });
    const docs = await db.collection("orders").find({ userId: String(userId) }).toArray();
    res.json(docs.map((o) => sanitizeOrder(formatDoc(o), { includeLookupToken: true })));
  } catch (error) {
    handleError(res, error);
  }
});

// Quản trị: Danh sách tất cả đơn hàng
app.get("/api/admin/orders", async (req, res) => {
  try {
    const user = await db.collection("users").findOne({ id: req.get("x-user-id") });
    if (user?.role !== "admin") return res.status(403).json({ error: "Bạn không có quyền quản trị." });
    const docs = await db.collection("orders").find({}).toArray();
    res.json(docs.map((o) => sanitizeOrder(formatDoc(o))));
  } catch (error) {
    handleError(res, error);
  }
});

// Quản trị: Cập nhật trạng thái đơn hàng (State machine)
app.patch("/api/admin/orders/:orderId/status", async (req, res) => {
  try {
    const state = await getState();
    requireAdmin(req, state);
    const order = state.orders.find((item) => String(item.id) === String(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const nextStatus = req.body.status;
    const transitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["shipping", "cancelled"],
      shipping: ["completed"],
      completed: [],
      cancelled: [],
    };
    if (!transitions[order.status]?.includes(nextStatus)) {
      return res.status(409).json({ error: "Chuyển trạng thái đơn hàng không hợp lệ." });
    }
    if (order.paymentMethod === "vnpay" && order.paymentStatus !== "paid" && ["confirmed", "shipping", "completed"].includes(nextStatus)) {
      return res.status(409).json({ error: "Đơn VNPAY chưa thanh toán nên chưa thể giao hàng." });
    }
    if (nextStatus === "cancelled" && order.paymentMethod === "vnpay" && order.paymentStatus === "paid") {
      return res.status(409).json({ error: "Đơn VNPAY đã thanh toán cần hoàn tiền trước khi hủy." });
    }

    if (nextStatus === "cancelled") releaseCancelledOrder(state, order);
    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    await saveState(state);

    res.json({ order: sanitizeOrder(order) });
  } catch (error) {
    handleError(res, error);
  }
});

// Quản trị: Xóa đơn hàng đã hoàn thành hoặc hủy
app.delete("/api/admin/orders/:orderId", async (req, res) => {
  try {
    const user = await db.collection("users").findOne({ id: req.get("x-user-id") });
    if (user?.role !== "admin") return res.status(403).json({ error: "Bạn không có quyền quản trị." });
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    if (order.paymentMethod === "vnpay") return res.status(409).json({ error: "Không thể xóa lịch sử đơn thanh toán VNPAY." });
    if (!["completed", "cancelled"].includes(order.status)) return res.status(409).json({ error: "Chỉ được xóa đơn đã hoàn thành hoặc đã hủy." });

    await db.collection("orders").deleteOne(buildIdQuery(req.params.orderId));
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

// ==========================================
// 2. KHÓA TRUY CẬP TRỰC TIẾP TÀI NGUYÊN THANH TOÁN
// ==========================================
app.use((req, res, next) => {
  if (isProtectedPaymentResource(req.path)) {
    return res.status(403).json({ error: "Tài nguyên thanh toán chỉ được truy cập qua API nghiệp vụ." });
  }
  next();
});

// ==========================================
// 3. RESTFUL CRUD DỮ LIỆU CHUNG (Tất cả collections)
// ==========================================

// Health check & database status
app.get("/api/db-status", async (_req, res) => {
  try {
    const cols = await db.listCollections().toArray();
    res.json({
      status: "connected",
      database: DB_NAME,
      uri: safeUri,
      collections: cols.map((c) => c.name),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET danh sách (lọc, regex tìm kiếm q, sắp xếp _sort, phân trang _limit & _page)
app.get("/:resource", async (req, res) => {
  try {
    const col = db.collection(req.params.resource);
    const { _sort, _order, _page, _limit, q, ...filters } = req.query;

    const query = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v === "true") query[k] = true;
      else if (v === "false") query[k] = false;
      else if (Number.isFinite(+v) && String(+v) === v) query[k] = { $in: [v, +v] };
      else query[k] = v;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ name: regex }, { fullName: regex }, { code: regex }];
    }

    let cursor = col.find(query);

    if (_sort) {
      cursor = cursor.sort({ [_sort]: _order === "desc" ? -1 : 1 });
    }

    if (_limit) {
      const limit = Math.max(1, parseInt(_limit, 10));
      const page = _page ? Math.max(1, parseInt(_page, 10)) : 1;
      cursor = cursor.skip((page - 1) * limit).limit(limit);
    } else if (_page) {
      const page = Math.max(1, parseInt(_page, 10));
      cursor = cursor.skip((page - 1) * 20).limit(20);
    }

    const docs = await cursor.toArray();
    res.json(docs.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET chi tiết theo ID
app.get("/:resource/:id", async (req, res) => {
  try {
    const doc = await db.collection(req.params.resource).findOne(buildIdQuery(req.params.id));
    if (!doc) return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    res.json(formatDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST tạo mới bản ghi
app.post("/:resource", async (req, res) => {
  try {
    const doc = { ...req.body };
    doc.id ??= Date.now().toString();
    await db.collection(req.params.resource).insertOne(doc);
    res.status(201).json(formatDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH / PUT cập nhật bản ghi
const handleUpdate = (isReplace) => async (req, res) => {
  try {
    const col = db.collection(req.params.resource);
    const query = buildIdQuery(req.params.id);
    const { _id, ...fields } = req.body;
    if (isReplace && fields.id === undefined) fields.id = req.params.id;

    const doc = await (isReplace
      ? col.findOneAndReplace(query, fields, { returnDocument: "after" })
      : col.findOneAndUpdate(query, { $set: fields }, { returnDocument: "after" }));

    if (!doc) return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật" });
    res.json(formatDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
app.patch("/:resource/:id", handleUpdate(false));
app.put("/:resource/:id", handleUpdate(true));

// DELETE xóa bản ghi
app.delete("/:resource/:id", async (req, res) => {
  try {
    const result = await db.collection(req.params.resource).deleteOne(buildIdQuery(req.params.id));
    if (!result.deletedCount) return res.status(404).json({ message: `Không tìm thấy id ${req.params.id} để xóa` });
    res.json({ success: true, message: "Xóa thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [MongoDB Backend] Đang chạy tại http://localhost:${PORT}`);
});
