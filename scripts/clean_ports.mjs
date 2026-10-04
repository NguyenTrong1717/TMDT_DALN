/**
 * Script dọn dẹp các cổng bị kẹt ngầm (Zombie Processes)
 * File: scripts/clean_ports.mjs
 */

import { execSync } from "child_process";

const TARGET_PORTS = [3000, 5173, 8000];
const currentPid = process.pid;

console.log("\n🧹 [Clean Ports] Đang quét các cổng:", TARGET_PORTS.join(", "), "...\n");

let killedCount = 0;

for (const port of TARGET_PORTS) {
  try {
    // Tìm các dòng LISTENING trên Windows
    const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const lines = netstatOutput.trim().split("\n");

    const pidsToKill = new Set();
    for (const line of lines) {
      if (line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (pid && pid !== currentPid) {
          pidsToKill.add(pid);
        }
      }
    }

    if (pidsToKill.size > 0) {
      for (const pid of pidsToKill) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: ["ignore", "pipe", "ignore"] });
          console.log(`  ✅ Đã giải phóng Cổng [${port}] (Đã dừng tiến trình PID: ${pid})`);
          killedCount++;
        } catch {
          console.warn(`  ⚠️ Không thể dừng tiến trình PID: ${pid} trên cổng ${port}`);
        }
      }
    } else {
      console.log(`  ✨ Cổng [${port}]: Đang rảnh (Không có tiến trình kẹt)`);
    }
  } catch {
    // Không tìm thấy tiến trình nào chiếm cổng
    console.log(`  ✨ Cổng [${port}]: Đang rảnh`);
  }
}

console.log(`\n🎉 [Clean Ports] Hoàn tất! Đã giải phóng ${killedCount} tiến trình kẹt. Bạn có thể khởi động lại dev mượt mà.\n`);
