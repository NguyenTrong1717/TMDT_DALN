/**
 * Multi-Window Dev Launcher
 * File: scripts/dev_tabs.mjs
 * Khởi động 3 dịch vụ trên 3 cửa sổ console độc lập không bao giờ bị lỗi batch escape.
 */

import { spawn } from "child_process";

console.log("\n====================================================");
console.log("   🚀 HCORE STORE - MULTI-WINDOW DEV RUNNER");
console.log("====================================================\n");

const services = [
  {
    title: "HCore Frontend (:5173)",
    cmd: "npm run dev:vite",
  },
  {
    title: "HCore Backend (:3000)",
    cmd: "npm run server",
  },
  {
    title: "HCore AI RAG (:8000)",
    cmd: "npm run rag",
  },
];

for (const s of services) {
  console.log(`  ▶ Đang mở cửa sổ: [${s.title}] ...`);
  // Lệnh start trên Windows: start "Window Title" cmd /k "command"
  spawn("cmd.exe", ["/c", "start", s.title, "cmd.exe", "/k", s.cmd], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  }).unref();
}

console.log("\n✅ Đã mở 3 cửa sổ console độc lập!");
console.log("   - Frontend  : http://localhost:5173");
console.log("   - Backend   : http://127.0.0.1:3000");
console.log("   - AI RAG    : http://127.0.0.1:8000/api/health\n");
console.log("Kiểm tra sức khỏe bất kỳ lúc nào: npm run check:health\n");
