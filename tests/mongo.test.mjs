import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { MongoClient } from "mongodb";
import { hashPassword } from "../backend/security.mjs";

try { process.loadEnvFile?.(); } catch (error) { if (error.code !== "ENOENT") throw error; }

test("Mongo backend enforces auth, workflow and inventory consistency on an isolated database", { timeout: 30000 }, async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017";
  const dbName = `tmdt_daln_test_${process.pid}_${Date.now()}`;
  assert.match(dbName, /^tmdt_daln_test_/);
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 3000 });
  let child;
  try {
    await mongo.connect();
  } catch (error) {
    await mongo.close().catch(() => {});
    return test.skip(`MongoDB test fixture unavailable: ${error.message}`);
  }

  try {
    const db = mongo.db(dbName);
    const adminHash = await hashPassword("admin-pass");
    const userHash = await hashPassword("user-pass");
    await db.collection("users").insertMany([
      { id: "admin", email: "admin@test.local", emailNormalized: "admin@test.local", passwordHash: adminHash, fullName: "Admin", role: "admin", status: "active" },
      { id: "warehouse", email: "warehouse@test.local", emailNormalized: "warehouse@test.local", passwordHash: adminHash, fullName: "Kho", role: "warehouse", status: "active" },
      { id: "support", email: "support@test.local", emailNormalized: "support@test.local", passwordHash: adminHash, fullName: "CSKH", role: "support", status: "active" },
      { id: "u1", email: "u1@test.local", phone: "0900000001", password: "legacy-pass", fullName: "User 1", role: "user", status: "active" },
      { id: "u2", email: "u2@test.local", emailNormalized: "u2@test.local", passwordHash: userHash, fullName: "User 2", role: "user", status: "active" },
      { id: "locked", email: "locked@test.local", emailNormalized: "locked@test.local", passwordHash: userHash, fullName: "Locked", role: "user", status: "locked" },
    ]);
    await db.collection("products").insertMany([
      { id: "last", name: "Last item", price: 100000, stock: 1, stockLeft: 1 },
      { id: "pay", name: "Payment item", price: 200000, stock: 5, stockLeft: 5 },
      { id: "cancel-pay", name: "Cancelled paid item", price: 300000, stock: 0, stockLeft: 0 },
    ]);
    await db.collection("orders").insertMany([
      { id: "flow", orderCode: "FLOW", userId: "u1", paymentMethod: "cod", paymentStatus: "unpaid", status: "confirmed", totalAmount: 200000, products: [{ productId: "pay", fromTable: "products", name: "Payment item", unitPrice: 200000, subtotal: 200000, quantity: 1 }], version: 1, createdAt: new Date().toISOString() },
      { id: "race", orderCode: "RACE", userId: "u1", paymentMethod: "cod", paymentStatus: "unpaid", status: "pending", totalAmount: 200000, products: [], version: 1, createdAt: new Date().toISOString() },
      { id: "return-flow", orderCode: "RETURN", userId: "u1", paymentMethod: "cod", paymentStatus: "paid", status: "completed", totalAmount: 200000, refundedAmount: 0, products: [{ productId: "pay", fromTable: "products", name: "Payment item", unitPrice: 200000, subtotal: 200000, quantity: 1 }], version: 1, paidAt: new Date().toISOString(), createdAt: new Date().toISOString() },
      { id: "paid-cancel", orderCode: "PAID-CANCEL", userId: "u1", paymentMethod: "vnpay", paymentStatus: "paid", status: "confirmed", totalAmount: 300000, refundedAmount: 0, inventoryProcessed: true, products: [{ productId: "cancel-pay", fromTable: "products", name: "Cancelled paid item", unitPrice: 300000, subtotal: 300000, quantity: 1 }], version: 1, paidAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    ]);
    await db.collection("cart").insertOne({ id: "cart-delete", userId: "u1", productId: "pay", fromTable: "products", quantity: 1 });

    const port = String(31000 + (process.pid % 1000));
    child = spawn(process.execPath, ["server_mongodb.mjs"], {
      cwd: process.cwd(),
      windowsHide: true,
      env: { ...process.env, PORT: port, MONGO_URI: mongoUri, DB_NAME: dbName, VNP_TMN_CODE: "TESTCODE", VNP_HASH_SECRET: "TEST_SECRET", VNP_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html", VNP_RETURN_URL: `http://127.0.0.1:${port}/api/payments/vnpay/return` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Mongo backend startup timed out")), 10000);
      child.once("error", reject);
      child.stdout.on("data", (chunk) => { if (chunk.toString().includes(`:${port}`)) { clearTimeout(timer); resolve(); } });
      child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    });
    const base = `http://127.0.0.1:${port}`;
    const login = async (account, password) => {
      const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account, password }) });
      return { response, data: await response.json() };
    };
    const auth = (token, body) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(body || {}) });

    assert.equal((await fetch(`${base}/api/admin/orders`, { headers: { "x-user-id": "admin" } })).status, 401);
    assert.equal((await login("locked@test.local", "user-pass")).response.status, 423);
    const [adminLogin, warehouseLogin, supportLogin, user1Login, user2Login] = await Promise.all([
      login("admin@test.local", "admin-pass"), login("warehouse@test.local", "admin-pass"), login("support@test.local", "admin-pass"), login("u1@test.local", "legacy-pass"), login("u2@test.local", "user-pass"),
    ]);
    for (const result of [adminLogin, warehouseLogin, supportLogin, user1Login, user2Login]) assert.equal(result.response.status, 200, JSON.stringify(result.data));
    const deleteCartItem = await fetch(`${base}/cart/cart-delete`, { method: "DELETE", headers: auth(user1Login.data.token) });
    assert.equal(deleteCartItem.status, 200, await deleteCartItem.text());
    assert.equal(await db.collection("cart").countDocuments({ id: "cart-delete" }), 0);
    assert.equal((await fetch(`${base}/api/admin/orders`, { headers: auth(user1Login.data.token) })).status, 403);
    assert.equal((await fetch(`${base}/api/admin/users`, { headers: auth(warehouseLogin.data.token) })).status, 403);
    assert.equal((await fetch(`${base}/userVouchers`, { method: "POST", headers: auth(user1Login.data.token), body: JSON.stringify({ voucherCode: "FORGED", used: false }) })).status, 403);
    assert.equal((await fetch(`${base}/products/pay`, { method: "PATCH", headers: auth(user1Login.data.token), body: JSON.stringify({ price: 1, stock: 999 }) })).status, 403);
    assert.equal((await fetch(`${base}/orders`, { headers: auth(adminLogin.data.token) })).status, 403);
    assert.equal((await fetch(`${base}/products/pay`, { method: "PATCH", headers: auth(warehouseLogin.data.token), body: JSON.stringify({ price: 1, lowStockThreshold: 2 }) })).status, 200);
    assert.equal((await db.collection("products").findOne({ id: "pay" })).price, 200000);
    const migrated = await db.collection("users").findOne({ id: "u1" });
    assert.equal("password" in migrated, false);
    assert.match(migrated.passwordHash, /^scrypt:/);

    const checkoutBody = (requestId) => ({ requestId, checkoutMode: "buy_now", paymentMethod: "cod", items: [{ productId: "last", fromTable: "products", quantity: 1 }], customer: { fullName: "Fixture", phone: "0900000000", address: "Test address" } });
    const checkout = (token, requestId) => fetch(`${base}/api/orders/checkout`, { method: "POST", headers: auth(token), body: JSON.stringify(checkoutBody(requestId)) });
    const competing = await Promise.all([checkout(user1Login.data.token, "last_item_req_1"), checkout(user2Login.data.token, "last_item_req_2")]);
    assert.deepEqual(competing.map((response) => response.status).sort(), [201, 400]);
    assert.equal((await db.collection("products").findOne({ id: "last" })).stock, 0);

    const ship = await fetch(`${base}/api/admin/orders/flow/shipping`, { method: "PATCH", headers: auth(warehouseLogin.data.token), body: JSON.stringify({ carrier: "HCore Express" }) });
    assert.equal(ship.status, 200, await ship.text());
    const deliver = await fetch(`${base}/api/admin/orders/flow/status`, { method: "PATCH", headers: auth(warehouseLogin.data.token), body: JSON.stringify({ status: "delivered" }) });
    assert.equal(deliver.status, 200, await deliver.text());
    assert.equal((await fetch(`${base}/api/admin/orders/flow/status`, { method: "PATCH", headers: auth(adminLogin.data.token), body: JSON.stringify({ status: "completed" }) })).status, 409);
    assert.equal((await fetch(`${base}/api/admin/orders/flow/collect-cod`, { method: "POST", headers: auth(warehouseLogin.data.token), body: JSON.stringify({ reference: "COD-FIXTURE-1" }) })).status, 200);
    assert.equal((await fetch(`${base}/api/admin/orders/flow/status`, { method: "PATCH", headers: auth(adminLogin.data.token), body: JSON.stringify({ status: "completed" }) })).status, 200);

    assert.equal((await fetch(`${base}/api/admin/orders/paid-cancel/status`, { method: "PATCH", headers: auth(adminLogin.data.token), body: JSON.stringify({ status: "cancelled", reason: "Khách đổi ý" }) })).status, 409);
    assert.equal((await fetch(`${base}/api/admin/orders/paid-cancel/manual-refund`, { method: "POST", headers: auth(adminLogin.data.token), body: JSON.stringify({ amount: 0, reason: "Khách đổi ý", reference: "REF-CANCEL-1", evidence: "fixture://receipt" }) })).status, 400);
    const cancellationRefund = JSON.stringify({ amount: 300000, reason: "Khách đổi ý", reference: "REF-CANCEL-1", evidence: "fixture://receipt" });
    assert.equal((await fetch(`${base}/api/admin/orders/paid-cancel/manual-refund`, { method: "POST", headers: auth(adminLogin.data.token), body: cancellationRefund })).status, 200);
    assert.equal((await fetch(`${base}/api/admin/orders/paid-cancel/manual-refund`, { method: "POST", headers: auth(adminLogin.data.token), body: cancellationRefund })).status, 200);
    assert.equal((await fetch(`${base}/api/admin/orders/paid-cancel/status`, { method: "PATCH", headers: auth(adminLogin.data.token), body: JSON.stringify({ status: "cancelled", reason: "Khách đổi ý" }) })).status, 200);
    assert.equal((await db.collection("orders").findOne({ id: "paid-cancel" })).refundedAmount, 300000);
    assert.equal((await db.collection("products").findOne({ id: "cancel-pay" })).stock, 1);

    const concurrentStatus = await Promise.all([
      fetch(`${base}/api/admin/orders/race/status`, { method: "PATCH", headers: auth(adminLogin.data.token), body: JSON.stringify({ status: "confirmed" }) }),
      fetch(`${base}/api/admin/orders/race/status`, { method: "PATCH", headers: auth(warehouseLogin.data.token), body: JSON.stringify({ status: "confirmed" }) }),
    ]);
    assert.deepEqual(concurrentStatus.map((response) => response.status).sort(), [200, 409]);
    assert.equal((await fetch(`${base}/api/admin/orders/flow/internal-note`, { method: "PATCH", headers: auth(adminLogin.data.token), body: JSON.stringify({ internalNote: "Persisted fixture note" }) })).status, 200);
    const listed = await (await fetch(`${base}/api/admin/orders`, { headers: auth(adminLogin.data.token) })).json();
    assert.equal(listed.find((order) => order.id === "flow").internalNote, "Persisted fixture note");

    const returnResponse = await fetch(`${base}/api/orders/return-flow/returns`, {
      method: "POST",
      headers: auth(user1Login.data.token),
      body: JSON.stringify({ requestId: "return_fixture_0001", reason: "Sản phẩm bị lỗi nguồn", requestedAmount: 100000, items: [{ productId: "pay", fromTable: "products", quantity: 1 }] }),
    });
    const returnRequest = await returnResponse.json();
    assert.equal(returnResponse.status, 201, JSON.stringify(returnRequest));
    assert.equal((await fetch(`${base}/api/admin/returns/${returnRequest.id}/status`, { method: "PATCH", headers: auth(supportLogin.data.token), body: JSON.stringify({ status: "approved", note: "Đủ điều kiện tiếp nhận" }) })).status, 200);
    assert.equal((await fetch(`${base}/api/admin/returns/${returnRequest.id}/status`, { method: "PATCH", headers: auth(warehouseLogin.data.token), body: JSON.stringify({ status: "processing", note: "Kho đã nhận và kiểm tra" }) })).status, 200);
    const restockBody = JSON.stringify({ reason: "Hàng nguyên vẹn, đủ điều kiện bán lại", items: [{ productId: "pay", fromTable: "products", quantity: 1, resellable: true }] });
    assert.equal((await fetch(`${base}/api/admin/returns/${returnRequest.id}/restock`, { method: "POST", headers: auth(warehouseLogin.data.token), body: restockBody })).status, 200);
    assert.equal((await fetch(`${base}/api/admin/returns/${returnRequest.id}/restock`, { method: "POST", headers: auth(warehouseLogin.data.token), body: restockBody })).status, 200);
    assert.equal((await db.collection("products").findOne({ id: "pay" })).stock, 6);
    const refundBody = JSON.stringify({ amount: 100000, reference: "REF-FIXTURE-1", evidence: "fixture://bank-receipt" });
    assert.equal((await fetch(`${base}/api/admin/returns/${returnRequest.id}/manual-refund`, { method: "POST", headers: auth(adminLogin.data.token), body: refundBody })).status, 200);
    assert.equal((await fetch(`${base}/api/admin/returns/${returnRequest.id}/manual-refund`, { method: "POST", headers: auth(adminLogin.data.token), body: refundBody })).status, 200);
    const refundedOrder = await db.collection("orders").findOne({ id: "return-flow" });
    assert.equal(refundedOrder.refundedAmount, 100000);
    assert.equal(refundedOrder.paymentStatus, "partially_refunded");
    assert.equal((await db.collection("inventoryMovements").countDocuments({ returnId: returnRequest.id })), 1);

    const localDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    const statistics = await (await fetch(`${base}/api/admin/statistics?from=${localDate}&to=${localDate}`, { headers: auth(adminLogin.data.token) })).json();
    assert.equal(statistics.current.collected, 700000);
    assert.equal(statistics.current.refunds, 400000);
    assert.equal(statistics.current.revenue, 300000);
    const customerRows = await (await fetch(`${base}/api/admin/users`, { headers: auth(supportLogin.data.token) })).json();
    assert.equal(customerRows.find((user) => user.id === "u1").totalSpent, 300000);

    const auditLogs = await (await fetch(`${base}/api/admin/audit-logs`, { headers: auth(adminLogin.data.token) })).json();
    assert.ok(auditLogs.some((entry) => entry.action === "payment.cod_collected"));
    assert.ok(auditLogs.some((entry) => entry.action === "refund.manual_recorded"));
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await new Promise((resolve) => child.once("close", resolve));
    }
    assert.match(dbName, /^tmdt_daln_test_/);
    await mongo.db(dbName).dropDatabase().catch(() => {});
    await mongo.close();
  }
});
