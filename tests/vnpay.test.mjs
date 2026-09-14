import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVnpayQuery,
  createBaseOrder,
  createPaymentAttempt,
  isProtectedPaymentResource,
  processVnpayIpn,
  quoteCheckout,
  signVnpayParams,
  verifyVnpaySignature,
} from "../backend/vnpay.mjs";

const CONFIG = {
  tmnCode: "TESTCODE",
  hashSecret: "TEST_SECRET_123",
  url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl: "http://localhost:3000/api/payments/vnpay/return",
};
const NOW = new Date("2026-09-14T03:00:00.000Z");

const fixture = () => ({
  users: [{ id: "u1", role: "user" }],
  catenogies: [{ id: "p1", name: "PC", price: 1000000 }],
  eventList: [
    { id: "p2", name: "RAM", price: 500000, stockLeft: 5, status: "Còn hàng" },
  ],
  cart: [
    { id: "c1", userId: "u1", productId: "p2", fromTable: "eventList", quantity: 2 },
  ],
  vouchers: [
    { id: "v1", code: "SAVE100", type: "amount", value: 100000, minOrder: 500000 },
  ],
  userVouchers: [
    { id: "uv1", userId: "u1", voucherCode: "SAVE100", used: false },
  ],
  orders: [],
  paymentAttempts: [],
});

const cartInput = () => ({
  requestId: "request_123456",
  userId: "u1",
  checkoutMode: "cart",
  voucherCode: "SAVE100",
  items: [
    { cartId: "c1", productId: "p2", fromTable: "eventList", quantity: 2 },
  ],
  customer: { fullName: "Test User", phone: "0900000000", address: "Ha Noi" },
});

const signedIpn = (attempt, overrides = {}) => {
  const params = {
    vnp_Amount: String(attempt.amount),
    vnp_BankCode: "NCB",
    vnp_PayDate: "20260914101500",
    vnp_ResponseCode: "00",
    vnp_TmnCode: CONFIG.tmnCode,
    vnp_TransactionNo: "14500001",
    vnp_TransactionStatus: "00",
    vnp_TxnRef: attempt.txnRef,
    ...overrides,
  };
  return { ...params, vnp_SecureHash: signVnpayParams(params, CONFIG.hashSecret) };
};

const pendingOrder = () => {
  const state = fixture();
  const input = cartInput();
  const quote = quoteCheckout(state, input, { now: NOW });
  const order = createBaseOrder({ input, quote, paymentMethod: "vnpay", now: NOW });
  const attempt = createPaymentAttempt({
    order,
    config: CONFIG,
    ipAddress: "127.0.0.1",
    now: NOW,
  });
  order.latestPaymentAttemptId = attempt.id;
  order.reservationExpiresAt = attempt.expiresAt;
  state.orders.push(order);
  state.paymentAttempts.push(attempt);
  return { state, order, attempt };
};

test("tạo chuỗi ký có thứ tự ổn định và xác minh chữ ký hợp lệ/sai", () => {
  const params = { vnp_TxnRef: "ABC 123", vnp_Amount: "100000", vnp_Command: "pay" };
  assert.equal(
    buildVnpayQuery(params),
    "vnp_Amount=100000&vnp_Command=pay&vnp_TxnRef=ABC+123",
  );
  const hash = signVnpayParams(params, CONFIG.hashSecret);
  const wrongHash = `${hash.slice(0, -1)}${hash.endsWith("0") ? "1" : "0"}`;
  assert.equal(hash.length, 128);
  assert.equal(verifyVnpaySignature({ ...params, vnp_SecureHash: hash }, CONFIG.hashSecret), true);
  assert.equal(verifyVnpaySignature({ ...params, vnp_SecureHash: wrongHash }, CONFIG.hashSecret), false);
});

test("IPN sai chữ ký trả mã 97", () => {
  const { state, attempt } = pendingOrder();
  const query = signedIpn(attempt);
  query.vnp_SecureHash = `${query.vnp_SecureHash.slice(0, -1)}x`;
  const result = processVnpayIpn({ state, query, config: CONFIG, now: NOW });
  assert.equal(result.response.RspCode, "97");
  assert.equal(result.changed, false);
});

test("backend bỏ qua đơn giá client sửa và tự tính cho luồng giỏ hàng", () => {
  const state = fixture();
  const input = cartInput();
  input.items[0].unitPrice = 1;
  input.totalAmount = 1;
  const quote = quoteCheckout(state, input, { now: NOW });
  assert.equal(quote.subTotal, 1000000);
  assert.equal(quote.discountAmount, 100000);
  assert.equal(quote.totalAmount, 900000);
  assert.equal(quote.products[0].unitPrice, 500000);
});

test("CRUD json-server không được đi thẳng vào đơn và lần thanh toán", () => {
  assert.equal(isProtectedPaymentResource("/orders/1"), true);
  assert.equal(isProtectedPaymentResource("/paymentAttempts/pay_1"), true);
  assert.equal(isProtectedPaymentResource("/cart/1"), false);
});

test("backend tự tính đúng luồng mua ngay", () => {
  const state = fixture();
  const quote = quoteCheckout(
    state,
    {
      userId: "u1",
      checkoutMode: "buy_now",
      items: [{ productId: "p1", fromTable: "catenogies", quantity: 1, price: 1 }],
    },
    { now: NOW },
  );
  assert.equal(quote.totalAmount, 1000000);
  assert.equal(quote.products[0].unitPrice, 1000000);
});

test("IPN sai số tiền bị từ chối và không đổi đơn", () => {
  const { state, order, attempt } = pendingOrder();
  const result = processVnpayIpn({
    state,
    query: signedIpn(attempt, { vnp_Amount: String(attempt.amount + 100) }),
    config: CONFIG,
    now: NOW,
  });
  assert.equal(result.response.RspCode, "04");
  assert.equal(order.paymentStatus, "pending");
});

test("IPN không tìm thấy đơn trả mã 01", () => {
  const state = fixture();
  const fakeAttempt = { amount: 10000, txnRef: "missing" };
  const result = processVnpayIpn({
    state,
    query: signedIpn(fakeAttempt),
    config: CONFIG,
    now: NOW,
  });
  assert.equal(result.response.RspCode, "01");
});

test("IPN thành công chỉ trừ kho, dùng voucher và xử lý giỏ một lần", () => {
  const { state, order, attempt } = pendingOrder();
  const query = signedIpn(attempt);
  const first = processVnpayIpn({ state, query, config: CONFIG, now: NOW });
  assert.equal(first.response.RspCode, "00");
  assert.equal(order.paymentStatus, "paid");
  assert.equal(state.eventList[0].stockLeft, 3);
  assert.equal(state.userVouchers[0].used, true);
  assert.equal(state.cart.length, 0);

  const duplicate = processVnpayIpn({ state, query, config: CONFIG, now: NOW });
  assert.equal(duplicate.response.RspCode, "02");
  assert.equal(state.eventList[0].stockLeft, 3);
  assert.equal(state.cart.length, 0);
});

test("callback thành công của lần cũ đến muộn vẫn chốt đơn nếu chưa lần nào paid", () => {
  const { state, order, attempt: oldAttempt } = pendingOrder();
  const later = new Date(NOW.getTime() + 60_000);
  const newAttempt = createPaymentAttempt({
    order,
    config: CONFIG,
    ipAddress: "127.0.0.1",
    now: later,
  });
  state.paymentAttempts.push(newAttempt);
  order.latestPaymentAttemptId = newAttempt.id;

  const result = processVnpayIpn({
    state,
    query: signedIpn(oldAttempt),
    config: CONFIG,
    now: later,
  });
  assert.equal(result.response.RspCode, "00");
  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.paidPaymentAttemptId, oldAttempt.id);
});

test("phản hồi thất bại đến muộn không ghi đè đơn đã paid", () => {
  const { state, order, attempt } = pendingOrder();
  processVnpayIpn({ state, query: signedIpn(attempt), config: CONFIG, now: NOW });
  const lateFailure = signedIpn(attempt, {
    vnp_ResponseCode: "24",
    vnp_TransactionStatus: "02",
  });
  const result = processVnpayIpn({ state, query: lateFailure, config: CONFIG, now: NOW });
  assert.equal(result.response.RspCode, "02");
  assert.equal(order.paymentStatus, "paid");
});

test("thanh toán lại tạo mã lần thanh toán mới nhưng giữ nguyên đơn", () => {
  const { order, attempt: firstAttempt } = pendingOrder();
  const secondAttempt = createPaymentAttempt({
    order,
    config: CONFIG,
    ipAddress: "127.0.0.1",
    now: new Date(NOW.getTime() + 1000),
  });
  assert.equal(secondAttempt.orderId, order.id);
  assert.notEqual(secondAttempt.id, firstAttempt.id);
  assert.notEqual(secondAttempt.txnRef, firstAttempt.txnRef);
});
