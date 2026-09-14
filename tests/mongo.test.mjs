import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test("MongoDB backend server starts and serves REST CRUD endpoints", { timeout: 15000 }, async () => {
  const PORT = "3095";
  const child = spawn(process.execPath, ["server_mongodb.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const closed = new Promise((resolve) => child.once("close", resolve));

  try {
    const baseUrl = `http://127.0.0.1:${PORT}`;

    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("MongoDB server startup timed out")), 8000);
      child.stdout.on("data", (chunk) => {
        if (chunk.toString().includes(PORT)) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.stderr.on("data", (chunk) => console.error(chunk.toString()));
    });

    // 1. db-status
    const statusRes = await fetch(`${baseUrl}/api/db-status`);
    assert.equal(statusRes.status, 200);
    const status = await statusRes.json();
    assert.equal(status.status, "connected");
    assert.ok(status.collections.length > 0);

    // 2. _limit alone works
    const limitRes = await fetch(`${baseUrl}/products?_limit=2`);
    assert.equal(limitRes.status, 200);
    const limited = await limitRes.json();
    assert.equal(limited.length, 2);

    // 3. Detail by ID
    const detailRes = await fetch(`${baseUrl}/products/1`);
    assert.equal(detailRes.status, 200);
    const product = await detailRes.json();
    assert.equal(String(product.id), "1");

    // 4. POST, PATCH, DELETE
    const postRes = await fetch(`${baseUrl}/_smoke_test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Ponytail Smoke", val: 1 }),
    });
    assert.equal(postRes.status, 201);
    const created = await postRes.json();
    assert.ok(created.id);

    const patchRes = await fetch(`${baseUrl}/_smoke_test/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ val: 2 }),
    });
    assert.equal(patchRes.status, 200);
    const patched = await patchRes.json();
    assert.equal(patched.val, 2);

    const delRes = await fetch(`${baseUrl}/_smoke_test/${created.id}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);

    // 5. Protected resources check (orders cannot be accessed directly via raw CRUD)
    const directOrder = await fetch(`${baseUrl}/orders`);
    assert.equal(directOrder.status, 403);

    // 6. Checkout API authentication requirement
    const checkoutRes = await fetch(`${baseUrl}/api/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(checkoutRes.status, 401);
  } finally {
    child.kill();
    await closed;
  }
});
