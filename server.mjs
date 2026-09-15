import jsonServer from "json-server";
import {
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

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();
const PORT = Number(process.env.PORT || 3000);

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Giữ endpoint thử Express đã có, nhưng chạy chung trên một server/cổng duy nhất.
server.get("/", (_req, res) => {
  res.send("Hello World!");
});

const getState = () => {
  router.db.read();
  const state = router.db.getState();
  state.orders ||= [];
  state.paymentAttempts ||= [];
  state.cart ||= [];
  state.userVouchers ||= [];
  return state;
};

const saveState = () => router.db.write();

const getUser = (req, state) => {
  const userId = req.get("x-user-id");
  const user = (state.users || []).find((item) => String(item.id) === String(userId));
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

const getVnpayConfig = () => {
  const config = {
    tmnCode: process.env.VNP_TMN_CODE,
    hashSecret: process.env.VNP_HASH_SECRET,
    url:
      process.env.VNP_URL ||
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl:
      process.env.VNP_RETURN_URL ||
      `http://127.0.0.1:${PORT}/api/payments/vnpay/return`,
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  };
  if (!config.tmnCode || !config.hashSecret) {
    const error = new Error(
      "VNPAY Sandbox chưa được cấu hình. Hãy thêm VNP_TMN_CODE và VNP_HASH_SECRET vào .env.",
    );
    error.status = 503;
    throw error;
  }
  const paymentEndpoint = new URL(config.url);
  if (
    paymentEndpoint.protocol !== "https:" ||
    paymentEndpoint.hostname !== "sandbox.vnpayment.vn"
  ) {
    const error = new Error("VNP_URL phải là endpoint chính thức của VNPAY Sandbox.");
    error.status = 503;
    throw error;
  }
  return config;
};

const getClientIp = (req) => {
  const forwarded = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.socket.remoteAddress?.replace("::ffff:", "") || "127.0.0.1";
};

const validateRequestId = (requestId) => {
  if (!requestId || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
    const error = new Error("Mã chống gửi trùng không hợp lệ.");
    error.status = 400;
    throw error;
  }
};

const handleError = (res, error) => {
  console.error("BUSINESS API ERROR:", error.message);
  res.status(error.status || 400).json({ error: error.message });
};

const prepareCheckoutInput = (req, user) => ({
  ...req.body,
  userId: String(user.id),
  customer: req.body.customer || {},
});

const findIdempotentOrder = (state, userId, requestId) =>
  state.orders.find(
    (order) =>
      String(order.userId) === String(userId) && order.idempotencyKey === requestId,
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

server.post("/api/orders/checkout", (req, res) => {
  try {
    const state = getState();
    const user = getUser(req, state);
    validateRequestId(req.body.requestId);
    const method = req.body.paymentMethod;
    if (method !== "cod") {
      return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ." });
    }

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
    order.paymentStatus = method === "cod" ? "unpaid" : "pending";
    state.orders.push(order);
    fulfillOrder(state, order);
    saveState();
    res.status(201).json({ order: sanitizeOrder(order, { includeLookupToken: true }) });
  } catch (error) {
    handleError(res, error);
  }
});

server.post("/api/payments/vnpay/create", (req, res) => {
  try {
    const config = getVnpayConfig();
    const state = getState();
    const user = getUser(req, state);
    validateRequestId(req.body.requestId);

    const existing = findIdempotentOrder(state, user.id, req.body.requestId);
    if (existing) {
      if (existing.paymentMethod !== "vnpay") {
        return res.status(409).json({ error: "Mã yêu cầu đã được dùng cho phương thức khác." });
      }
      const attempt = state.paymentAttempts.find(
        (item) => item.id === existing.latestPaymentAttemptId,
      );
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
    const attempt = createPaymentAttempt({
      order,
      config,
      ipAddress: getClientIp(req),
      now,
    });
    order.latestPaymentAttemptId = attempt.id;
    order.reservationExpiresAt = attempt.expiresAt;
    state.orders.push(order);
    state.paymentAttempts.push(attempt);
    saveState();

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

server.post("/api/orders/:orderId/vnpay/retry", (req, res) => {
  try {
    const config = getVnpayConfig();
    const state = getState();
    const user = getUser(req, state);
    const order = state.orders.find((item) => item.id === req.params.orderId);
    if (!order || String(order.userId) !== String(user.id) || order.lookupToken !== req.body.lookupToken) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }
    if (order.paymentMethod !== "vnpay") {
      return res.status(400).json({ error: "Đơn hàng không sử dụng VNPAY." });
    }
    if (order.paymentStatus === "paid") {
      return res.status(409).json({ error: "Đơn hàng đã được thanh toán." });
    }
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

    const attempt = createPaymentAttempt({
      order,
      config,
      ipAddress: getClientIp(req),
      now,
    });
    order.latestPaymentAttemptId = attempt.id;
    order.reservationExpiresAt = attempt.expiresAt;
    state.paymentAttempts.push(attempt);
    saveState();
    res.status(201).json({
      paymentUrl: attempt.paymentUrl,
      lookupToken: order.lookupToken,
    });
  } catch (error) {
    handleError(res, error);
  }
});

server.get("/api/payments/vnpay/return", (req, res) => {
  let frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  let token = "";
  try {
    const config = getVnpayConfig();
    frontendUrl = config.frontendUrl;
    const state = getState();
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
      saveState();
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
      saveState();
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

server.get("/api/payments/vnpay/ipn", (req, res) => {
  try {
    const config = getVnpayConfig();
    const state = getState();
    const result = processVnpayIpn({ state, query: req.query, config });
    if (result.changed) saveState();
    res.json(result.response);
  } catch (error) {
    console.error("VNPAY IPN ERROR:", error.message);
    res.json({ RspCode: "99", Message: "Unknown error" });
  }
});

// Tạo phiên thanh toán MoMo Sandbox
server.post("/api/payments/momo/create", async (req, res) => {
  try {
    const config = getMomoConfig();
    const state = getState();
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
    saveState();

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
server.post("/api/orders/:orderId/momo/retry", async (req, res) => {
  try {
    const config = getMomoConfig();
    const state = getState();
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
    saveState();

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
server.get("/api/payments/momo/return", (req, res) => {
  let frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  let token = "";
  try {
    const config = getMomoConfig();
    frontendUrl = config.frontendUrl;
    const state = getState();
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
      saveState();
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
      saveState();
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
server.post("/api/payments/momo/ipn", (req, res) => {
  try {
    const config = getMomoConfig();
    const state = getState();
    const result = processMomoIpn({ state, body: req.body, config });
    if (result.changed) saveState();
    res.status(result.status || 200).json(result.response);
  } catch (error) {
    console.error("MOMO IPN ERROR:", error.message);
    res.status(500).json({ resultCode: 99, message: "Unknown error" });
  }
});

server.get("/api/payments/result/:lookupToken", (req, res) => {
  const state = getState();
  const order = state.orders.find((item) => item.lookupToken === req.params.lookupToken);
  if (!order) return res.status(404).json({ error: "Không tìm thấy kết quả thanh toán." });
  res.json(resultPayload(order));
});

server.get("/api/orders/mine", (req, res) => {
  try {
    const state = getState();
    const user = getUser(req, state);
    const orders = state.orders
      .filter((order) => String(order.userId) === String(user.id))
      .map((order) => sanitizeOrder(order, { includeLookupToken: true }));
    res.json(orders);
  } catch (error) {
    handleError(res, error);
  }
});

server.get("/api/admin/orders", (req, res) => {
  try {
    const state = getState();
    requireAdmin(req, state);
    res.json(state.orders.map((order) => sanitizeOrder(order)));
  } catch (error) {
    handleError(res, error);
  }
});

server.patch("/api/admin/orders/:orderId/status", (req, res) => {
  try {
    const state = getState();
    requireAdmin(req, state);
    const order = state.orders.find((item) => item.id === req.params.orderId || String(item.id) === req.params.orderId);
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
    if (
      order.paymentMethod === "vnpay" &&
      order.paymentStatus !== "paid" &&
      ["confirmed", "shipping", "completed"].includes(nextStatus)
    ) {
      return res.status(409).json({ error: "Đơn VNPAY chưa thanh toán nên chưa thể giao hàng." });
    }
    if (
      nextStatus === "cancelled" &&
      order.paymentMethod === "vnpay" &&
      order.paymentStatus === "paid"
    ) {
      return res.status(409).json({
        error: "Đơn VNPAY đã thanh toán cần hoàn tiền trước khi hủy.",
      });
    }
    if (nextStatus === "cancelled") releaseCancelledOrder(state, order);
    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    saveState();
    res.json({ order: sanitizeOrder(order) });
  } catch (error) {
    handleError(res, error);
  }
});

server.delete("/api/admin/orders/:orderId", (req, res) => {
  try {
    const state = getState();
    requireAdmin(req, state);
    const index = state.orders.findIndex(
      (item) => item.id === req.params.orderId || String(item.id) === req.params.orderId,
    );
    if (index < 0) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    const order = state.orders[index];
    if (order.paymentMethod === "vnpay") {
      return res.status(409).json({ error: "Không thể xóa lịch sử đơn thanh toán VNPAY." });
    }
    if (!["completed", "cancelled"].includes(order.status)) {
      return res.status(409).json({ error: "Chỉ được xóa đơn đã hoàn thành hoặc đã hủy." });
    }
    state.orders.splice(index, 1);
    saveState();
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

server.use((req, res, next) => {
  if (isProtectedPaymentResource(req.path)) {
    return res.status(403).json({
      error: "Tài nguyên thanh toán chỉ được truy cập qua API nghiệp vụ.",
    });
  }
  next();
});

// Giữ route DELETE tùy chỉnh cho các resource không nhạy cảm.
server.delete("/:resource/:id", (req, res) => {
  try {
    const state = getState();
    const data = state[req.params.resource];
    if (!Array.isArray(data)) return res.status(404).json({ message: "Không tồn tại resource" });
    const index = data.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    data.splice(index, 1);
    saveState();
    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

server.use((req, _res, next) => {
  router.db.read();
  next();
});
server.use(router);

const listener = server.listen(PORT, () => {
  console.log(`JSON Server + VNPAY Sandbox chạy tại http://127.0.0.1:${listener.address().port}`);
});
