/**
 * Tiện ích xuất dữ liệu ra file CSV tương thích 100% Microsoft Excel tiếng Việt (UTF-8 BOM)
 */
export const exportToCsv = (filename, headers, rows) => {
  if (!rows || !rows.length) {
    throw new Error("Không có dữ liệu để xuất file!");
  }

  // Escape ô dữ liệu nếu có dấu phẩy hoặc xuống dòng
  const formatCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map((h) => formatCell(h.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => formatCell(typeof h.key === "function" ? h.key(row) : row[h.key])).join(",")
  );

  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const logAudit = async (actor, action, target, details = "") => {
  try {
    await fetch("http://localhost:3000/auditLogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: Date.now().toString(),
        actor: actor?.fullName || actor?.username || "Admin",
        role: actor?.role || "admin",
        action,
        target,
        details,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn("Không thể ghi audit log:", err.message);
  }
};
