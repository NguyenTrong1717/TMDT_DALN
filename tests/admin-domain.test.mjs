import test from "node:test";
import assert from "node:assert/strict";
import {
  assertOrderTransition,
  getCustomerTier,
  paidNetAmount,
  refundableAmount,
  validatePositiveMoney,
} from "../backend/admin-domain.mjs";
import { createSession, hashPassword, publicUser, verifyPassword } from "../backend/security.mjs";
import { fulfillOrder } from "../backend/vnpay.mjs";

test("passwords use scrypt and are never exposed in public user", async () => {
  const passwordHash = await hashPassword("demo-secret");
  assert.match(passwordHash, /^scrypt:/);
  assert.equal(await verifyPassword("demo-secret", passwordHash), true);
  assert.equal(await verifyPassword("wrong-secret", passwordHash), false);
  const safe = publicUser({ id: "u1", password: "legacy", passwordHash, role: "user" });
  assert.equal("password" in safe, false);
  assert.equal("passwordHash" in safe, false);
  const session = createSession("u1");
  assert.ok(session.token.length > 30);
  assert.equal("token" in session.document, false);
});

test("order state machine enforces delivered before completed and paid before completion", () => {
  assert.throws(() => assertOrderTransition({ status: "shipping", paymentMethod: "cod", paymentStatus: "paid" }, "completed"), /Không thể chuyển/);
  assert.throws(() => assertOrderTransition({ status: "delivered", paymentMethod: "cod", paymentStatus: "unpaid" }, "completed"), /thanh toán/);
  assert.doesNotThrow(() => assertOrderTransition({ status: "delivered", paymentMethod: "cod", paymentStatus: "paid" }, "completed"));
  assert.throws(() => assertOrderTransition({ status: "pending", paymentMethod: "vnpay", paymentStatus: "pending" }, "confirmed"), /online/);
});

test("refund math rejects empty, zero and over-refund values", () => {
  const order = { totalAmount: 1_000_000, paymentStatus: "paid", refundedAmount: 250_000 };
  assert.equal(refundableAmount(order), 750_000);
  assert.equal(paidNetAmount(order), 750_000);
  assert.throws(() => validatePositiveMoney("", 750_000), /lớn hơn 0/);
  assert.throws(() => validatePositiveMoney(0, 750_000), /lớn hơn 0/);
  assert.throws(() => validatePositiveMoney(800_000, 750_000), /vượt quá/);
  assert.equal(validatePositiveMoney(500_000, 750_000), 500_000);
});

test("inventory fulfillment never hides overselling and is idempotent", () => {
  const product = { id: "p1", name: "Món cuối", stock: 1, stockLeft: 1 };
  const state = { products: [product], userVouchers: [], cart: [] };
  const first = { id: "o1", products: [{ productId: "p1", fromTable: "products", name: "Món cuối", quantity: 1 }], checkoutMode: "buy_now" };
  fulfillOrder(state, first);
  assert.equal(product.stock, 0);
  fulfillOrder(state, first);
  assert.equal(product.stock, 0);
  const second = { id: "o2", products: [{ productId: "p1", fromTable: "products", name: "Món cuối", quantity: 1 }], checkoutMode: "buy_now" };
  assert.throws(() => fulfillOrder(state, second), /không đủ tồn kho/);
  assert.equal(product.stock, 0);
});

test("membership thresholds are shared and deterministic", () => {
  assert.equal(getCustomerTier(4_999_999).key, "bronze");
  assert.equal(getCustomerTier(5_000_000).key, "silver");
  assert.equal(getCustomerTier(15_000_000).key, "gold");
  assert.equal(getCustomerTier(40_000_000).key, "diamond");
});

