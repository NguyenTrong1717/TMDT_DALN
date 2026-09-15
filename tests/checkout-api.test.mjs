import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

test("HTTP checkout routes create COD and VNPAY orders in an isolated database", { timeout: 15000 }, async () => {
  // Never use or modify the project's db.json or real Sandbox credentials.
  const directory = await mkdtemp(join(tmpdir(), "tmdt-checkout-test-"));
  let child;
  let closed;
  try {
    await writeFile(join(directory, "db.json"), JSON.stringify({
      users: [{ id: "test-user", role: "user" }],
      catenogies: [{ id: "test-product", name: "Test product", price: 100000 }],
      orders: [], paymentAttempts: [], cart: [], vouchers: [], userVouchers: [],
    }));
    child = spawn(process.execPath, [fileURLToPath(new URL("../server.mjs", import.meta.url))], {
      cwd: directory,
      windowsHide: true,
      env: {
        ...process.env,
        PORT: "0",
        VNP_TMN_CODE: "TESTCODE",
        VNP_HASH_SECRET: "TEST_SECRET",
        VNP_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        VNP_RETURN_URL: "http://127.0.0.1:3000/api/payments/vnpay/return",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    closed = new Promise(resolve => child.once("close", resolve));
    const baseUrl = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(new Error("Backend startup timed out")), 5000);
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.once("exit", () => { clearTimeout(timer); reject(new Error("Backend exited before startup")); });
      child.stdout.on("data", chunk => {
        output += chunk.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
    });
    const create = (path, body, authenticated = true) => fetch(baseUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authenticated ? { "x-user-id": "test-user" } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    for (const path of ["/api/orders/checkout", "/api/payments/vnpay/create", "/api/payments/momo/create"]) {
      const response = await create(path, {}, false);
      assert.equal(response.status, 401, "Route must exist and require a user, not return 404");
      await response.text();
    }
    const body = {
      requestId: "http_checkout_cod_test", checkoutMode: "buy_now", paymentMethod: "cod",
      items: [{ productId: "test-product", fromTable: "catenogies", quantity: 1 }],
      customer: { fullName: "Test User", phone: "0900000000", address: "Test address" },
    };
    const cod = await create("/api/orders/checkout", body);
    const codData = await cod.json();
    assert.equal(cod.status, 201, JSON.stringify(codData));
    assert.equal(codData.order.paymentStatus, "unpaid");
    const vnpayBody = { ...body, requestId: "http_checkout_vnpay_test", paymentMethod: "vnpay" };
    const vnpay = await create("/api/payments/vnpay/create", vnpayBody);
    const payment = await vnpay.json();
    assert.equal(vnpay.status, 201, JSON.stringify(payment));
    const url = new URL(payment.paymentUrl);
    assert.equal(url.hostname, "sandbox.vnpayment.vn");
    assert.equal(url.searchParams.get("vnp_ReturnUrl"), "http://127.0.0.1:3000/api/payments/vnpay/return");
    const duplicate = await create("/api/payments/vnpay/create", vnpayBody);
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).orderId, payment.orderId);
    const result = await fetch(`${baseUrl}/api/payments/result/${payment.lookupToken}`);
    assert.equal(result.status, 200);
    assert.equal((await result.json()).paymentStatus, "pending");
    const saved = JSON.parse(await readFile(join(directory, "db.json"), "utf8"));
    assert.equal(saved.orders.length, 2);
    assert.equal(saved.paymentAttempts.length, 1);
  } finally {
    if (child && child.exitCode === null) child.kill();
    if (closed) await closed;
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("tmdt-checkout-test-"));
    await rm(directory, { recursive: true, force: true });
  }
});
