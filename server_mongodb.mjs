/**
 * HCORE STORE - EXPRESS MONGODB BACKEND SERVER (Unified / Ponytail)
 * Cung cấp RESTful API kết nối trực tiếp MongoDB Atlas Cloud.
 * Hỗ trợ toàn bộ CRUD collection + nghiệp vụ đặt hàng Checkout, VNPAY Sandbox & Admin.
 */
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
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
import {
  createSession,
  getBearerToken,
  hashPassword,
  hashToken,
  normalizeRole,
  publicUser,
  sanitizeAuditValue,
  verifyPassword,
} from "./backend/security.mjs";
import {
  ORDER_TRANSITIONS,
  RETURN_TRANSITIONS,
  SERVICE_TRANSITIONS,
  assertOrderTransition,
  buildStatusHistoryEntry,
  getCustomerTier,
  paidNetAmount,
  refundableAmount,
  validatePositiveMoney,
} from "./backend/admin-domain.mjs";

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "tmdt_daln";

app.use(cors({ allowedHeaders: ["Content-Type", "Authorization", "If-Match"] }));
app.use(express.json());

const client = new MongoClient(MONGO_URI);
await client.connect();
const db = client.db(DB_NAME);

await Promise.allSettled([
  db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
  db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  db.collection("users").createIndex({ emailNormalized: 1 }, { unique: true, partialFilterExpression: { emailNormalized: { $type: "string" } } }),
  db.collection("users").createIndex({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } }),
  db.collection("orders").createIndex(
    { userId: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
  ),
  db.collection("returns").createIndex(
    { orderId: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
  ),
  db.collection("userVouchers").createIndex({ userId: 1, voucherCode: 1 }, { unique: true }),
  db.collection("inventoryMovements").createIndex({ id: 1 }, { unique: true }),
]);

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

const sanitizeReturn = (doc, admin = false) => {
  const item = formatDoc(doc);
  if (admin || !item) return item;
  return {
    id: item.id,
    orderId: item.orderId,
    reason: item.reason,
    items: item.items,
    requestedAmount: item.requestedAmount,
    refundedAmount: item.refundedAmount,
    status: item.status,
    history: (item.history || []).map(({ from, to, at }) => ({ from, to, at })),
    restockedAt: item.restockedAt || null,
    restockedQuantity: Number(item.restockedQuantity || 0),
    manualRefund: item.manualRefund ? { amount: item.manualRefund.amount, reference: item.manualRefund.reference, confirmedAt: item.manualRefund.confirmedAt, mode: item.manualRefund.mode } : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

let mutationQueue = Promise.resolve();

const audit = async (actor, action, resource, resourceId, before = null, after = null, details = "") => {
  await db.collection("auditLogs").insertOne({
    id: `aud_${crypto.randomUUID()}`,
    actorId: String(actor.id),
    actor: actor.fullName || actor.username || actor.email || String(actor.id),
    role: actor.role,
    action,
    resource,
    resourceId: String(resourceId || ""),
    target: `${resource}${resourceId ? ` #${resourceId}` : ""}`,
    before: sanitizeAuditValue(before),
    after: sanitizeAuditValue(after),
    details: String(details || "").slice(0, 2000),
    timestamp: new Date().toISOString(),
  });
};

const recordOrderInventory = async (order, type, actorId = "system") => {
  for (const item of order.products || []) {
    const id = `mov_${type}_${order.id}_${item.fromTable}_${item.productId}_${item.variantId || "base"}`;
    await db.collection("inventoryMovements").updateOne(
      { id },
      { $setOnInsert: { id, type, fromTable: item.fromTable, productId: String(item.productId), variantId: item.variantId || null, quantity: Number(item.quantity), delta: type === "sale" ? -Number(item.quantity) : Number(item.quantity), orderId: String(order.id), reason: type === "sale" ? "Xuất kho theo đơn hàng" : "Giải phóng kho do hủy đơn", actorId: String(actorId), createdAt: new Date().toISOString() } },
      { upsert: true },
    );
  }
};

app.use(async (req, _res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return next();
    const session = await db.collection("sessions").findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!session) return next();
    const user = await db.collection("users").findOne(buildIdQuery(session.userId));
    if (user?.status === "active") {
      req.authUser = publicUser(user);
      req.authSession = session;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// MongoDB standalone does not support multi-document transactions. Serialize all
// mutations in this process; critical writes additionally use version/state predicates.
app.use(async (req, res, next) => {
  const paymentCallback = /^\/api\/payments\/vnpay\/(return|ipn)$/.test(req.path) ||
    /^\/api\/payments\/momo\/return$/.test(req.path);
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !paymentCallback) return next();
  const previous = mutationQueue;
  let release;
  mutationQueue = new Promise((resolve) => { release = resolve; });
  await previous;
  let released = false;
  const unlock = () => {
    if (!released) {
      released = true;
      release();
    }
  };
  res.once("finish", unlock);
  res.once("close", unlock);
  next();
});

const requireAuth = (req) => {
  if (!req.authUser) {
    throw Object.assign(new Error("Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị khóa."), { status: 401 });
  }
  return req.authUser;
};

const requireRoles = (req, roles) => {
  const user = requireAuth(req);
  if (!roles.includes(user.role)) {
    throw Object.assign(new Error("Bạn không có quyền thực hiện thao tác này."), { status: 403 });
  }
  return user;
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
    "orders", "paymentAttempts", "cart", "vouchers", "userVouchers", "users", "settings",
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
  Object.defineProperty(state, "__baseline", {
    value: Object.fromEntries(tableNames.map((name) => [name, structuredClone(state[name] || [])])),
    enumerable: false,
  });
  return state;
};

const sameSnapshot = (left, right) => JSON.stringify(left) === JSON.stringify(right);

// Chỉ ghi các bản ghi thực sự thay đổi; không xóa/ghi lại toàn bộ snapshot.
const saveState = async (state) => {
  const baseline = state.__baseline || {};
  for (const collectionName of ["orders", "paymentAttempts", "userVouchers", "cart"]) {
    const beforeById = new Map((baseline[collectionName] || []).map((item) => [String(item.id), item]));
    const afterById = new Map((state[collectionName] || []).map((item) => [String(item.id), item]));
    for (const item of state[collectionName] || []) {
      const before = beforeById.get(String(item.id));
      if (before && sameSnapshot(before, item)) continue;
      const { _id, ...clean } = item;
      if (collectionName === "orders" && before) {
        const oldVersion = Number(before.version || 0);
        clean.version = Math.max(Number(clean.version || 0), oldVersion + 1);
        const result = await db.collection(collectionName).updateOne(
          { id: clean.id, $or: [{ version: oldVersion }, ...(oldVersion === 0 ? [{ version: { $exists: false } }] : [])] },
          { $set: clean },
        );
        if (!result.modifiedCount) throw Object.assign(new Error(`Đơn ${clean.id} vừa được cập nhật bởi yêu cầu khác.`), { status: 409 });
      } else {
        if (collectionName === "orders") clean.version = Number(clean.version || 1);
        await db.collection(collectionName).updateOne({ id: clean.id }, { $set: clean }, { upsert: true });
      }
    }
    for (const [id, before] of beforeById) {
      if (!afterById.has(id)) await db.collection(collectionName).deleteOne(buildIdQuery(before.id));
    }
  }
  for (const table of PRODUCT_TABLES) {
    const beforeById = new Map((baseline[table] || []).map((item) => [String(item.id), item]));
    for (const p of state[table] || []) {
      if (p.id === undefined) continue;
      const before = beforeById.get(String(p.id));
      const inventoryBefore = before && { stock: before.stock, stockLeft: before.stockLeft, soldCount: before.soldCount, variants: before.variants };
      const inventoryAfter = { stock: p.stock, stockLeft: p.stockLeft, soldCount: p.soldCount, variants: p.variants };
      if (before && sameSnapshot(inventoryBefore, inventoryAfter)) continue;
      const oldVersion = Number(before?.inventoryVersion || 0);
      const result = await db.collection(table).updateOne(
        { id: p.id, ...(before ? { $or: [{ inventoryVersion: oldVersion }, ...(oldVersion === 0 ? [{ inventoryVersion: { $exists: false } }] : [])] } : {}) },
        { $set: { ...inventoryAfter, inventoryVersion: oldVersion + 1 } },
        { upsert: !before },
      );
      if (before && !result.modifiedCount) throw Object.assign(new Error(`Tồn kho ${table}/${p.id} vừa được cập nhật bởi yêu cầu khác.`), { status: 409 });
    }
  }
};

const getUser = (req) => requireAuth(req);
const requireAdmin = (req) => requireRoles(req, ["admin"]);

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
// AUTHENTICATION - server verified sessions
// ==========================================
app.post("/api/auth/register", async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^0\d{8,10}$/.test(phone)) {
      return res.status(400).json({ error: "Họ tên, email hoặc số điện thoại không hợp lệ." });
    }
    const exists = await db.collection("users").findOne({
      $or: [{ emailNormalized: email }, { email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }, { phone }],
    });
    if (exists) return res.status(409).json({ error: "Email hoặc số điện thoại đã được đăng ký." });
    const user = {
      id: `usr_${crypto.randomUUID()}`,
      fullName,
      email,
      emailNormalized: email,
      phone,
      passwordHash: await hashPassword(req.body.password),
      role: "user",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    await db.collection("users").insertOne(user);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const account = String(req.body.account || "").trim();
    const password = String(req.body.password || "");
    const escaped = account.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const candidates = await db.collection("users").find({
      $or: [
        { emailNormalized: account.toLowerCase() },
        { email: new RegExp(`^${escaped}$`, "i") },
        { phone: account },
        { username: new RegExp(`^${escaped}$`, "i") },
      ],
    }).limit(20).toArray();
    let user = null;
    for (const candidate of candidates) {
      let valid = candidate.passwordHash ? await verifyPassword(password, candidate.passwordHash) : false;
      // One-time migration for legacy plaintext accounts. The plaintext field is removed immediately.
      if (!candidate.passwordHash && candidate.password != null) {
        const actual = Buffer.from(String(password));
        const expected = Buffer.from(String(candidate.password));
        valid = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
        if (valid) {
          const passwordHash = await hashPassword(password);
          await db.collection("users").updateOne(
            { _id: candidate._id },
            { $set: { passwordHash, emailNormalized: String(candidate.email || "").toLowerCase(), updatedAt: new Date().toISOString() }, $unset: { password: "" } },
          );
          candidate.passwordHash = passwordHash;
          delete candidate.password;
        }
      }
      if (valid) { user = candidate; break; }
    }
    if (!user) return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không chính xác." });
    if (user.status !== "active") return res.status(423).json({ error: "Tài khoản đang bị khóa." });
    const session = createSession(user.id ?? user._id);
    await db.collection("sessions").insertOne(session.document);
    await audit(publicUser(user), "auth.login", "session", session.document.id);
    res.json({ token: session.token, user: publicUser(user), expiresAt: session.document.expiresAt });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    res.json({ user: requireAuth(req) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const user = requireAuth(req);
    await db.collection("sessions").deleteOne({ _id: req.authSession._id });
    await audit(user, "auth.logout", "session", req.authSession.id);
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
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
    await recordOrderInventory(order, "sale", user.id);

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

    const amountValid = finalAttempt && String(finalAttempt.amount) === String(req.query.vnp_Amount);
    if (signatureValid && amountValid && vnpCode === "00" && order && !["paid", "partially_refunded", "refunded"].includes(order.paymentStatus)) {
      fulfillOrder(state, order, new Date());
      if (finalAttempt) finalAttempt.status = "paid";
      if (order.status === "cancelled") {
        order.status = "pending";
        order.reopenedByLatePayment = true;
      }
      order.paymentStatus = "paid";
      order.paidAt = new Date().toISOString();
      if (finalAttempt) order.paidPaymentAttemptId = finalAttempt.id;
      order.vnpTransactionNo = req.query.vnp_TransactionNo || null;
      order.reservationExpiresAt = null;
      order.updatedAt = new Date().toISOString();
      await saveState(state);
      await recordOrderInventory(order, "sale");
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
    if (result.changed) {
      await saveState(state);
      const attempt = state.paymentAttempts.find((item) => item.txnRef === req.query.vnp_TxnRef);
      const paidOrder = attempt && state.orders.find((item) => item.id === attempt.orderId && item.paymentStatus === "paid");
      if (paidOrder) await recordOrderInventory(paidOrder, "sale");
    }
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

    const amountValid = finalAttempt && Number(finalAttempt.amount) === Number(req.query.amount);
    if (signatureValid && amountValid && resCode === 0 && order && !["paid", "partially_refunded", "refunded"].includes(order.paymentStatus)) {
      fulfillOrder(state, order, new Date());
      if (finalAttempt) finalAttempt.status = "paid";
      if (order.status === "cancelled") {
        order.status = "pending";
        order.reopenedByLatePayment = true;
      }
      order.paymentStatus = "paid";
      order.paidAt = new Date().toISOString();
      if (finalAttempt) order.paidPaymentAttemptId = finalAttempt.id;
      order.momoTransId = req.query.transId || null;
      order.reservationExpiresAt = null;
      order.updatedAt = new Date().toISOString();
      await saveState(state);
      await recordOrderInventory(order, "sale");
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
    if (result.changed) {
      await saveState(state);
      const attempt = state.paymentAttempts.find((item) => item.txnRef === req.body.orderId || item.momoRequestId === req.body.requestId);
      const paidOrder = attempt && state.orders.find((item) => item.id === attempt.orderId && item.paymentStatus === "paid");
      if (paidOrder) await recordOrderInventory(paidOrder, "sale");
    }
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
    const user = requireAuth(req);
    const docs = await db.collection("orders").find({ userId: String(user.id), archivedByCustomer: { $ne: true } }).toArray();
    res.json(docs.map((o) => sanitizeOrder(formatDoc(o), { includeLookupToken: true })));
  } catch (error) {
    handleError(res, error);
  }
});

// Quản trị: Danh sách tất cả đơn hàng
app.get("/api/admin/orders", async (req, res) => {
  try {
    requireRoles(req, ["admin", "warehouse", "support"]);
    const docs = await db.collection("orders").find({ archived: { $ne: true } }).sort({ createdAt: -1 }).toArray();
    res.json(docs.map((o) => sanitizeOrder(formatDoc(o), { admin: true })));
  } catch (error) {
    handleError(res, error);
  }
});

// Quản trị: Cập nhật trạng thái đơn hàng (State machine)
app.patch("/api/admin/orders/:orderId/status", async (req, res) => {
  try {
    const state = await getState();
    const actor = requireRoles(req, ["admin", "warehouse"]);
    const order = state.orders.find((item) => String(item.id) === String(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

    const nextStatus = req.body.status;
    if (nextStatus === "cancelled" && actor.role !== "admin") return res.status(403).json({ error: "Chỉ quản trị viên được hủy đơn." });
    if (nextStatus === "shipping") {
      return res.status(409).json({ error: "Hãy dùng API bàn giao vận chuyển để lưu đơn vị và mã theo dõi." });
    }
    assertOrderTransition(order, nextStatus);
    if (nextStatus === "cancelled" && !String(req.body.reason || "").trim()) {
      return res.status(400).json({ error: "Cần nhập lý do hủy đơn." });
    }
    if (nextStatus === "cancelled" && refundableAmount(order) > 0 && ["paid", "partially_refunded"].includes(order.paymentStatus)) {
      return res.status(409).json({ error: "Đơn đã thanh toán phải hoàn đủ phần tiền còn lại trước khi hủy." });
    }

    const previousStatus = order.status;
    if (nextStatus === "cancelled") releaseCancelledOrder(state, order);
    order.status = nextStatus;
    if (nextStatus === "cancelled" && order.cancellationRequest?.status === "requested") {
      order.cancellationRequest = { ...order.cancellationRequest, status: "approved", resolvedAt: new Date().toISOString(), resolvedBy: String(actor.id) };
    }
    order.version = Number(order.version || 0) + 1;
    order.statusHistory ||= [];
    order.statusHistory.push(buildStatusHistoryEntry({ from: previousStatus, to: nextStatus, actor, reason: req.body.reason }));
    if (nextStatus === "delivered") order.deliveredAt = new Date().toISOString();
    if (nextStatus === "completed") order.completedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    await saveState(state);
    if (nextStatus === "cancelled") await recordOrderInventory(order, "release", actor.id);

    await audit(actor, "order.status_changed", "order", order.id, { status: previousStatus }, { status: nextStatus }, req.body.reason);

    res.json({ order: sanitizeOrder(order, { admin: true }) });
  } catch (error) {
    handleError(res, error);
  }
});

// Lưu trữ đơn khỏi danh sách mặc định; lịch sử không bị xóa cứng.
app.delete("/api/admin/orders/:orderId", async (req, res) => {
  try {
    const user = requireAdmin(req);
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    if (!["completed", "cancelled"].includes(order.status)) return res.status(409).json({ error: "Chỉ được lưu trữ đơn đã hoàn thành hoặc đã hủy." });

    await db.collection("orders").updateOne({ _id: order._id }, { $set: { archived: true, archivedAt: new Date().toISOString(), archivedBy: String(user.id) } });
    await audit(user, "order.archived", "order", order.id);
    res.json({ success: true, archived: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.patch("/api/admin/orders/:orderId/shipping", async (req, res) => {
  try {
    const actor = requireRoles(req, ["admin", "warehouse"]);
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    if (order.status !== "confirmed") return res.status(409).json({ error: "Chỉ đơn đã xác nhận mới được bàn giao vận chuyển." });
    if (["vnpay", "momo"].includes(order.paymentMethod) && order.paymentStatus !== "paid") {
      return res.status(409).json({ error: "Đơn online chưa thanh toán không được đưa đi giao." });
    }
    const carrier = String(req.body.carrier || "").trim();
    if (!carrier) return res.status(400).json({ error: "Cần chọn đơn vị vận chuyển." });
    const trackingCode = String(req.body.trackingCode || "").trim() || `HCORE-${Date.now().toString(36).toUpperCase()}`;
    const generatedInternally = !String(req.body.trackingCode || "").trim();
    const now = new Date();
    const version = Number(order.version || 0);
    const history = buildStatusHistoryEntry({ from: "confirmed", to: "shipping", actor, reason: req.body.reason || "Bàn giao vận chuyển", at: now });
    const result = await db.collection("orders").findOneAndUpdate(
      { _id: order._id, status: "confirmed", $or: [{ version }, ...(version === 0 ? [{ version: { $exists: false } }] : [])] },
      { $set: { status: "shipping", shippingCarrier: carrier, trackingCode, trackingCodeSource: generatedInternally ? "internal_demo" : "manual", shippedAt: now.toISOString(), updatedAt: now.toISOString() }, $inc: { version: 1 }, $push: { statusHistory: history } },
      { returnDocument: "after" },
    );
    if (!result) return res.status(409).json({ error: "Đơn đã được nhân viên khác cập nhật. Hãy tải lại." });
    await audit(actor, "order.shipping_assigned", "order", order.id, { status: order.status }, { status: "shipping", carrier, trackingCode, generatedInternally });
    res.json({ order: sanitizeOrder(formatDoc(result), { admin: true }), trackingNotice: generatedInternally ? "Mã theo dõi nội bộ phục vụ demo, chưa phải vận đơn của hãng." : null });
  } catch (error) { handleError(res, error); }
});

app.patch("/api/admin/orders/:orderId/internal-note", async (req, res) => {
  try {
    const actor = requireRoles(req, ["admin", "support"]);
    const internalNote = String(req.body.internalNote || "").trim().slice(0, 4000);
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    await db.collection("orders").updateOne({ _id: order._id }, { $set: { internalNote, updatedAt: new Date().toISOString() }, $inc: { version: 1 } });
    await audit(actor, "order.internal_note_updated", "order", order.id, { internalNote: order.internalNote || "" }, { internalNote });
    res.json({ success: true, internalNote });
  } catch (error) { handleError(res, error); }
});

app.post("/api/admin/orders/:orderId/collect-cod", async (req, res) => {
  try {
    const actor = requireRoles(req, ["admin", "warehouse"]);
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    if (order.paymentMethod !== "cod" || order.status !== "delivered") return res.status(409).json({ error: "Chỉ xác nhận thu COD sau khi đơn COD đã giao." });
    if (order.paymentStatus === "paid") return res.json({ order: sanitizeOrder(formatDoc(order), { admin: true }), idempotent: true });
    const reference = String(req.body.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Cần mã đối soát/biên nhận thu COD." });
    const updated = await db.collection("orders").findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: "paid" }, status: "delivered" },
      { $set: { paymentStatus: "paid", paidAt: new Date().toISOString(), codCollectionReference: reference, updatedAt: new Date().toISOString() }, $inc: { version: 1 } },
      { returnDocument: "after" },
    );
    if (!updated) return res.status(409).json({ error: "Đơn đã thay đổi. Hãy tải lại." });
    await audit(actor, "payment.cod_collected", "order", order.id, { paymentStatus: order.paymentStatus }, { paymentStatus: "paid", reference });
    res.json({ order: sanitizeOrder(formatDoc(updated), { admin: true }) });
  } catch (error) { handleError(res, error); }
});

app.post("/api/orders/:orderId/cancellation-request", async (req, res) => {
  try {
    const actor = requireAuth(req);
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order || String(order.userId) !== String(actor.id)) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    if (!["pending", "confirmed"].includes(order.status)) return res.status(409).json({ error: "Chỉ yêu cầu hủy khi đơn đang chờ hoặc đã xác nhận." });
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 3) return res.status(400).json({ error: "Cần nhập lý do hủy." });
    if (order.cancellationRequest?.status === "requested") return res.json({ cancellationRequest: order.cancellationRequest, idempotent: true });
    const cancellationRequest = { status: "requested", reason, requestedBy: String(actor.id), requestedAt: new Date().toISOString() };
    await db.collection("orders").updateOne({ _id: order._id }, { $set: { cancellationRequest, updatedAt: new Date().toISOString() }, $inc: { version: 1 } });
    await audit(actor, "order.cancellation_requested", "order", order.id, null, cancellationRequest);
    res.status(201).json({ cancellationRequest });
  } catch (error) { handleError(res, error); }
});

app.post("/api/admin/orders/:orderId/manual-refund", async (req, res) => {
  try {
    const actor = requireAdmin(req);
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    if (!["pending", "confirmed"].includes(order.status)) return res.status(409).json({ error: "API này chỉ ghi nhận hoàn thủ công trước khi hủy đơn chưa giao." });
    const refundKey = `cancellation:${order.id}`;
    const existing = (order.refundRecords || []).find((item) => item.key === refundKey);
    if (existing) return res.json({ manual: true, idempotent: true, manualRefund: existing, message: "Chứng từ hoàn hủy đơn đã được ghi nhận trước đó." });
    if (!["paid", "partially_refunded"].includes(order.paymentStatus)) return res.status(409).json({ error: "Đơn không có khoản đã thu cần hoàn." });
    const remaining = refundableAmount(order);
    const amount = validatePositiveMoney(req.body.amount, remaining, "Số tiền hoàn");
    if (amount !== remaining) return res.status(409).json({ error: "Hủy đơn yêu cầu hoàn đủ toàn bộ khoản còn lại đã thu." });
    const reference = String(req.body.reference || "").trim();
    const evidence = String(req.body.evidence || "").trim();
    const reason = String(req.body.reason || "").trim();
    if (!reference || !evidence || reason.length < 3) return res.status(400).json({ error: "Cần lý do, mã tham chiếu và bằng chứng hoàn tiền." });
    const now = new Date().toISOString();
    const manualRefund = { key: refundKey, amount, reference, evidence, reason, method: String(req.body.method || "bank_transfer"), confirmedBy: String(actor.id), confirmedAt: now, mode: "manual_record" };
    const updated = await db.collection("orders").findOneAndUpdate(
      { _id: order._id, "refundRecords.key": { $ne: refundKey }, refundedAmount: order.refundedAmount ?? { $exists: false } },
      { $inc: { refundedAmount: amount, version: 1 }, $set: { paymentStatus: "refunded", updatedAt: now }, $push: { refundRecords: manualRefund } },
      { returnDocument: "after" },
    );
    if (!updated) return res.status(409).json({ error: "Dữ liệu hoàn tiền vừa thay đổi. Hãy tải lại." });
    await audit(actor, "refund.cancellation_manual_recorded", "order", order.id, null, manualRefund, reason);
    res.json({ manual: true, message: "Đã ghi nhận chứng từ hoàn tiền thủ công; hệ thống không tự chuyển tiền.", manualRefund, order: sanitizeOrder(formatDoc(updated), { admin: true }) });
  } catch (error) { handleError(res, error); }
});

app.post("/api/orders/:orderId/returns", async (req, res) => {
  try {
    const actor = requireAuth(req);
    validateRequestId(req.body.requestId);
    const order = await db.collection("orders").findOne(buildIdQuery(req.params.orderId));
    if (!order || (actor.role === "user" && String(order.userId) !== String(actor.id))) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    if (!["delivered", "completed"].includes(order.status)) return res.status(409).json({ error: "Chỉ yêu cầu trả hàng sau khi đã nhận hàng." });
    const existing = await db.collection("returns").findOne({ orderId: String(order.id), idempotencyKey: req.body.requestId });
    if (existing) return res.json(sanitizeReturn(existing, actor.role !== "user"));
    const priorRequests = await db.collection("returns").find({ orderId: String(order.id), status: { $nin: ["rejected", "failed"] } }).toArray();
    const activeRequest = priorRequests.find((item) => ["requested", "approved", "processing"].includes(item.status));
    if (activeRequest) return res.status(409).json({ error: `Đơn đã có yêu cầu trả hàng ${activeRequest.id} đang xử lý.` });
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 5) return res.status(400).json({ error: "Lý do trả hàng phải có ít nhất 5 ký tự." });
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requestedItems.length) return res.status(400).json({ error: "Cần chọn ít nhất một mặt hàng." });
    const returnItemKeys = new Set();
    const items = requestedItems.map((item) => {
      const itemKey = `${item.fromTable}:${item.productId}:${item.variantId || "base"}`;
      if (returnItemKeys.has(itemKey)) throw Object.assign(new Error("Mặt hàng bị lặp trong yêu cầu trả."), { status: 400 });
      returnItemKeys.add(itemKey);
      const ordered = (order.products || []).find((p) => String(p.productId) === String(item.productId) && p.fromTable === item.fromTable && String(p.variantId || "") === String(item.variantId || ""));
      const quantity = Number(item.quantity);
      const previouslyRequested = priorRequests.flatMap((entry) => entry.items || []).filter((entry) => String(entry.productId) === String(item.productId) && entry.fromTable === item.fromTable && String(entry.variantId || "") === String(item.variantId || "")).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
      if (!ordered || !Number.isInteger(quantity) || quantity <= 0 || quantity + previouslyRequested > Number(ordered.quantity)) {
        throw Object.assign(new Error("Mặt hàng hoặc số lượng trả không hợp lệ."), { status: 400 });
      }
      return { productId: String(ordered.productId), fromTable: ordered.fromTable, variantId: ordered.variantId || null, variantName: ordered.variantName || null, name: ordered.name, sku: ordered.sku || null, quantity, unitPrice: Number(ordered.unitPrice), requestedAmount: Number(ordered.unitPrice) * quantity };
    });
    const maxByItems = items.reduce((sum, item) => sum + item.requestedAmount, 0);
    const amount = validatePositiveMoney(req.body.requestedAmount, Math.min(maxByItems, refundableAmount(order)), "Số tiền đề nghị");
    const now = new Date().toISOString();
    const request = { id: `ret_${crypto.randomUUID()}`, orderId: String(order.id), userId: String(order.userId), idempotencyKey: req.body.requestId, reason, items, requestedAmount: amount, status: "requested", history: [{ from: null, to: "requested", actorId: String(actor.id), actorRole: actor.role, at: now, note: reason }], createdAt: now, updatedAt: now, restockedQuantity: 0, refundedAmount: 0 };
    await db.collection("returns").insertOne(request);
    await audit(actor, "return.requested", "return", request.id, null, request);
    res.status(201).json(sanitizeReturn(request, actor.role !== "user"));
  } catch (error) { handleError(res, error); }
});

app.get("/api/returns", async (req, res) => {
  try {
    const actor = requireAuth(req);
    const query = actor.role === "user" ? { userId: String(actor.id) } : {};
    const docs = await db.collection("returns").find(query).sort({ createdAt: -1 }).toArray();
    res.json(docs.map((doc) => sanitizeReturn(doc, actor.role !== "user")));
  } catch (error) { handleError(res, error); }
});

app.patch("/api/admin/returns/:returnId/status", async (req, res) => {
  try {
    const actor = requireRoles(req, ["admin", "support", "warehouse"]);
    const request = await db.collection("returns").findOne(buildIdQuery(req.params.returnId));
    if (!request) return res.status(404).json({ error: "Không tìm thấy yêu cầu trả hàng." });
    const nextStatus = String(req.body.status || "");
    if (!RETURN_TRANSITIONS[request.status]?.includes(nextStatus)) return res.status(409).json({ error: "Chuyển trạng thái trả hàng không hợp lệ." });
    if (nextStatus === "completed") return res.status(409).json({ error: "Chỉ hoàn tất RMA qua API ghi nhận hoàn tiền có mã tham chiếu và bằng chứng." });
    if (actor.role === "warehouse" && !["processing", "failed"].includes(nextStatus)) return res.status(403).json({ error: "Kho chỉ được ghi nhận tiếp nhận/kiểm tra hàng." });
    if (actor.role === "support" && nextStatus === "completed") return res.status(403).json({ error: "CSKH không có quyền xác nhận hoàn tiền." });
    const note = String(req.body.note || "").trim();
    if (!note) return res.status(400).json({ error: "Cần ghi chú xử lý." });
    const now = new Date().toISOString();
    const updated = await db.collection("returns").findOneAndUpdate(
      { _id: request._id, status: request.status },
      { $set: { status: nextStatus, assigneeId: String(req.body.assigneeId || actor.id), updatedAt: now }, $push: { history: { from: request.status, to: nextStatus, actorId: String(actor.id), actorRole: actor.role, at: now, note } } },
      { returnDocument: "after" },
    );
    if (!updated) return res.status(409).json({ error: "Yêu cầu đã được nhân viên khác cập nhật." });
    await audit(actor, "return.status_changed", "return", request.id, { status: request.status }, { status: nextStatus }, note);
    res.json(formatDoc(updated));
  } catch (error) { handleError(res, error); }
});

app.post("/api/admin/returns/:returnId/restock", async (req, res) => {
  try {
    const actor = requireRoles(req, ["admin", "warehouse"]);
    const request = await db.collection("returns").findOne(buildIdQuery(req.params.returnId));
    if (!request) return res.status(404).json({ error: "Không tìm thấy yêu cầu trả hàng." });
    if (request.status !== "processing") return res.status(409).json({ error: "Chỉ nhập lại kho khi yêu cầu đang xử lý." });
    if (request.restockedAt) return res.json({ return: formatDoc(request), idempotent: true });
    const received = Array.isArray(req.body.items) ? req.body.items : [];
    if (!received.length) return res.status(400).json({ error: "Cần khai báo số lượng hàng thực nhận." });
    const movements = [];
    const receivedItemKeys = new Set();
    for (const receivedItem of received) {
      const itemKey = `${receivedItem.fromTable}:${receivedItem.productId}:${receivedItem.variantId || "base"}`;
      if (receivedItemKeys.has(itemKey)) throw Object.assign(new Error("Mặt hàng thực nhận bị khai báo lặp."), { status: 400 });
      receivedItemKeys.add(itemKey);
      const source = (request.items || []).find((item) => String(item.productId) === String(receivedItem.productId) && item.fromTable === receivedItem.fromTable && String(item.variantId || "") === String(receivedItem.variantId || ""));
      const quantity = Number(receivedItem.quantity);
      if (!source || !Number.isInteger(quantity) || quantity <= 0 || quantity > source.quantity) throw Object.assign(new Error("Số lượng nhận lại không hợp lệ."), { status: 400 });
      if (receivedItem.resellable !== true) continue;
      const movementId = `mov_return_${request.id}_${source.fromTable}_${source.productId}_${source.variantId || "base"}`;
      const variantIds = source.variantId && Number.isFinite(+source.variantId) ? [source.variantId, +source.variantId] : [source.variantId];
      const result = source.variantId
        ? await db.collection(source.fromTable).findOneAndUpdate(
          { $and: [buildIdQuery(source.productId), { variants: { $elemMatch: { id: { $in: variantIds }, returnRestockIds: { $ne: movementId } } } }] },
          { $inc: { "variants.$[variant].stock": quantity, "variants.$[variant].stockLeft": quantity, inventoryVersion: 1 }, $addToSet: { "variants.$[variant].returnRestockIds": movementId }, $set: { updatedAt: new Date().toISOString() } },
          { arrayFilters: [{ "variant.id": { $in: variantIds } }], returnDocument: "after" },
        )
        : await db.collection(source.fromTable).findOneAndUpdate(
          { $and: [buildIdQuery(source.productId), { returnRestockIds: { $ne: movementId } }] },
          { $inc: { stock: quantity, stockLeft: quantity, inventoryVersion: 1 }, $addToSet: { returnRestockIds: movementId }, $set: { updatedAt: new Date().toISOString() } },
          { returnDocument: "after" },
        );
      if (!result) {
        const existingProduct = await db.collection(source.fromTable).findOne(buildIdQuery(source.productId));
        if (!existingProduct) throw Object.assign(new Error(`Không tìm thấy sản phẩm ${source.productId} trong ${source.fromTable}.`), { status: 409 });
        const restockIds = source.variantId
          ? (existingProduct.variants || []).find((variant) => String(variant.id) === String(source.variantId))?.returnRestockIds
          : existingProduct.returnRestockIds;
        if (!(restockIds || []).includes(movementId)) throw Object.assign(new Error("Tồn kho vừa được cập nhật bởi yêu cầu khác."), { status: 409 });
      }
      const movement = { id: movementId, type: "return", fromTable: source.fromTable, productId: String(source.productId), variantId: source.variantId || null, quantity, orderId: request.orderId, returnId: request.id, reason: String(req.body.reason || "Hàng trả đủ điều kiện bán lại"), actorId: String(actor.id), createdAt: new Date().toISOString() };
      await db.collection("inventoryMovements").updateOne({ id: movementId }, { $setOnInsert: movement }, { upsert: true });
      movements.push(movement);
    }
    if (!movements.length) return res.status(400).json({ error: "Không có mặt hàng đủ điều kiện nhập lại kho." });
    const total = movements.reduce((sum, item) => sum + item.quantity, 0);
    await db.collection("returns").updateOne({ _id: request._id, restockedAt: { $exists: false } }, { $set: { restockedAt: new Date().toISOString(), restockedBy: String(actor.id), restockedQuantity: total, updatedAt: new Date().toISOString() } });
    await audit(actor, "return.inventory_restocked", "return", request.id, null, { movements });
    res.json({ success: true, restockedQuantity: total, movements });
  } catch (error) { handleError(res, error); }
});

app.post("/api/admin/returns/:returnId/manual-refund", async (req, res) => {
  try {
    const actor = requireAdmin(req);
    const request = await db.collection("returns").findOne(buildIdQuery(req.params.returnId));
    if (!request) return res.status(404).json({ error: "Không tìm thấy yêu cầu trả hàng." });
    if (request.manualRefund?.confirmedAt) return res.json({ return: formatDoc(request), idempotent: true, message: "Khoản hoàn thủ công đã được ghi nhận trước đó." });
    if (request.status !== "processing") return res.status(409).json({ error: "Yêu cầu phải ở trạng thái đang xử lý." });
    const order = await db.collection("orders").findOne(buildIdQuery(request.orderId));
    if (!order || !["paid", "partially_refunded"].includes(order.paymentStatus)) return res.status(409).json({ error: "Đơn chưa có khoản thanh toán hợp lệ để hoàn." });
    const recordedRefund = (order.refundRecords || []).find((item) => item.returnId === String(request.id));
    if (recordedRefund) {
      await db.collection("returns").updateOne(
        { _id: request._id, "manualRefund.confirmedAt": { $exists: false } },
        { $set: { manualRefund: recordedRefund, refundedAmount: recordedRefund.amount, status: "completed", updatedAt: recordedRefund.confirmedAt } },
      );
      return res.json({ return: formatDoc(await db.collection("returns").findOne({ _id: request._id })), idempotent: true, message: "Khoản hoàn thủ công đã được ghi nhận trước đó." });
    }
    const amount = validatePositiveMoney(req.body.amount, Math.min(Number(request.requestedAmount), refundableAmount(order)), "Số tiền hoàn");
    const reference = String(req.body.reference || "").trim();
    const evidence = String(req.body.evidence || "").trim();
    if (!reference || !evidence) return res.status(400).json({ error: "Hoàn thủ công cần mã tham chiếu và bằng chứng." });
    const now = new Date().toISOString();
    const manualRefund = { returnId: String(request.id), amount, reference, evidence, method: String(req.body.method || "bank_transfer"), confirmedBy: String(actor.id), confirmedAt: now, mode: "manual_record" };
    const orderUpdate = await db.collection("orders").updateOne(
      { _id: order._id, "refundRecords.returnId": { $ne: String(request.id) }, refundedAmount: order.refundedAmount ?? { $exists: false } },
      { $inc: { refundedAmount: amount, version: 1 }, $set: { paymentStatus: amount === refundableAmount(order) ? "refunded" : "partially_refunded", updatedAt: now }, $push: { refundRecords: manualRefund } },
    );
    if (!orderUpdate.modifiedCount) return res.status(409).json({ error: "Dữ liệu hoàn tiền vừa thay đổi. Hãy tải lại." });
    await db.collection("returns").updateOne({ _id: request._id, "manualRefund.confirmedAt": { $exists: false } }, { $set: { manualRefund, refundedAmount: amount, status: "completed", updatedAt: now }, $push: { history: { from: "processing", to: "completed", actorId: String(actor.id), actorRole: actor.role, at: now, note: `Ghi nhận hoàn thủ công ${reference}` } } });
    await audit(actor, "refund.manual_recorded", "return", request.id, null, manualRefund);
    res.json({ success: true, manual: true, message: "Đã ghi nhận chứng từ hoàn tiền thủ công; hệ thống không tự chuyển tiền.", manualRefund });
  } catch (error) { handleError(res, error); }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    requireRoles(req, ["admin", "support"]);
    const [users, orders] = await Promise.all([
      db.collection("users").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("orders").find({}).toArray(),
    ]);
    const response = users.map((user) => {
      const userOrders = orders.filter((order) => String(order.userId) === String(user.id));
      const totalSpent = userOrders.reduce((sum, order) => sum + paidNetAmount(order), 0);
      return { ...publicUser(user), totalSpent, orderCount: userOrders.length, tier: getCustomerTier(totalSpent) };
    });
    res.json(response);
  } catch (error) { handleError(res, error); }
});

app.post("/api/admin/users", async (req, res) => {
  try {
    const actor = requireAdmin(req);
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    if (!fullName || !email || !phone) return res.status(400).json({ error: "Thiếu thông tin người dùng." });
    const duplicate = await db.collection("users").findOne({ $or: [{ emailNormalized: email }, { phone }] });
    if (duplicate) return res.status(409).json({ error: "Email hoặc số điện thoại đã tồn tại." });
    const user = { id: `usr_${crypto.randomUUID()}`, fullName, email, emailNormalized: email, phone, address: String(req.body.address || "").trim(), role: normalizeRole(req.body.role), status: req.body.status === "locked" ? "locked" : "active", internalNote: String(req.body.internalNote || "").slice(0, 2000), passwordHash: await hashPassword(req.body.password), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 };
    await db.collection("users").insertOne(user);
    await audit(actor, "user.created", "user", user.id, null, publicUser(user));
    res.status(201).json(publicUser(user));
  } catch (error) { handleError(res, error); }
});

app.patch("/api/admin/users/:userId", async (req, res) => {
  try {
    const actor = requireAdmin(req);
    const user = await db.collection("users").findOne(buildIdQuery(req.params.userId));
    if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng." });
    const update = {};
    for (const key of ["fullName", "phone", "address", "internalNote"]) if (req.body[key] !== undefined) update[key] = String(req.body[key]).trim().slice(0, 2000);
    if (req.body.email !== undefined) {
      update.email = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.email)) return res.status(400).json({ error: "Email không hợp lệ." });
      const duplicate = await db.collection("users").findOne({ _id: { $ne: user._id }, $or: [{ emailNormalized: update.email }, { email: new RegExp(`^${update.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] });
      if (duplicate) return res.status(409).json({ error: "Email đã được tài khoản khác sử dụng." });
      update.emailNormalized = update.email;
    }
    if (req.body.role !== undefined) {
      if (!["admin", "warehouse", "support", "user"].includes(req.body.role)) return res.status(400).json({ error: "Vai trò không hợp lệ." });
      update.role = req.body.role;
    }
    if (req.body.status !== undefined) {
      if (!["active", "locked"].includes(req.body.status)) return res.status(400).json({ error: "Trạng thái tài khoản không hợp lệ." });
      update.status = req.body.status;
    }
    const disablesAdmin = user.role === "admin" && (update.role !== undefined && update.role !== "admin" || update.status === "locked");
    if (disablesAdmin) {
      const activeAdmins = await db.collection("users").countDocuments({ role: "admin", status: "active" });
      if (activeAdmins <= 1) return res.status(409).json({ error: "Không thể khóa hoặc hạ quyền quản trị viên hoạt động cuối cùng." });
    }
    if (req.body.password) update.passwordHash = await hashPassword(req.body.password);
    update.updatedAt = new Date().toISOString();
    const mutation = { $set: update };
    if (req.body.password) mutation.$unset = { password: "" };
    const updated = await db.collection("users").findOneAndUpdate({ _id: user._id }, mutation, { returnDocument: "after" });
    if (update.status === "locked") await db.collection("sessions").deleteMany({ userId: String(user.id) });
    await audit(actor, "user.updated", "user", user.id, publicUser(user), publicUser(updated));
    res.json(publicUser(updated));
  } catch (error) { handleError(res, error); }
});

app.get("/api/users/me", async (req, res) => {
  try { res.json(requireAuth(req)); } catch (error) { handleError(res, error); }
});

app.patch("/api/users/me", async (req, res) => {
  try {
    const actor = requireAuth(req);
    const update = {};
    for (const key of ["fullName", "phone", "address"]) if (req.body[key] !== undefined) update[key] = String(req.body[key]).trim().slice(0, 500);
    if (req.body.password) update.passwordHash = await hashPassword(req.body.password);
    update.updatedAt = new Date().toISOString();
    const mutation = { $set: update };
    if (req.body.password) mutation.$unset = { password: "" };
    const updated = await db.collection("users").findOneAndUpdate(buildIdQuery(actor.id), mutation, { returnDocument: "after" });
    res.json(publicUser(updated));
  } catch (error) { handleError(res, error); }
});

app.post("/api/admin/inventory/adjust", async (req, res) => {
  try {
    const actor = requireRoles(req, ["admin", "warehouse"]);
    const fromTable = String(req.body.fromTable || "");
    if (!PRODUCT_TABLES.has(fromTable)) return res.status(400).json({ error: "Nguồn sản phẩm không hợp lệ." });
    const delta = Number(req.body.delta);
    const reason = String(req.body.reason || "").trim();
    if (!Number.isInteger(delta) || delta === 0 || !reason) return res.status(400).json({ error: "Số lượng điều chỉnh và lý do không hợp lệ." });
    const product = await db.collection(fromTable).findOne(buildIdQuery(req.body.productId));
    if (!product) return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    const variantId = req.body.variantId == null ? null : String(req.body.variantId);
    const variant = variantId ? (product.variants || []).find((item) => String(item.id) === variantId) : null;
    if (variantId && !variant) return res.status(404).json({ error: "Không tìm thấy biến thể sản phẩm." });
    const inventorySource = variant || product;
    const available = Number(inventorySource.stockLeft ?? inventorySource.stock ?? 0);
    if (available + delta < 0) return res.status(409).json({ error: "Điều chỉnh sẽ làm tồn kho âm." });
    const version = Number(product.inventoryVersion || 0);
    const versionQuery = { _id: product._id, $or: [{ inventoryVersion: version }, ...(version === 0 ? [{ inventoryVersion: { $exists: false } }] : [])] };
    const variantIds = variantId && Number.isFinite(+variantId) ? [variantId, +variantId] : [variantId];
    const updated = variant
      ? await db.collection(fromTable).findOneAndUpdate(
        versionQuery,
        { $inc: { "variants.$[variant].stock": delta, "variants.$[variant].stockLeft": delta, inventoryVersion: 1 }, $set: { updatedAt: new Date().toISOString() } },
        { arrayFilters: [{ "variant.id": { $in: variantIds } }], returnDocument: "after" },
      )
      : await db.collection(fromTable).findOneAndUpdate(
        versionQuery,
        { $inc: { stock: delta, stockLeft: delta, inventoryVersion: 1 }, $set: { updatedAt: new Date().toISOString() } },
        { returnDocument: "after" },
      );
    if (!updated) return res.status(409).json({ error: "Tồn kho vừa được cập nhật bởi yêu cầu khác. Hãy thử lại." });
    const movement = { id: `mov_${crypto.randomUUID()}`, type: delta > 0 ? "adjust_in" : "adjust_out", fromTable, productId: String(req.body.productId), variantId, quantity: Math.abs(delta), delta, reason, actorId: String(actor.id), createdAt: new Date().toISOString() };
    await db.collection("inventoryMovements").insertOne(movement);
    await audit(actor, "inventory.adjusted", fromTable, req.body.productId, { available }, { available: available + delta }, reason);
    res.json({ product: formatDoc(updated), movement });
  } catch (error) { handleError(res, error); }
});

app.get("/api/admin/audit-logs", async (req, res) => {
  try {
    requireRoles(req, ["admin", "support", "warehouse"]);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
    const docs = await db.collection("auditLogs").find({}).sort({ timestamp: -1 }).limit(limit).toArray();
    res.json(docs.map(formatDoc));
  } catch (error) { handleError(res, error); }
});

app.get("/api/admin/statistics", async (req, res) => {
  try {
    requireRoles(req, ["admin"]);
    const end = req.query.to ? new Date(`${req.query.to}T23:59:59.999+07:00`) : new Date();
    const start = req.query.from ? new Date(`${req.query.from}T00:00:00.000+07:00`) : new Date(end.getTime() - 29 * 86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return res.status(400).json({ error: "Khoảng ngày không hợp lệ." });
    const duration = end.getTime() - start.getTime() + 1;
    const previousStart = new Date(start.getTime() - duration);
    const [orders, users, returns, productsByTable] = await Promise.all([
      db.collection("orders").find({ $or: [
        { createdAt: { $gte: previousStart.toISOString(), $lte: end.toISOString() } },
        { paidAt: { $gte: previousStart.toISOString(), $lte: end.toISOString() } },
        { "refundRecords.confirmedAt": { $gte: previousStart.toISOString(), $lte: end.toISOString() } },
      ] }).toArray(),
      db.collection("users").find({ createdAt: { $gte: previousStart.toISOString(), $lte: end.toISOString() } }).toArray(),
      db.collection("returns").find({ "manualRefund.confirmedAt": { $gte: previousStart.toISOString(), $lte: end.toISOString() } }).toArray(),
      Promise.all([...PRODUCT_TABLES].map(async (table) => (await db.collection(table).find({}).toArray()).map((p) => ({ ...p, fromTable: table })))),
    ]);
    const inRange = (value, from, to) => { const date = new Date(value); return date >= from && date <= to; };
    const summarize = (from, to) => {
      const createdOrders = orders.filter((o) => inRange(o.createdAt, from, to));
      const paidOrders = orders.filter((o) => o.paidAt && inRange(o.paidAt, from, to) && ["paid", "partially_refunded", "refunded"].includes(o.paymentStatus));
      const collected = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const orderRefunds = orders.flatMap((order) => order.refundRecords || []).filter((item) => inRange(item.confirmedAt, from, to));
      const recordedReturnIds = new Set(orderRefunds.map((item) => item.returnId).filter(Boolean));
      const legacyReturnRefunds = returns.filter((item) => inRange(item.manualRefund?.confirmedAt, from, to) && !recordedReturnIds.has(String(item.id)));
      const refunds = orderRefunds.reduce((sum, item) => sum + Number(item.amount || 0), 0) + legacyReturnRefunds.reduce((sum, item) => sum + Number(item.manualRefund?.amount || 0), 0);
      return { orders: createdOrders.length, orderValue: createdOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0), collected, refunds, revenue: collected - refunds, averageOrderValue: createdOrders.length ? createdOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0) / createdOrders.length : 0, newCustomers: users.filter((u) => inRange(u.createdAt, from, to)).length };
    };
    const current = summarize(start, end);
    const previous = summarize(previousStart, new Date(start.getTime() - 1));
    const growth = Object.fromEntries(["orders", "collected", "revenue", "newCustomers"].map((key) => [key, previous[key] ? ((current[key] - previous[key]) / previous[key]) * 100 : null]));
    const scopedOrders = orders.filter((o) => inRange(o.createdAt, start, end));
    const paidInPeriod = orders.filter((o) => o.paidAt && inRange(o.paidAt, start, end) && ["paid", "partially_refunded", "refunded"].includes(o.paymentStatus));
    const statusCounts = Object.fromEntries(Object.keys(ORDER_TRANSITIONS).map((status) => [status, scopedOrders.filter((o) => o.status === status).length]));
    const top = new Map();
    for (const order of paidInPeriod) for (const item of order.products || []) {
      const key = `${item.fromTable}:${item.productId}`;
      const row = top.get(key) || { name: item.name, sku: item.sku || null, quantity: 0, revenue: 0 };
      row.quantity += Number(item.quantity || 0); row.revenue += Number(item.subtotal || 0); top.set(key, row);
    }
    const lowStock = productsByTable.flat().filter((p) => Number(p.stockLeft ?? p.stock ?? 0) <= Number(p.lowStockThreshold ?? 5)).map((p) => ({ id: String(p.id), name: p.name, fromTable: p.fromTable, available: Number(p.stockLeft ?? p.stock ?? 0) })).slice(0, 20);
    res.json({ timezone: "Asia/Ho_Chi_Minh", range: { from: start.toISOString(), to: end.toISOString() }, recognitionRule: "Giá trị đơn theo createdAt; tiền đã thu theo paidAt; tiền hoàn theo thời điểm xác nhận chứng từ; doanh thu thuần = đã thu - đã hoàn.", current, previous, growth, statusCounts, topProducts: [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10), lowStock, profit: null, profitNote: "Không tính lợi nhuận khi thiếu giá vốn xác thực." });
  } catch (error) { handleError(res, error); }
});

app.post("/api/vouchers/:voucherId/claim", async (req, res) => {
  try {
    const actor = requireAuth(req);
    const voucher = await db.collection("vouchers").findOne(buildIdQuery(req.params.voucherId));
    const now = new Date();
    if (!voucher || voucher.active === false) return res.status(404).json({ error: "Voucher không tồn tại hoặc đã ngừng." });
    if (voucher.startsAt && new Date(voucher.startsAt) > now) return res.status(409).json({ error: "Voucher chưa bắt đầu." });
    if (voucher.expiredAt && new Date(`${voucher.expiredAt}T23:59:59+07:00`) < now) return res.status(409).json({ error: "Voucher đã hết hạn." });
    const existing = await db.collection("userVouchers").findOne({ userId: String(actor.id), voucherCode: voucher.code });
    if (existing) return res.json(formatDoc(existing));
    const limit = Number(voucher.maxCollect || 0);
    const update = await db.collection("vouchers").updateOne(
      { _id: voucher._id, ...(limit > 0 ? { collectedCount: { $lt: limit } } : {}) },
      { $inc: { collectedCount: 1 } },
    );
    if (!update.modifiedCount) return res.status(409).json({ error: "Voucher đã hết lượt nhận." });
    const wallet = { id: `uv_${crypto.randomUUID()}`, userId: String(actor.id), voucherCode: voucher.code, collectedAt: now.toISOString(), used: false };
    try { await db.collection("userVouchers").insertOne(wallet); }
    catch (error) {
      await db.collection("vouchers").updateOne({ _id: voucher._id }, { $inc: { collectedCount: -1 } });
      if (error.code === 11000) return res.json(formatDoc(await db.collection("userVouchers").findOne({ userId: String(actor.id), voucherCode: voucher.code })));
      throw error;
    }
    await audit(actor, "voucher.claimed", "voucher", voucher.id, null, { code: voucher.code });
    res.status(201).json(formatDoc(wallet));
  } catch (error) { handleError(res, error); }
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

const PUBLIC_READ_RESOURCES = new Set([
  ...PRODUCT_TABLES, "vouchers", "settings", "reviews", "news", "demoUnits",
]);
const USER_SCOPED_RESOURCES = new Set(["cart", "wishlist", "userVouchers", "notifications", "serviceRequests"]);
const ADMIN_MANAGED_RESOURCES = new Set([
  ...PRODUCT_TABLES, "vouchers", "settings", "reviews", "news", "demoUnits", "serviceRequests", "notifications",
]);
const BLOCKED_RAW_RESOURCES = new Set(["users", "orders", "paymentAttempts", "sessions", "auditLogs", "returns", "inventoryMovements"]);
const PRODUCT_WRITABLE_FIELDS = new Set(["sku", "name", "costPrice", "price", "oldPrice", "category", "brand", "lowStockThreshold", "status", "image", "description", "variants", "flashSale", "discount", "flashSalePrice", "flashSaleStart", "flashSaleEnd", "deleted", "initialStock"]);
const RESOURCE_FIELDS = {
  vouchers: new Set(["code", "type", "value", "minOrder", "maxDiscount", "expiredAt", "startsAt", "maxCollect", "collectedCount", "active", "des", "combinable"]),
  settings: new Set(["id", "value", "startAt", "endAt", "startTime", "endTime", "active", "items"]),
  reviews: new Set(["productId", "userId", "userName", "collection", "rating", "comment", "status", "createdAt", "hidden", "reply", "replyAt"]),
  news: new Set(["title", "summary", "content", "image", "published", "createdAt", "updatedAt"]),
  serviceRequests: new Set(["userId", "service", "fullName", "email", "phone", "message", "status", "assigneeId", "resolutionNote", "createdAt", "updatedAt"]),
  notifications: new Set(["userId", "type", "title", "message", "link", "image", "read", "createdAt"]),
  cart: new Set(["userId", "productId", "fromTable", "quantity", "variantId", "createdAt", "updatedAt"]),
  wishlist: new Set(["userId", "productId", "fromTable", "name", "image", "price", "createdAt"]),
  userVouchers: new Set(["userId", "voucherCode", "collectedAt", "used"]),
  demoUnits: PRODUCT_WRITABLE_FIELDS,
};

const pickFields = (input, allowed) => Object.fromEntries(Object.entries(input || {}).filter(([key]) => allowed.has(key)));
const formatResourceDoc = (req, doc, flashSaleSettings = null) => {
  const formatted = formatDoc(doc);
  if (PRODUCT_TABLES.has(req.params.resource) && !["admin", "warehouse"].includes(req.authUser?.role)) {
    delete formatted.costPrice;
    delete formatted.inventoryVersion;
    if (formatted.flashSale === true) {
      const now = new Date();
      const active = flashSaleSettings?.active !== false &&
        (!flashSaleSettings?.startTime || new Date(flashSaleSettings.startTime) <= now) &&
        (!flashSaleSettings?.endTime || new Date(flashSaleSettings.endTime) >= now);
      const basePrice = Number(formatted.oldPrice || formatted.price || 0);
      const discount = Number(formatted.discount || 0);
      formatted.price = active && discount > 0 && discount <= 90
        ? Math.round((basePrice * (100 - discount)) / 100)
        : basePrice;
      formatted.flashSaleActive = active;
    } else if (formatted.flashSale === false && formatted.oldPrice) {
      formatted.price = Number(formatted.oldPrice);
      formatted.flashSaleActive = false;
    }
  }
  return formatted;
};

app.use("/:resource", async (req, res, next) => {
  try {
    const resource = req.params.resource;
    if (resource === "api") return next();
    if (BLOCKED_RAW_RESOURCES.has(resource)) return res.status(403).json({ error: "Tài nguyên này chỉ được truy cập qua API nghiệp vụ." });
    const isRead = req.method === "GET";
    if (!PUBLIC_READ_RESOURCES.has(resource) && !USER_SCOPED_RESOURCES.has(resource) && !ADMIN_MANAGED_RESOURCES.has(resource)) {
      return res.status(404).json({ error: "Tài nguyên không được công khai." });
    }
    if (isRead && PUBLIC_READ_RESOURCES.has(resource)) return next();
    const actor = requireAuth(req);
    req.resourceActor = actor;
    if (USER_SCOPED_RESOURCES.has(resource) && actor.role === "user") {
      req.resourceOwnerQuery = { userId: String(actor.id) };
      if (!isRead) req.body.userId = String(actor.id);
      if (resource === "userVouchers" && !isRead) return res.status(403).json({ error: "Voucher chỉ được nhận qua API nghiệp vụ." });
      if (resource === "serviceRequests" && !["GET", "POST"].includes(req.method)) return res.status(403).json({ error: "Khách hàng không được sửa quy trình xử lý dịch vụ." });
      if (resource === "notifications" && req.method === "POST") return res.status(403).json({ error: "Khách hàng không được tự tạo thông báo." });
    } else if (!isRead && resource === "reviews") {
      if (actor.role === "user") {
        req.body.userId = String(actor.id);
        if (req.method !== "POST") return res.status(403).json({ error: "Khách hàng không được sửa trạng thái đánh giá." });
      } else requireRoles(req, ["admin", "support"]);
    } else if (!isRead) {
      if (!ADMIN_MANAGED_RESOURCES.has(resource)) return res.status(403).json({ error: "Không có quyền sửa tài nguyên này." });
      const roles = resource === "serviceRequests" ? ["admin", "support"] : resource === "notifications" ? ["admin", "support", "warehouse"] : resource === "reviews" ? ["admin", "support"] : PRODUCT_TABLES.has(resource) ? ["admin", "warehouse"] : ["admin"];
      requireRoles(req, roles);
    } else if (USER_SCOPED_RESOURCES.has(resource) && !["admin", "support", "warehouse"].includes(actor.role)) {
      req.resourceOwnerQuery = { userId: String(actor.id) };
    }
    if (!isRead) {
      const allowed = PRODUCT_TABLES.has(resource) ? PRODUCT_WRITABLE_FIELDS : RESOURCE_FIELDS[resource];
      if (!allowed) return res.status(403).json({ error: "Tài nguyên không cho phép ghi." });
      req.body = pickFields(req.body, allowed);
      if (PRODUCT_TABLES.has(resource) && actor.role === "warehouse") {
        if (["POST", "DELETE"].includes(req.method)) return res.status(403).json({ error: "Kho không được tạo hoặc xóa sản phẩm." });
        req.body = pickFields(req.body, new Set(["lowStockThreshold", "status"]));
      }
      if (["cart", "wishlist", "userVouchers"].includes(resource)) req.body.userId = String(actor.id);
      if (resource === "cart") {
        const quantity = Number(req.body.quantity);
        if (req.body.quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)) return res.status(400).json({ error: "Số lượng giỏ hàng phải từ 1 đến 99." });
        if (req.body.quantity !== undefined) req.body.quantity = quantity;
        if (req.method === "POST" && (!PRODUCT_TABLES.has(req.body.fromTable) || !String(req.body.productId || "").trim())) return res.status(400).json({ error: "Sản phẩm trong giỏ không hợp lệ." });
      }
      if (resource === "serviceRequests" && actor.role === "user" && req.method === "POST") {
        req.body.status = "pending";
        delete req.body.assigneeId;
        delete req.body.resolutionNote;
        req.body.createdAt = new Date().toISOString();
      }
      if (resource === "reviews" && actor.role === "user" && req.method === "POST") {
        const rating = Number(req.body.rating);
        const comment = String(req.body.comment || "").trim();
        const collection = String(req.body.collection || "").trim();
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "Số sao đánh giá phải từ 1 đến 5." });
        if (!String(req.body.productId || "").trim() || !collection || !comment) return res.status(400).json({ error: "Thông tin đánh giá chưa đầy đủ." });
        if (comment.length > 1000) return res.status(400).json({ error: "Nội dung đánh giá không được vượt quá 1000 ký tự." });
        req.body.rating = rating;
        req.body.comment = comment;
        req.body.collection = collection;
        req.body.userName = actor.fullName || actor.username || "Khách hàng";
        req.body.status = "pending";
        req.body.hidden = false;
        req.body.createdAt = new Date().toISOString();
        delete req.body.reply;
        delete req.body.replyAt;
      }
      if (resource === "vouchers") {
        const value = Number(req.body.value);
        const minOrder = Number(req.body.minOrder || 0);
        if (req.body.value !== undefined && (!Number.isFinite(value) || value <= 0)) return res.status(400).json({ error: "Giá trị voucher phải lớn hơn 0." });
        if (req.body.minOrder !== undefined && (!Number.isFinite(minOrder) || minOrder < 0)) return res.status(400).json({ error: "Đơn tối thiểu không hợp lệ." });
        if (req.body.type === "percent" && value > 100) return res.status(400).json({ error: "Voucher phần trăm không vượt quá 100%." });
        if (req.body.expiredAt && Number.isNaN(new Date(req.body.expiredAt).getTime())) return res.status(400).json({ error: "Hạn voucher không hợp lệ." });
      }
      if (PRODUCT_TABLES.has(resource)) {
        const discount = Number(req.body.discount);
        if (req.body.discount !== undefined && (!Number.isFinite(discount) || discount < 0 || discount > 90)) {
          return res.status(400).json({ error: "Mức giảm Flash Sale phải từ 0 đến 90%." });
        }
        for (const field of ["price", "oldPrice", "flashSalePrice"]) {
          if (req.body[field] !== undefined) {
            const value = Number(req.body[field]);
            if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: `${field} phải là số lớn hơn 0.` });
            req.body[field] = value;
          }
        }
        if (req.body.costPrice !== undefined) {
          const costPrice = Number(req.body.costPrice);
          if (!Number.isFinite(costPrice) || costPrice < 0) return res.status(400).json({ error: "Giá vốn không hợp lệ." });
          req.body.costPrice = costPrice;
        }
        if (req.body.initialStock !== undefined) {
          const initialStock = Number(req.body.initialStock);
          if (!Number.isInteger(initialStock) || initialStock < 0) return res.status(400).json({ error: "Tồn kho ban đầu phải là số nguyên không âm." });
          req.body.initialStock = initialStock;
        }
        if (req.body.discount !== undefined) req.body.discount = discount;
        if (req.body.variants !== undefined) {
          if (!Array.isArray(req.body.variants) || req.body.variants.length > 100) return res.status(400).json({ error: "Danh sách biến thể không hợp lệ." });
          if (req.method === "POST") {
            req.body.variants = req.body.variants.map((variant, index) => {
              const price = Number(variant.price);
              const stock = Number(variant.stockLeft ?? variant.stock ?? 0);
              if (!variant.id || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) throw Object.assign(new Error(`Biến thể thứ ${index + 1} không hợp lệ.`), { status: 400 });
              return { ...variant, price, stock, stockLeft: stock, inventoryVersion: 1 };
            });
          } else {
            const resourceId = decodeURIComponent(req.originalUrl.split("?")[0].split("/").filter(Boolean)[1] || "");
            const currentProduct = await db.collection(resource).findOne(buildIdQuery(resourceId));
            if (!currentProduct) return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
            const currentVariants = currentProduct.variants || [];
            if (req.body.variants.length !== currentVariants.length) return res.status(409).json({ error: "Thêm/xóa biến thể cần API nghiệp vụ riêng để bảo toàn lịch sử tồn kho." });
            req.body.variants = req.body.variants.map((variant) => {
              const currentVariant = currentVariants.find((item) => String(item.id) === String(variant.id));
              const price = Number(variant.price);
              if (!currentVariant || !Number.isFinite(price) || price <= 0) throw Object.assign(new Error("Biến thể không hợp lệ hoặc đã thay đổi."), { status: 409 });
              return { ...variant, price, stock: currentVariant.stock, stockLeft: currentVariant.stockLeft, inventoryVersion: currentVariant.inventoryVersion, returnRestockIds: currentVariant.returnRestockIds };
            });
          }
        }
      }
      if (resource === "settings") {
        for (const field of ["startAt", "endAt", "startTime", "endTime"]) {
          if (req.body[field] && Number.isNaN(new Date(req.body[field]).getTime())) return res.status(400).json({ error: "Thời gian cấu hình không hợp lệ." });
        }
      }
      if (resource === "serviceRequests" && ["PATCH", "PUT"].includes(req.method)) {
        const resourceId = decodeURIComponent(req.originalUrl.split("?")[0].split("/").filter(Boolean)[1] || "");
        const current = await db.collection(resource).findOne(buildIdQuery(resourceId));
        if (!current) return res.status(404).json({ error: "Không tìm thấy yêu cầu dịch vụ." });
        if (req.body.status && req.body.status !== current.status && !SERVICE_TRANSITIONS[current.status]?.includes(req.body.status)) return res.status(409).json({ error: "Chuyển trạng thái dịch vụ không hợp lệ." });
        if (req.body.status && (!String(req.body.assigneeId || "").trim() || !String(req.body.resolutionNote || "").trim())) return res.status(400).json({ error: "Cần người phụ trách và ghi chú xử lý." });
      }
    }
    next();
  } catch (error) { handleError(res, error); }
});

// GET danh sách (lọc, regex tìm kiếm q, sắp xếp _sort, phân trang _limit & _page)
app.get("/:resource", async (req, res) => {
  try {
    const col = db.collection(req.params.resource);
    const { _sort, _order, _page, _limit, q, ...filters } = req.query;

    const query = { ...(req.resourceOwnerQuery || {}) };
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
    const flashSaleSettings = PRODUCT_TABLES.has(req.params.resource) ? await db.collection("settings").findOne({ id: "flashSale" }) : null;
    res.json(docs.map((doc) => formatResourceDoc(req, doc, flashSaleSettings)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET chi tiết theo ID
app.get("/:resource/:id", async (req, res) => {
  try {
    const doc = await db.collection(req.params.resource).findOne({ $and: [buildIdQuery(req.params.id), req.resourceOwnerQuery || {}] });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    const flashSaleSettings = PRODUCT_TABLES.has(req.params.resource) ? await db.collection("settings").findOne({ id: "flashSale" }) : null;
    res.json(formatResourceDoc(req, doc, flashSaleSettings));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST tạo mới bản ghi
app.post("/:resource", async (req, res) => {
  try {
    const doc = { ...req.body };
    doc.id ??= Date.now().toString();
    doc.createdAt ??= new Date().toISOString();
    doc.updatedAt ??= doc.createdAt;
    if (PRODUCT_TABLES.has(req.params.resource)) {
      const initialStock = Number(req.body.initialStock ?? 0);
      doc.stock = Number.isInteger(initialStock) && initialStock >= 0 ? initialStock : 0;
      doc.stockLeft = doc.stock;
      doc.inventoryVersion = 1;
      delete doc.initialStock;
    }
    await db.collection(req.params.resource).insertOne(doc);
    if (req.resourceActor) await audit(req.resourceActor, `${req.params.resource}.created`, req.params.resource, doc.id, null, doc);
    res.status(201).json(formatDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH / PUT cập nhật bản ghi
const handleUpdate = (isReplace) => async (req, res) => {
  try {
    const col = db.collection(req.params.resource);
    const query = { $and: [buildIdQuery(req.params.id), req.resourceOwnerQuery || {}] };
    const before = await col.findOne(query);
    if (!before) return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật" });
    const { _id, ...fields } = req.body;
    if (isReplace && fields.id === undefined) fields.id = req.params.id;

    const doc = await (isReplace
      ? col.findOneAndReplace(query, fields, { returnDocument: "after" })
      : col.findOneAndUpdate(query, { $set: fields }, { returnDocument: "after" }));

    if (!doc) return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật" });
    if (req.resourceActor) await audit(req.resourceActor, `${req.params.resource}.updated`, req.params.resource, req.params.id, formatDoc(before), formatDoc(doc));
    res.json(formatDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
app.patch("/:resource/:id", handleUpdate(false));
app.put("/:resource/:id", handleUpdate(false));

// DELETE xóa bản ghi
app.delete("/:resource/:id", async (req, res) => {
  try {
    const query = { $and: [buildIdQuery(req.params.id), req.resourceOwnerQuery || {}] };
    const before = await db.collection(req.params.resource).findOne(query);
    if (!before) return res.status(404).json({ message: `Không tìm thấy id ${req.params.id} để xóa` });
    if (PRODUCT_TABLES.has(req.params.resource)) {
      const referenced = await db.collection("orders").findOne({ products: { $elemMatch: { productId: String(req.params.id), fromTable: req.params.resource } } });
      if (referenced) {
        await db.collection(req.params.resource).updateOne(query, { $set: { deleted: true, status: "Ngừng bán", updatedAt: new Date().toISOString() } });
        if (req.resourceActor) await audit(req.resourceActor, "product.archived", req.params.resource, req.params.id, formatDoc(before), { ...formatDoc(before), deleted: true, status: "Ngừng bán" });
        return res.json({ success: true, archived: true, message: "Sản phẩm đã có giao dịch nên được ngừng bán thay vì xóa." });
      }
    }
    const result = await db.collection(req.params.resource).deleteOne(query);
    if (!result.deletedCount) return res.status(404).json({ message: `Không tìm thấy id ${req.params.id} để xóa` });
    if (req.resourceActor) await audit(req.resourceActor, `${req.params.resource}.deleted`, req.params.resource, req.params.id, formatDoc(before), null);
    res.json({ success: true, message: "Xóa thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [MongoDB Backend] Đang chạy tại http://localhost:${PORT}`);
});
