/** Minimal, dependency-free CSV serialization + browser download. */

export type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvValue[][]) {
  return [headers, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

export function csvFilename(prefix: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `marginmap-${prefix}-${stamp}.csv`;
}

/** Client-side blob download. No server round-trip. */
export function downloadCsv(prefix: string, headers: string[], rows: CsvValue[][]) {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\uFEFF" + toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvFilename(prefix);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
