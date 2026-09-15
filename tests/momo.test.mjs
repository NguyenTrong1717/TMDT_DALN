import test from "node:test";
import assert from "node:assert/strict";
import {
  createBaseOrder,
  quoteCheckout,
} from "../backend/vnpay.mjs";
import {
  buildMomoCallbackRawSignature,
  buildMomoCreateRawSignature,
  processMomoIpn,
  signHmacSha256,
  verifyMomoSignature,
} from "../backend/momo.mjs";

const CONFIG = {
  partnerCode: "MOMOBKUN20180529",
  accessKey: "klm05TvNBzhg7h7j",
  secretKey: "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa",
  apiUrl: "https://test-payment.momo.vn/v2/gateway/api/create",
  returnUrl: "http://127.0.0.1:3000/api/payments/momo/return",
  ipnUrl: "http://127.0.0.1:3000/api/payments/momo/ipn",
  frontendUrl: "http://localhost:5173",
};

const NOW = new Date("2026-09-15T09:00:00.000Z");

const fixture = () => ({
  users: [{ id: "u1", role: "user" }],
  catenogies: [{ id: "p1", name: "PC Gaming", price: 1000000 }],
  eventList: [
    { id: "p2", name: "RAM Corsair", price: 500000, stockLeft: 10, status: "Còn hàng" },
  ],
  cart: [
    { id: "c1", userId: "u1", productId: "p2", fromTable: "eventList", quantity: 2 },
  ],
  vouchers: [
    { id: "v1", code: "MOMO100", type: "amount", value: 100000, minOrder: 500000 },
  ],
  userVouchers: [
    { id: "uv1", userId: "u1", voucherCode: "MOMO100", used: false },
  ],
  orders: [],
  paymentAttempts: [],
});

const cartInput = () => ({
  requestId: "momo_req_test_123",
  userId: "u1",
  checkoutMode: "cart",
  voucherCode: "MOMO100",
  items: [
    { cartId: "c1", productId: "p2", fromTable: "eventList", quantity: 2 },
  ],
  customer: { fullName: "Nguyen Van Test", phone: "0963181717", address: "Ha Noi" },
});

const makeAttempt = (order, overrides = {}) => ({
  id: "pay_momo_test_1",
  orderId: order.id,
  txnRef: order.orderCode,
  momoRequestId: "req_momo_1",
  paymentMethod: "momo",
  amount: order.totalAmount,
  status: "pending",
  createdAt: NOW.toISOString(),
  expiresAt: new Date(NOW.getTime() + 15 * 60 * 1000).toISOString(),
  paymentUrl: "https://test-payment.momo.vn/v2/gateway/pay?token=test_token",
  ...overrides,
});

const signedCallback = (attempt, overrides = {}) => {
  const payload = {
    partnerCode: CONFIG.partnerCode,
    orderId: attempt.txnRef,
    requestId: attempt.momoRequestId,
    amount: attempt.amount,
    orderInfo: `Thanh toán đơn hàng ${attempt.txnRef}`,
    orderType: "momo_wallet",
    transId: 2345678901,
    resultCode: 0,
    message: "Thành công.",
    payType: "qr",
    responseTime: 1726390000000,
    extraData: "",
    ...overrides,
  };

  const raw = buildMomoCallbackRawSignature({
    accessKey: CONFIG.accessKey,
    ...payload,
  });

  return {
    ...payload,
    signature: signHmacSha256(raw, CONFIG.secretKey),
  };
};

test("MoMo signature generation and verification works accurately", () => {
  const createRaw = buildMomoCreateRawSignature({
    accessKey: CONFIG.accessKey,
    amount: 900000,
    extraData: "",
    ipnUrl: CONFIG.ipnUrl,
    orderId: "DH-2026-001",
    orderInfo: "Thanh toan MoMo",
    partnerCode: CONFIG.partnerCode,
    redirectUrl: CONFIG.returnUrl,
    requestId: "req_001",
    requestType: "captureWallet",
  });

  const sig = signHmacSha256(createRaw, CONFIG.secretKey);
  assert.equal(typeof sig, "string");
  assert.equal(sig.length, 64);

  const callbackData = {
    partnerCode: CONFIG.partnerCode,
    orderId: "DH-2026-001",
    requestId: "req_001",
    amount: 900000,
    orderInfo: "Thanh toan MoMo",
    orderType: "momo_wallet",
    transId: 123456,
    resultCode: 0,
    message: "Thành công.",
    payType: "qr",
    responseTime: 1726390000000,
    extraData: "",
  };

  const callbackRaw = buildMomoCallbackRawSignature({
    accessKey: CONFIG.accessKey,
    ...callbackData,
  });
  const validSig = signHmacSha256(callbackRaw, CONFIG.secretKey);

  assert.equal(
    verifyMomoSignature(
      { ...callbackData, signature: validSig },
      CONFIG.secretKey,
      CONFIG.accessKey,
    ),
    true,
  );

  assert.equal(
    verifyMomoSignature(
      { ...callbackData, signature: "invalid_hex_hash_1234567890" },
      CONFIG.secretKey,
      CONFIG.accessKey,
    ),
    false,
  );
});

test("processMomoIpn verifies valid payment and updates state and stock", () => {
  const state = fixture();
  const input = cartInput();
  const quote = quoteCheckout(state, input, { now: NOW });
  const order = createBaseOrder({ input, quote, paymentMethod: "momo", now: NOW });
  const attempt = makeAttempt(order);
  order.latestPaymentAttemptId = attempt.id;
  state.orders.push(order);
  state.paymentAttempts.push(attempt);

  const ipnBody = signedCallback(attempt);
  const result = processMomoIpn({ state, body: ipnBody, config: CONFIG, now: NOW });

  assert.equal(result.status, 200);
  assert.equal(result.response.resultCode, 0);
  assert.equal(result.changed, true);

  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.status, "pending");
  assert.equal(state.eventList[0].stockLeft, 8); // 10 - 2 = 8
  assert.equal(state.userVouchers[0].used, true); // voucher marked used
  assert.equal(state.cart.length, 0); // cart processed
});

test("processMomoIpn rejects invalid signature", () => {
  const state = fixture();
  const input = cartInput();
  const quote = quoteCheckout(state, input, { now: NOW });
  const order = createBaseOrder({ input, quote, paymentMethod: "momo", now: NOW });
  const attempt = makeAttempt(order);
  state.orders.push(order);
  state.paymentAttempts.push(attempt);

  const ipnBody = {
    ...signedCallback(attempt),
    signature: "tampered_signature_value_1234567890",
  };

  const result = processMomoIpn({ state, body: ipnBody, config: CONFIG, now: NOW });
  assert.equal(result.status, 400);
  assert.equal(result.response.resultCode, 97);
  assert.equal(result.changed, false);
});

test("processMomoIpn handles user-cancelled transaction gracefully", () => {
  const state = fixture();
  const input = cartInput();
  const quote = quoteCheckout(state, input, { now: NOW });
  const order = createBaseOrder({ input, quote, paymentMethod: "momo", now: NOW });
  const attempt = makeAttempt(order);
  order.latestPaymentAttemptId = attempt.id;
  state.orders.push(order);
  state.paymentAttempts.push(attempt);

  const cancelledBody = signedCallback(attempt, {
    resultCode: 1006,
    message: "Giao dịch bị từ chối bởi người dùng.",
  });

  const result = processMomoIpn({ state, body: cancelledBody, config: CONFIG, now: NOW });
  assert.equal(result.status, 200);
  assert.equal(attempt.status, "failed");
  assert.equal(order.paymentStatus, "failed");
  assert.equal(state.eventList[0].stockLeft, 10); // kho giữ nguyên
});

test("return URL matching correctly identifies target attempt without undefined pollution", () => {
  const oldVnpayAttempt = { id: "att_old", txnRef: "DH-OLD", momoRequestId: undefined };
  const targetMomoAttempt = { id: "att_new", txnRef: "DH-NEW", momoRequestId: "req_new_123" };
  const attempts = [oldVnpayAttempt, targetMomoAttempt];

  const queryWithoutRequestId = { orderId: "DH-NEW", resultCode: "1006" };

  const orderIdQuery = queryWithoutRequestId.orderId ? String(queryWithoutRequestId.orderId) : null;
  const requestIdQuery = queryWithoutRequestId.requestId ? String(queryWithoutRequestId.requestId) : null;

  const matched = attempts.find(
    (item) =>
      (orderIdQuery && item.txnRef === orderIdQuery) ||
      (requestIdQuery && item.momoRequestId === requestIdQuery),
  );

  assert.equal(matched?.id, "att_new");
});

