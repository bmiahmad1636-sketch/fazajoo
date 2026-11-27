const digits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
export function normalizeAdminSearch(value) {
  return String(value ?? "").normalize("NFKC")
    .replace(/[۰-۹]/g, digit => String(digits.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
    .replace(/ي|ى/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\u200d]/g, " ")
    .trim().toLowerCase();
}
export function filterAdminAgents(rows, query) {
  const words = normalizeAdminSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return rows;
  return rows.filter(row => {
    const text = [row.agencyName, row.agentName, row.phone, row.agencyCity, row.agencyLicenseNumber].map(normalizeAdminSearch).join(" ");
    return words.every(word => text.includes(word));
  });
}
export function adminPage(rows, requestedPage, size=10) {
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const number = Math.min(totalPages, Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1));
  return { number, totalPages, rows: rows.slice((number-1)*size, number*size) };
}
export function adminCount(value, loading, failed) {
  return loading || failed ? "—" : value.toLocaleString("fa-IR");
}
