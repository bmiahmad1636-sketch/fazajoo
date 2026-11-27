export const REPORT_PAGE_SIZE = 10;
export const REPORT_LIMIT = 300;
export const REPORT_STATUSES = [["", "همه گزارش‌ها"], ["new", "جدید"], ["reviewing", "در حال بررسی"], ["resolved", "رسیدگی‌شده"], ["dismissed", "ردشده"]];
export const REPORT_TARGETS = [["", "همه موضوع‌ها"], ["listing", "آگهی"], ["user", "کاربر"], ["chat", "گفتگو"]];
export function normalizeReportSearch(value) {
  return String(value ?? "").replace(/[۰-۹]/g, c => String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g, c => String(c.charCodeAt(0)-1632)).replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/\u200c/g," ").replace(/\s+/g," ").trim().toLowerCase();
}
export function filterReports(reports, target, search, reasons = {}) {
  const q = normalizeReportSearch(search);
  return reports.filter(r => (!target || r.target_type === target) && (!q || [r.id,r.target_id,r.reporter_name,r.reporter_phone,r.reported_name,r.reason,reasons[r.reason],r.details].some(v => normalizeReportSearch(v).includes(q))));
}
export function reportPage(rows, requestedPage) {
  const pages = Math.max(1, Math.ceil(rows.length / REPORT_PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1));
  return {page,pages,rows:rows.slice((page-1)*REPORT_PAGE_SIZE,page*REPORT_PAGE_SIZE)};
}
export function countReportStatuses(reports) {
  return reports.reduce((a,r) => { if (["new","reviewing","resolved","dismissed"].includes(r.status)) a[r.status]++; return a; }, {new:0,reviewing:0,resolved:0,dismissed:0});
}
