// Warehouse request metadata kept in description for backward-compatible storage.
export const EMPTY_WAREHOUSE_REQUEST = {
  purpose: "", otherPurpose: "", spaceType: "any", minArea: "", maxArea: "",
  access: "any", duration: "", features: [], requirements: "",
};
export const WAREHOUSE_PURPOSES = [
  ["personal", "وسایل شخصی و اثاثیه"], ["commercial", "کالا و محصولات تجاری"],
  ["food", "مواد غذایی (غیرفاسدشدنی)"], ["equipment", "تجهیزات و ابزار"], ["other", "سایر"],
];
export const WAREHOUSE_TYPES = [["any", "فرقی ندارد"], ["indoor", "سرپوشیده"], ["container", "کانتینر / کانکس"], ["outdoor", "فضای باز"]];
export const WAREHOUSE_ACCESS = [["any", "توافقی / فرقی ندارد"], ["24h", "۲۴ ساعته"], ["office", "ساعات اداری"]];
export const WAREHOUSE_DURATIONS = [["", "مشخص نیست"], ["short", "کوتاه‌مدت"], ["months", "چندماهه"], ["long", "بلندمدت"]];
export const WAREHOUSE_FEATURES = [["security", "دوربین / امنیت"], ["guard", "نگهبانی"], ["power", "برق"], ["water", "آب"], ["truck", "ورود وانت / کامیون"], ["loading", "بارگیری آسان"], ["dry", "محیط خشک"], ["temperature", "کنترل دما"], ["ground", "همکف / بالابر بار"]];
const HEADER = /^\[FAZAJOO_WAREHOUSE_REQUEST:([^\]\n]+)\]\n?/;
export function readWarehouseRequest(description = "") {
  const text = String(description || ""); const match = text.match(HEADER);
  if (!match) return { data: { ...EMPTY_WAREHOUSE_REQUEST, features: [] }, description: text };
  try {
    const raw = JSON.parse(decodeURIComponent(match[1]));
    return { data: { ...EMPTY_WAREHOUSE_REQUEST, ...raw, features: Array.isArray(raw.features) ? raw.features : [] }, description: text.slice(match[0].length) };
  } catch { return { data: { ...EMPTY_WAREHOUSE_REQUEST, features: [] }, description: text }; }
}
export function writeWarehouseRequest(description, data) {
  const clean = readWarehouseRequest(description).description.trim();
  const safe = { ...EMPTY_WAREHOUSE_REQUEST, ...data, features: Array.isArray(data.features) ? data.features : [] };
  return `[FAZAJOO_WAREHOUSE_REQUEST:${encodeURIComponent(JSON.stringify(safe))}]\n${clean}`;
}
export function warehouseOptionLabel(options, value) { return options.find(([key]) => key === value)?.[1] || "مشخص نشده"; }
export function warehouseRequestValidation(data) {
  if (!data.purpose) return "کاربری انبار موردنیاز را انتخاب کنید.";
  if (data.purpose === "other" && String(data.otherPurpose || "").trim().length < 5) return "کاربری سایر را حداقل در ۵ حرف توضیح دهید.";
  const min = data.minArea === "" ? null : Number(data.minArea);
  const max = data.maxArea === "" ? null : Number(data.maxArea);
  if ((min !== null && (!Number.isFinite(min) || min <= 0)) || (max !== null && (!Number.isFinite(max) || max <= 0))) return "متراژ باید عددی بزرگ‌تر از صفر باشد.";
  if (min !== null && max !== null && min > max) return "حداقل متراژ نمی‌تواند از حداکثر بیشتر باشد.";
  return "";
}
