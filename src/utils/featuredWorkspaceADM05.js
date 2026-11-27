function normalized(value) {
  return String(value ?? "").replace(/[۰-۹]/g, c => String(c.charCodeAt(0)-0x6f0))
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0)-0x660)).replace(/ي/g,"ی").replace(/ك/g,"ک").trim().toLowerCase();
}
export function filterBookings(rows, status, search) {
  const term = normalized(search);
  return rows.filter(row => (status === "all" || row.status === status) &&
    (!term || [row.title,row.city,row.spaceId].some(value=>normalized(value).includes(term))));
}
export function bookingPage(rows, requestedPage) {
  const pages = Math.max(1, Math.ceil(rows.length/10));
  const page = Math.min(pages, Math.max(1, Number.isInteger(requestedPage)?requestedPage:1));
  return {pages,page,items:rows.slice((page-1)*10,page*10)};
}
export function exactRialTotal(value) {
  const raw=String(value ?? "");
  if (!/^\d+$/.test(raw)) return "—";
  return `${raw.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ریال`;
}
