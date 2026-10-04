/**
 * Script rà soát toàn bộ nút bấm và hành động trong thư mục src/
 * File: scripts/audit_buttons.mjs
 */

import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve("src");

function getFiles(dir, exts = [".jsx", ".js"]) {
  let files = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getFiles(fullPath, exts));
    } else if (exts.includes(path.extname(item.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = getFiles(SRC_DIR);

const report = {
  totalButtonsFound: 0,
  buttonsWithEndpoints: [],
  buttonsWithNavigation: [],
  buttonsWithStateAction: [],
  deadButtons: [], // Không có handler hoặc handler rỗng
  dummyLinks: [],  // href="#" hoặc to="#"
};

const DUMMY_LINK_REGEX = /<(?:a|Link)[^>]+(?:href|to)\s*=\s*["'](?:#|javascript:void\(0\)|)["']/g;
const BUTTON_REGEX = /<button[^>]*>([\s\S]*?)<\/button>/gi;
const BTN_SELF_REGEX = /<button[^>]*\/>/gi;

for (const file of allFiles) {
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");

  // 1. Kiểm tra dummy links (to="#" hoặc href="#")
  let match;
  while ((match = DUMMY_LINK_REGEX.exec(content)) !== null) {
    const line = content.substring(0, match.index).split("\n").length;
    report.dummyLinks.push({
      file: relPath,
      line,
      snippet: match[0].substring(0, 80).replace(/\n/g, " "),
    });
  }

  // 2. Tìm tất cả các thẻ button
  const buttonTags = [...content.matchAll(/<button([\s\S]*?)>/gi)];

  for (const btnMatch of buttonTags) {
    report.totalButtonsFound++;
    const fullTag = btnMatch[0];
    const attrs = btnMatch[1];
    const index = btnMatch.index;
    const line = content.substring(0, index).split("\n").length;

    const hasOnClick = /onClick\s*=/i.test(attrs);
    const isSubmit = /type\s*=\s*["']submit["']/i.test(attrs);
    const isDisabled = /disabled/i.test(attrs);

    // Kiểm tra nội dung text bên trong button nếu có
    const textSnippet = fullTag.substring(0, 100).replace(/\s+/g, " ");

    if (!hasOnClick && !isSubmit) {
      report.deadButtons.push({
        file: relPath,
        line,
        reason: "Không có onClick và không phải type='submit'",
        snippet: textSnippet,
      });
      continue;
    }

    // Kiểm tra onClick handler có rỗng hoặc placeholder không
    if (hasOnClick) {
      const onClickValMatch = attrs.match(/onClick\s*=\s*\{([^}]+)\}/i);
      const handlerText = onClickValMatch ? onClickValMatch[1].trim() : "";

      if (
        handlerText === "() => {}" ||
        handlerText === "()=>{}" ||
        handlerText.includes("alert(") ||
        handlerText.includes("console.log(") && handlerText.split(";").length === 1
      ) {
        report.deadButtons.push({
          file: relPath,
          line,
          reason: `Handler rỗng hoặc chỉ alert: onClick={${handlerText}}`,
          snippet: textSnippet,
        });
      }
    }
  }
}

// In báo cáo
console.log("\n=======================================================");
console.log("   📊 BÁO CÁO RÀ SOÁT NÚT BẤM & ENDPOINT (SRC/)");
console.log("=======================================================\n");

console.log(`- Tổng số file JSX/JS quét: ${allFiles.length}`);
console.log(`- Tổng số thẻ <button> phát hiện: ${report.totalButtonsFound}`);
console.log(`- Số nút bấm nghi ngờ chưa có endpoint/hành động (Dead Buttons): ${report.deadButtons.length}`);
console.log(`- Số liên kết rỗng (href/to="#"): ${report.dummyLinks.length}\n`);

if (report.deadButtons.length > 0) {
  console.log("⚠️ DANH SÁCH CÁC NÚT BẤM THIẾU HOẶC RỖNG HÀNH ĐỘNG (DEAD BUTTONS):");
  report.deadButtons.forEach((b, i) => {
    console.log(`  ${i + 1}. [${b.file}:${b.line}] - ${b.reason}`);
    console.log(`     Tag: ${b.snippet}`);
  });
  console.log("");
}

if (report.dummyLinks.length > 0) {
  console.log("⚠️ DANH SÁCH LIÊN KẾT RỖNG (to='#' hoặc href='#'):");
  report.dummyLinks.forEach((l, i) => {
    console.log(`  ${i + 1}. [${l.file}:${l.line}] Link rỗng: ${l.snippet}`);
  });
  console.log("");
}
