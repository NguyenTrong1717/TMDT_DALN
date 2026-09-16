import crypto from "node:crypto";

export const PRODUCT_TABLES = new Set([
  "catenogies",
  "eventList",
  "LaptopUser",
  "ProductPagies",
  "ProductMenus",
  "appliances",
  "products",
]);

export const RESERVATION_MINUTES = 15;

export const isProtectedPaymentResource = (path) =>
  /^\/(orders|paymentAttempts)(\/|$)/.test(path);

const cleanPrice = (value) => {
  if (typeof value === "number") return value;
  return Number.parseInt(String(value || "").replace(/[^0-9]/g, ""), 10) || 0;
};

const sameId = (left, right) => String(left) === String(right);
const iso = (value) => new Date(value).toISOString();

export const encodeVnpayValue = (value) =>
  encodeURIComponent(String(value)).replace(/%20/g, "+");

export const buildVnpayQuery = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) =>
        `${encodeVnpayValue(key)}=${encodeVnpayValue(value)}`,
    )
    .join("&");

export const signVnpayParams = (params, hashSecret) =>
  crypto
    .createHmac("sha512", hashSecret)
    .update(buildVnpayQuery(params), "utf8")
    .digest("hex");

export const verifyVnpaySignature = (query, hashSecret) => {
  const receivedHash = String(query.vnp_SecureHash || "").toLowerCase();
  const params = Object.fromEntries(
    Object.entries(query).filter(
      ([key]) => key.startsWith("vnp_") && !["vnp_SecureHash", "vnp_SecureHashType"].includes(key),
    ),
  );
  const expectedHash = signVnpayParams(params, hashSecret).toLowerCase();
  const received = Buffer.from(receivedHash, "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

export const formatVnpayDate = (date) => {
  const vietnamTime = new Date(new Date(date).getTime() + 7 * 60 * 60 * 1000);
  const pad = (number) => String(number).padStart(2, "0");
  return [
    vietnamTime.getUTCFullYear(),
    pad(vietnamTime.getUTCMonth() + 1),
    pad(vietnamTime.getUTCDate()),
    pad(vietnamTime.getUTCHours()),
    pad(vietnamTime.getUTCMinutes()),
    pad(vietnamTime.getUTCSeconds()),
  ].join("");
};

export const makeOrderCode = (now = new Date()) =>
  `DH-${formatVnpayDate(now)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

export const makeTxnRef = (now = new Date()) =>
  `${formatVnpayDate(now)}${crypto.randomBytes(5).toString("hex")}`;

const getProduct = (state, fromTable, productId) => {
  if (!PRODUCT_TABLES.has(fromTable)) throw new Error("Nguồn sản phẩm không hợp lệ.");
  const product = state[fromTable]?.find((item) => sameId(item.id, productId));
  if (!product || product.deleted === true) throw new Error("Sản phẩm không tồn tại.");
  return product;
};

const activeReservationQuantity = (state, fromTable, productId, variantId, now, excludeOrderId) =>
  (state.orders || [])
    .filter(
      (order) =>
        order.id !== excludeOrderId &&
        ["vnpay", "momo"].includes(order.paymentMethod) &&
        order.paymentStatus === "pending" &&
        new Date(order.reservationExpiresAt).getTime() > now.getTime(),
    )
    .flatMap((order) => order.products || [])
    .filter(
      (item) => item.fromTable === fromTable && sameId(item.productId, productId) && sameId(item.variantId || "", variantId || ""),
    )
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const resolveRequestedItems = (state, input) => {
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) {
    throw new Error("Danh sách sản phẩm không hợp lệ.");
  }

  if (input.checkoutMode === "cart") {
    const userCart = (state.cart || []).filter((item) => sameId(item.userId, input.userId));
    return input.items.map((requested) => {
      const cartItem = userCart.find(
        (item) =>
          (requested.cartId && sameId(item.id, requested.cartId)) ||
          (sameId(item.productId, requested.productId) &&
            item.fromTable === requested.fromTable),
      );
      if (!cartItem) throw new Error("Sản phẩm không còn trong giỏ hàng.");
      if (Number(cartItem.quantity) !== Number(requested.quantity)) {
        throw new Error("Giỏ hàng vừa thay đổi, vui lòng tải lại trang.");
      }
      return { ...cartItem, cartId: cartItem.id };
    });
  }

  if (input.checkoutMode !== "buy_now") throw new Error("Luồng mua hàng không hợp lệ.");
  return input.items;
};

const calculateVoucher = (state, userId, voucherCode, subTotal, now, excludeOrderId, hasFlashSale) => {
  if (!voucherCode) return { voucher: null, userVoucher: null, discountAmount: 0 };
  const normalizedCode = String(voucherCode).trim().toUpperCase();
  const voucher = (state.vouchers || []).find((item) => item.code === normalizedCode);
  const userVoucher = (state.userVouchers || []).find(
    (item) => sameId(item.userId, userId) && item.voucherCode === normalizedCode,
  );

  if (!voucher || !userVoucher || userVoucher.used === true) {
    throw new Error("Voucher không hợp lệ hoặc đã được sử dụng.");
  }
  if (voucher.active === false) throw new Error("Voucher đang bị tạm ngừng.");
  if (voucher.startsAt && new Date(voucher.startsAt) > now) throw new Error("Voucher chưa đến thời gian sử dụng.");
  if (voucher.expiredAt && new Date(`${voucher.expiredAt}T23:59:59+07:00`) < now) {
    throw new Error("Voucher đã hết hạn.");
  }
  if (subTotal < Number(voucher.minOrder || 0)) {
    throw new Error("Đơn hàng chưa đạt giá trị tối thiểu của voucher.");
  }
  if (hasFlashSale && voucher.combinable === false) {
    throw new Error("Voucher này không được dùng chung với sản phẩm Flash Sale.");
  }
  if (Number(voucher.maxCollect || 0) > 0 && Number(voucher.collectedCount || 0) > Number(voucher.maxCollect)) {
    throw new Error("Voucher đã hết lượt sử dụng.");
  }

  const reservedByAnotherOrder = (state.orders || []).some(
    (order) =>
      order.id !== excludeOrderId &&
      sameId(order.userId, userId) &&
      order.voucherCode === normalizedCode &&
      ["vnpay", "momo"].includes(order.paymentMethod) &&
      order.paymentStatus === "pending" &&
      new Date(order.reservationExpiresAt).getTime() > now.getTime(),
  );
  if (reservedByAnotherOrder) throw new Error("Voucher đang được giữ cho một đơn khác.");

  let discountAmount = 0;
  if (voucher.type === "amount") {
    discountAmount = Number(voucher.value || 0);
  } else if (voucher.type === "percent") {
    discountAmount = (subTotal * Number(voucher.value || 0)) / 100;
    if (voucher.maxDiscount) {
      discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
    }
  }
  return { voucher, userVoucher, discountAmount: Math.max(0, discountAmount) };
};

export const quoteCheckout = (state, input, options = {}) => {
  const now = options.now || new Date();
  const flashSaleSettings = (state.settings || []).find((item) => item.id === "flashSale");
  const requestedItems = resolveRequestedItems(state, input);
  const seen = new Set();
  const products = requestedItems.map((item) => {
    const fromTable = item.fromTable || item.table || "catenogies";
    const productId = item.productId ?? item.id;
    const quantity = Number(item.quantity);
    const key = `${fromTable}:${productId}`;
    if (seen.has(key)) throw new Error("Sản phẩm bị trùng trong yêu cầu.");
    seen.add(key);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("Số lượng sản phẩm không hợp lệ.");
    }

    const product = getProduct(state, fromTable, productId);
    const variant = item.variantId && Array.isArray(product.variants)
      ? product.variants.find((entry) => sameId(entry.id, item.variantId))
      : null;
    if (item.variantId && !variant) throw new Error("Biến thể sản phẩm không tồn tại.");
    const flashSaleStarted = !flashSaleSettings?.startTime || new Date(flashSaleSettings.startTime) <= now;
    const flashSaleNotEnded = !flashSaleSettings?.endTime || new Date(flashSaleSettings.endTime) >= now;
    const flashSaleActive = product.flashSale === true && flashSaleSettings?.active !== false && flashSaleStarted && flashSaleNotEnded;
    const discountPercent = Number(product.discount || 0);
    if (flashSaleActive && (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 90)) {
      throw new Error("Mức giảm Flash Sale của sản phẩm không hợp lệ.");
    }
    const regularPrice = cleanPrice(variant?.oldPrice ?? (variant ? variant.price : product.oldPrice ?? product.price));
    const unitPrice = flashSaleActive && discountPercent > 0
      ? Math.round((regularPrice * (100 - discountPercent)) / 100)
      : cleanPrice(flashSaleActive
        ? (variant?.price ?? product.price)
        : (product.flashSale === true || product.flashSale === false)
          ? (variant?.oldPrice ?? product.oldPrice ?? variant?.price ?? product.price)
          : (variant?.price ?? product.price));
    if (unitPrice <= 0) throw new Error("Giá sản phẩm không hợp lệ.");
    if (product.status && !String(product.status).toLowerCase().includes("còn")) {
      throw new Error(`${product.name || "Sản phẩm"} hiện không còn hàng.`);
    }
    const inventorySource = variant || product;
    const hasStockField = inventorySource.stockLeft != null || inventorySource.stock != null;
    if (hasStockField) {
      const currentStock = inventorySource.stockLeft != null ? Number(inventorySource.stockLeft) : Number(inventorySource.stock);
      const reserved = activeReservationQuantity(
        state,
        fromTable,
        productId,
        variant?.id,
        now,
        options.excludeOrderId,
      );
      if (currentStock - reserved < quantity) {
        throw new Error(`${product.name || "Sản phẩm"} không đủ tồn kho.`);
      }
    }

    return {
      productId: String(product.id),
      fromTable,
      cartId: item.cartId || null,
      name: product.name || product.title || "Sản phẩm",
      sku: variant?.sku || product.sku || null,
      variantId: variant ? String(variant.id) : null,
      variantName: variant?.name || null,
      image: product.image || "",
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
      discountAmount: 0,
      pricingSource: flashSaleActive ? "flash_sale" : "base",
      flashSaleDiscountPercent: flashSaleActive ? discountPercent : 0,
    };
  });

  const subTotal = products.reduce((sum, item) => sum + item.subtotal, 0);
  const shipping = subTotal > 500000 ? 0 : 30000;
  const voucherResult = calculateVoucher(
    state,
    input.userId,
    input.voucherCode,
    subTotal,
    now,
    options.excludeOrderId,
    products.some((item) => item.pricingSource === "flash_sale"),
  );
  const discountAmount = Math.round(voucherResult.discountAmount);
  const totalAmount = Math.max(0, Math.round(subTotal + shipping - discountAmount));
  if (totalAmount <= 0) throw new Error("Tổng thanh toán phải lớn hơn 0 đồng.");
  if (totalAmount * 100 > 999999999999) {
    throw new Error("Tổng thanh toán vượt giới hạn của VNPAY.");
  }

  let distributed = 0;
  const snapshottedProducts = products.map((product, index) => {
    const itemDiscount = index === products.length - 1
      ? discountAmount - distributed
      : Math.round((product.subtotal / subTotal) * discountAmount);
    distributed += itemDiscount;
    return { ...product, discountAmount: itemDiscount, finalAmount: product.subtotal - itemDiscount };
  });

  return {
    products: snapshottedProducts,
    subTotal,
    shipping,
    discountAmount,
    voucherCode: voucherResult.voucher?.code || null,
    userVoucherId: voucherResult.userVoucher?.id || null,
    totalAmount,
  };
};

export const validateCustomer = (customer = {}) => {
  const result = {
    fullName: String(customer.fullName || "").trim(),
    phone: String(customer.phone || "").trim(),
    email: String(customer.email || "").trim(),
    address: String(customer.address || "").trim(),
    note: String(customer.note || "").trim().slice(0, 1000),
  };
  if (!result.fullName || !result.phone || !result.address) {
    throw new Error("Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ.");
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
    throw new Error("Email không hợp lệ.");
  }
  return result;
};

export const buildPaymentUrl = ({ order, attempt, config, ipAddress, now }) => {
  const expiresAt = new Date(attempt.expiresAt);
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(order.totalAmount * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: attempt.txnRef,
    vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`,
    vnp_OrderType: "110000",
    vnp_Locale: "vn",
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ipAddress || "127.0.0.1",
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expiresAt),
  };
  const secureHash = signVnpayParams(params, config.hashSecret);
  return `${config.url}?${buildVnpayQuery(params)}&vnp_SecureHash=${secureHash}`;
};

export const createBaseOrder = ({ input, quote, paymentMethod, now = new Date() }) => {
  const customer = validateCustomer(input.customer);
  return {
    id: `ord_${crypto.randomUUID()}`,
    orderCode: makeOrderCode(now),
    lookupToken: crypto.randomBytes(32).toString("hex"),
    idempotencyKey: input.requestId,
    userId: String(input.userId),
    ...customer,
    customerName: customer.fullName,
    paymentMethod,
    paymentStatus: ["vnpay", "momo"].includes(paymentMethod) ? "pending" : "unpaid",
    status: "pending",
    ...quote,
    userVoucherId: quote.userVoucherId,
    checkoutMode: input.checkoutMode,
    inventoryProcessed: false,
    voucherProcessed: false,
    cartProcessed: false,
    version: 1,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
};

export const createPaymentAttempt = ({ order, config, ipAddress, now = new Date() }) => {
  const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000);
  const attempt = {
    id: `pay_${crypto.randomUUID()}`,
    orderId: order.id,
    txnRef: makeTxnRef(now),
    amount: order.totalAmount * 100,
    status: "pending",
    createdAt: iso(now),
    expiresAt: iso(expiresAt),
  };
  attempt.paymentUrl = buildPaymentUrl({ order, attempt, config, ipAddress, now });
  return attempt;
};

const processCart = (state, order) => {
  if (order.cartProcessed || order.checkoutMode !== "cart") return;
  for (const orderedItem of order.products) {
    const index = state.cart.findIndex(
      (item) =>
        sameId(item.id, orderedItem.cartId) &&
        sameId(item.userId, order.userId) &&
        sameId(item.productId, orderedItem.productId) &&
        item.fromTable === orderedItem.fromTable,
    );
    if (index < 0) continue;
    const currentQuantity = Number(state.cart[index].quantity || 0);
    if (currentQuantity > orderedItem.quantity) {
      state.cart[index].quantity = currentQuantity - orderedItem.quantity;
    } else {
      state.cart.splice(index, 1);
    }
  }
  order.cartProcessed = true;
};

export const fulfillOrder = (state, order, now = new Date()) => {
  if (order.fulfilledAt) return;
  if (!order.inventoryProcessed) {
    for (const item of order.products) {
      const product = getProduct(state, item.fromTable, item.productId);
      const variant = item.variantId && Array.isArray(product.variants)
        ? product.variants.find((entry) => sameId(entry.id, item.variantId))
        : null;
      const inventorySource = variant || product;
      const hasStock = inventorySource.stockLeft != null || inventorySource.stock != null;
      if (hasStock) {
        const currentStock = inventorySource.stockLeft != null ? Number(inventorySource.stockLeft) : Number(inventorySource.stock);
        if (currentStock < item.quantity) {
          throw new Error(`${item.name || "Sản phẩm"} không đủ tồn kho để ghi nhận thanh toán.`);
        }
        const newStock = currentStock - item.quantity;
        inventorySource.stockLeft = newStock;
        inventorySource.stock = newStock;
        if (!variant && newStock === 0 && product.status) product.status = "Hết hàng";
      }
    }
    order.inventoryProcessed = true;
  }
  if (order.userVoucherId && !order.voucherProcessed) {
    const userVoucher = state.userVouchers.find((item) => sameId(item.id, order.userVoucherId));
    if (userVoucher) {
      userVoucher.used = true;
      userVoucher.usedAt = iso(now);
      userVoucher.orderId = order.id;
    }
    order.voucherProcessed = true;
  }
  processCart(state, order);
  order.fulfilledAt = iso(now);
  order.updatedAt = iso(now);
};

export const releaseCancelledOrder = (state, order, now = new Date()) => {
  if (!order.inventoryProcessed || order.inventoryReleasedAt) return;
  for (const item of order.products || []) {
    const product = getProduct(state, item.fromTable, item.productId);
    const variant = item.variantId && Array.isArray(product.variants)
      ? product.variants.find((entry) => sameId(entry.id, item.variantId))
      : null;
    const inventorySource = variant || product;
    const hasStock = inventorySource.stockLeft != null || inventorySource.stock != null;
    if (hasStock) {
      const currentStock = inventorySource.stockLeft != null ? Number(inventorySource.stockLeft) : Number(inventorySource.stock);
      const newStock = currentStock + Number(item.quantity);
      inventorySource.stockLeft = newStock;
      inventorySource.stock = newStock;
      if (!variant && product.status === "Hết hàng") product.status = "Còn hàng";
    }
  }
  if (order.userVoucherId && order.voucherProcessed) {
    const userVoucher = state.userVouchers.find(
      (item) => sameId(item.id, order.userVoucherId) && item.orderId === order.id,
    );
    if (userVoucher) {
      userVoucher.used = false;
      delete userVoucher.usedAt;
      delete userVoucher.orderId;
    }
  }
  order.inventoryReleasedAt = iso(now);
  order.updatedAt = iso(now);
};

export const processVnpayIpn = ({ state, query, config, now = new Date() }) => {
  if (!verifyVnpaySignature(query, config.hashSecret)) {
    return { response: { RspCode: "97", Message: "Invalid signature" }, changed: false };
  }
  if (query.vnp_TmnCode !== config.tmnCode) {
    return { response: { RspCode: "97", Message: "Invalid merchant" }, changed: false };
  }

  const attempt = (state.paymentAttempts || []).find(
    (item) => item.txnRef === query.vnp_TxnRef,
  );
  if (!attempt) {
    return { response: { RspCode: "01", Message: "Order not found" }, changed: false };
  }
  const order = state.orders.find((item) => item.id === attempt.orderId);
  if (!order) {
    return { response: { RspCode: "01", Message: "Order not found" }, changed: false };
  }
  if (String(attempt.amount) !== String(query.vnp_Amount)) {
    return { response: { RspCode: "04", Message: "Invalid amount" }, changed: false };
  }
  if (attempt.status === "paid" || ["paid", "partially_refunded", "refunded"].includes(order.paymentStatus)) {
    return { response: { RspCode: "02", Message: "Order already confirmed" }, changed: false };
  }

  attempt.responseCode = query.vnp_ResponseCode;
  attempt.transactionStatus = query.vnp_TransactionStatus;
  attempt.vnpTransactionNo = query.vnp_TransactionNo || null;
  attempt.bankCode = query.vnp_BankCode || null;
  attempt.payDate = query.vnp_PayDate || null;
  attempt.ipnReceivedAt = iso(now);

  const successful =
    query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";
  if (successful) {
    try {
      fulfillOrder(state, order, now);
    } catch (error) {
      attempt.processingError = error.message;
      return { response: { RspCode: "99", Message: "Unknown error" }, changed: true };
    }
    attempt.status = "paid";
    if (order.status === "cancelled") {
      order.status = "pending";
      order.reopenedByLatePayment = true;
    }
    order.paymentStatus = "paid";
    order.paidAt = iso(now);
    order.paidPaymentAttemptId = attempt.id;
    order.vnpTransactionNo = attempt.vnpTransactionNo;
    order.reservationExpiresAt = null;
  } else {
    attempt.status = "failed";
    if (order.latestPaymentAttemptId === attempt.id) {
      order.paymentStatus = "failed";
      order.reservationExpiresAt = null;
    }
  }
  order.updatedAt = iso(now);
  return { response: { RspCode: "00", Message: "Confirm Success" }, changed: true };
};

export const sanitizeOrder = (order, { includeLookupToken = false, admin = false } = {}) => {
  const safe = {
    id: order.id,
    orderCode: order.orderCode,
    userId: order.userId,
    fullName: order.fullName,
    customerName: order.customerName || order.fullName,
    phone: order.phone,
    email: order.email,
    address: order.address,
    note: order.note,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus || (order.paymentMethod === "cod" ? "unpaid" : "pending"),
    status: order.status,
    totalAmount: order.totalAmount,
    subTotal: order.subTotal,
    shipping: order.shipping,
    voucherCode: order.voucherCode,
    discountAmount: order.discountAmount,
    products: order.products,
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
    inventoryShortage: order.inventoryShortage === true,
    version: Number(order.version || 0),
    shippingCarrier: order.shippingCarrier || null,
    trackingCode: order.trackingCode || null,
    trackingCodeSource: order.trackingCodeSource || null,
    deliveredAt: order.deliveredAt || null,
    completedAt: order.completedAt || null,
    refundedAmount: Number(order.refundedAmount || 0),
    cancellationRequest: order.cancellationRequest || null,
    statusHistory: Array.isArray(order.statusHistory)
      ? (admin
        ? order.statusHistory
        : order.statusHistory.map(({ from, to, at }) => ({ from, to, at })))
      : [],
    canRetryPayment:
      ["vnpay", "momo"].includes(order.paymentMethod) &&
      order.paymentStatus !== "paid" &&
      !["cancelled", "completed"].includes(order.status),
  };
  if (admin) {
    safe.internalNote = order.internalNote || "";
    safe.codCollectionReference = order.codCollectionReference || null;
    safe.archived = order.archived === true;
    safe.fulfilledAt = order.fulfilledAt || null;
    safe.refundRecords = Array.isArray(order.refundRecords) ? order.refundRecords : [];
  }
  if (includeLookupToken) safe.lookupToken = order.lookupToken;
  return safe;
};
