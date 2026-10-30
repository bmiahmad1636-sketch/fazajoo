// Backward-compatible metadata in the existing description column.
// No database migration; old requests remain readable.
export const PARKING_USE_OPTIONS = [
  { value: "car", label: "پارک خودرو" },
  { value: "motorcycle", label: "پارک موتورسیکلت" },
  { value: "other", label: "سایر کاربری‌ها" },
];
const PREFIX = "[کاربری پارکینگ: ";
const HEADER = /^\[کاربری پارکینگ: (خودرو|موتورسیکلت|سایر)(?: - ([^\]\n]*))?\]\n?/;
export function readParkingRequestUsage(description = "") {
  const text = String(description || "");
  const match = text.match(HEADER);
  if (!match) return { usage: "", otherUsage: "", description: text };
  const usage = match[1] === "خودرو" ? "car" : match[1] === "موتورسیکلت" ? "motorcycle" : "other";
  return { usage, otherUsage: usage === "other" ? (match[2] || "") : "", description: text.slice(match[0].length) };
}
export function writeParkingRequestUsage(description, usage, otherUsage) {
  const clean = readParkingRequestUsage(description).description.trim();
  const label = usage === "car" ? "خودرو" : usage === "motorcycle" ? "موتورسیکلت" : "سایر";
  const detail = usage === "other" ? ` - ${String(otherUsage || "").replace(/[\]\n\r]/g, " ").trim()}` : "";
  return `${PREFIX}${label}${detail}]\n${clean}`;
}
export function parkingUsageLabel(usage, otherUsage) {
  if (usage === "car") return "پارک خودرو";
  if (usage === "motorcycle") return "پارک موتورسیکلت";
  if (usage === "other") return otherUsage ? `سایر: ${otherUsage}` : "سایر کاربری‌ها";
  return "مشخص نشده";
}
