/**
 * Script kiểm tra trạng thái sức khỏe các dịch vụ hệ thống
 * File: scripts/check_health.mjs
 */

const SERVICES = [
  {
    name: "Frontend React (Vite)",
    url: "http://localhost:5173",
    port: 5173,
    expectedStatus: [200, 304],
  },
  {
    name: "Backend API (Express & Mongo)",
    url: "http://127.0.0.1:3000",
    port: 3000,
    expectedStatus: [200],
  },
  {
    name: "AI RAG Service (FastAPI)",
    url: "http://127.0.0.1:8000/api/health",
    port: 8000,
    expectedStatus: [200],
  },
];

console.log("\n🏥 [Health Check] Đang kiểm tra kết nối các dịch vụ TMDT_DALN...\n");

async function checkService(service) {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(service.url, { signal: controller.signal });
    clearTimeout(timeout);
    const duration = Date.now() - startTime;

    if (service.expectedStatus.includes(res.status)) {
      return {
        name: service.name,
        port: service.port,
        status: "ONLINE",
        httpStatus: res.status,
        latency: `${duration}ms`,
        ok: true,
      };
    } else {
      return {
        name: service.name,
        port: service.port,
        status: "WARN",
        httpStatus: res.status,
        latency: `${duration}ms`,
        ok: false,
      };
    }
  } catch (err) {
    return {
      name: service.name,
      port: service.port,
      status: "OFFLINE",
      httpStatus: "-",
      latency: "timeout",
      ok: false,
      error: err.name === "AbortError" ? "Timeout (>3s)" : err.code || err.message,
    };
  }
}

async function run() {
  const results = await Promise.all(SERVICES.map(checkService));

  console.log("┌───────────────────────────────────┬──────┬─────────┬────────┬──────────┐");
  console.log("│ Dịch Vụ                           │ Cổng │ HTTP    │ Độ Trễ │ Tình Trạng│");
  console.log("├───────────────────────────────────┼──────┼─────────┼────────┼──────────┤");

  let allOnline = true;
  for (const r of results) {
    const statusIcon = r.status === "ONLINE" ? "✅ ONLINE " : "❌ OFFLINE";
    if (r.status !== "ONLINE") allOnline = false;

    const nameCol = r.name.padEnd(33, " ");
    const portCol = String(r.port).padEnd(4, " ");
    const httpCol = String(r.httpStatus).padEnd(7, " ");
    const latCol = r.latency.padEnd(6, " ");

    console.log(`│ ${nameCol} │ ${portCol} │ ${httpCol} │ ${latCol} │ ${statusIcon}│`);
  }
  console.log("└───────────────────────────────────┴──────┴─────────┴────────┴──────────┘");

  if (allOnline) {
    console.log("\n🎉 [TẤT CẢ ONLINE] Toàn bộ hệ thống 3 tầng đang hoạt động hoàn hảo!\n");
  } else {
    console.log("\n⚠️ [CHÚ Ý] Một số dịch vụ chưa khởi động. Bạn có thể chạy 'npm run dev:tabs' hoặc 'npm run dev' để bật lại.\n");
  }
}

run();
