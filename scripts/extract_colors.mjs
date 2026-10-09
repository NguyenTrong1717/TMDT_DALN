import { spawn } from "child_process";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = "C:\\Users\\admin\\AppData\\Local\\Temp\\chrome_color_profile";

const USER_CODE = `
(() => {
  const toHex = c => '#' + c.match(/\\d+/g).slice(0,3)
    .map(n => (+n).toString(16).padStart(2,'0')).join('').toUpperCase();
  const count = {};
  document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    [['bg','backgroundColor'],['text','color'],['border','borderTopColor']].forEach(([k,p]) => {
      const c = s[p];
      if (!c || c.startsWith('rgba(0, 0, 0, 0)')) return;
      const key = k + ' ' + toHex(c);
      count[key] = (count[key] || 0) + 1;
    });
  });
  return Object.entries(count).sort((a,b)=>b[1]-a[1]).slice(0,25)
    .map(([k,v]) => ({ vai_tro: k.split(' ')[0], mau: k.split(' ')[1], so_phan_tu: v }));
})()
`;

async function run() {
  console.log("🚀 Đang khởi động Chrome headless qua remote debugging port 9222...");
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--disable-translate",
  ]);

  // Đợi Chrome mở port
  await new Promise((r) => setTimeout(r, 2000));

  const urls = [
    { name: "CellphoneS (cellphones.com.vn)", url: "https://cellphones.com.vn" },
    { name: "Hoàng Hà Mobile (hoanghamobile.com)", url: "https://hoanghamobile.com" },
  ];

  for (const target of urls) {
    try {
      console.log(`\n======================================================`);
      console.log(`🔍 Đang tải và phân tích màu trên: ${target.name}`);
      console.log(`======================================================`);

      const newPageRes = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(target.url)}`, { method: "PUT" });
      const pageData = await newPageRes.json();
      const wsUrl = pageData.webSocketDebuggerUrl;

      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => {
        ws.onopen = resolve;
      });

      // Bật Page và Runtime
      ws.send(JSON.stringify({ id: 1, method: "Page.enable" }));
      ws.send(JSON.stringify({ id: 2, method: "Runtime.enable" }));

      // Đợi 5 giây để trang tải xong DOM và render CSS đầy đủ
      console.log("⏳ Chờ trang hoàn tất render DOM (5s)...");
      await new Promise((r) => setTimeout(r, 5500));

      // Thực thi đoạn script lấy màu của người dùng
      const evalPromise = new Promise((resolve, reject) => {
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 10) {
            if (msg.result?.result?.value) {
              resolve(msg.result.result.value);
            } else if (msg.result?.exceptionDetails) {
              reject(msg.result.exceptionDetails);
            }
          }
        };
      });

      ws.send(JSON.stringify({
        id: 10,
        method: "Runtime.evaluate",
        params: {
          expression: USER_CODE,
          returnByValue: true,
          awaitPromise: true,
        },
      }));

      const results = await evalPromise;
      console.log(`\n📊 BẢNG 25 MÀU PHỔ BIẾN NHẤT TẠI: ${target.name}`);
      console.table(results);

      // Đóng tab
      ws.close();
      await fetch(`http://127.0.0.1:9222/json/close/${pageData.id}`, { method: "POST" });
    } catch (err) {
      console.error(`❌ Lỗi khi phân tích ${target.name}:`, err);
    }
  }

  // Tắt Chrome
  chrome.kill();
  console.log("\n✅ Hoàn tất trích xuất mã màu!");
  process.exit(0);
}

run();
