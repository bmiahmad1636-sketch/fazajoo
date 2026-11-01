// Independent preferences for wanted "other" spaces. Offers keep their existing fields.
export const OTHER_REQUEST_PERIODS = [
  ["negotiable", "توافقی / هنوز مشخص نیست"],
  ["daily", "روزانه"], ["weekly", "هفتگی"],
  ["monthly", "ماهانه"], ["yearly", "سالانه"],
];
export const OTHER_REQUEST_DURATIONS = [
  ["flexible", "فرقی ندارد / توافقی"], ["short", "چند ساعت یا یک روز"],
  ["days", "چند روز"], ["months", "چند ماه"], ["long", "بلندمدت"],
];
export const OTHER_REQUEST_FEATURES = [
  ["covered", "فضای سرپوشیده"], ["open", "فضای روباز"],
  ["water", "آب"], ["electricity", "برق"],
  ["restroom", "سرویس بهداشتی"], ["parking", "پارکینگ"],
  ["loading", "دسترسی بارگیری"], ["private", "حریم خصوصی"],
];
export const EMPTY_OTHER_REQUEST = {
  requestText: "", minArea: "", maxArea: "", pricePeriod: "negotiable",
  maxBudget: "", duration: "flexible", features: [], requirements: "",
};
const MARK = /^\[FAZAJOO_OTHER_WANTED:([^\]\n]+)\]\n?/;
export function otherDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
}
const num = (value) => Number(otherDigits(value) || 0);
const pretty = (value) => num(value).toLocaleString("fa-IR");
export const otherRequestLabel = (items, value) => items.find(([key]) => key === value)?.[1] || "";

export function readOtherRequest(description = "", legacyArea = 0, legacyPrice = "", legacyPeriod = "negotiable") {
  const original = String(description || "");
  const match = original.match(MARK);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          data: { ...EMPTY_OTHER_REQUEST, ...parsed,
            features: Array.isArray(parsed.features) ? parsed.features : [] },
          description: original.slice(match[0].length).trim(), hasMetadata: true,
        };
      }
    } catch { /* Never hide invalid legacy text. */ }
  }
  // Older wanted "other" ads contained only a plain description.
  // Reuse their actual text; do not invent missing requirements.
  return {
    data: { ...EMPTY_OTHER_REQUEST, requestText: original.trim(),
      minArea: num(legacyArea) ? otherDigits(legacyArea) : "",
      pricePeriod: OTHER_REQUEST_PERIODS.some(([key]) => key === legacyPeriod) ? legacyPeriod : "negotiable",
      maxBudget: otherDigits(legacyPrice) },
    description: "", hasMetadata: false,
  };
}
export function writeOtherRequest(input = {}, trailingNotes = "") {
  const d = { ...EMPTY_OTHER_REQUEST, ...input,
    requestText: String(input.requestText || "").trim().slice(0, 700),
    minArea: otherDigits(input.minArea), maxArea: otherDigits(input.maxArea),
    maxBudget: input.pricePeriod === "negotiable" ? "" : otherDigits(input.maxBudget),
    duration: OTHER_REQUEST_DURATIONS.some(([key]) => key === input.duration) ? input.duration : "flexible",
    features: Array.isArray(input.features) ? OTHER_REQUEST_FEATURES.filter(([key]) => input.features.includes(key)).map(([key]) => key) : [],
    requirements: String(input.requirements || "").trim().slice(0, 300),
  };
  const extra = String(trailingNotes || "").trim();
  return `[FAZAJOO_OTHER_WANTED:${encodeURIComponent(JSON.stringify(d))}]${extra ? `\n${extra}` : ""}`;
}
export function validateOtherRequest(d = {}) {
  const text = String(d.requestText || "").trim();
  if (text.length < 20) return "نیازت را با حداقل ۲۰ نویسه توضیح بده تا دقیق مشخص شود چه فضایی می‌خواهی.";
  if (text.length > 700) return "توضیح نیاز حداکثر ۷۰۰ نویسه باشد.";
  const min = num(d.minArea), max = num(d.maxArea);
  if (min > 10000000 || max > 10000000 || (min && max && min > max)) return "محدوده متراژ معتبر نیست.";
  if (!OTHER_REQUEST_PERIODS.some(([key]) => key === d.pricePeriod)) return "دوره بودجه را انتخاب کن.";
  if (d.pricePeriod !== "negotiable" && !num(d.maxBudget)) return "سقف بودجه را وارد کن یا حالت توافقی را انتخاب کن.";
  if (otherDigits(d.maxBudget).length > 15) return "مبلغ بودجه بیش از حد مجاز است.";
  if (String(d.requirements || "").length > 300) return "شرایط تکمیلی حداکثر ۳۰۰ نویسه باشد.";
  // Backend stores at most 5000 characters in description. Persian characters
  // expand under URI encoding: never publish truncated, unreadable metadata.
  if (writeOtherRequest(d).length > 4900) return "مجموع توضیحات درخواست طولانی است؛ لطفاً متن یا شرایط تکمیلی را کمی کوتاه‌تر کن.";
  return "";
}
export function otherRequestAreaText(d = {}) {
  const min = num(d.minArea), max = num(d.maxArea);
  if (min && max) return min === max ? `${pretty(min)} مترمربع` : `${pretty(min)} تا ${pretty(max)} مترمربع`;
  return min ? `از ${pretty(min)} مترمربع` : max ? `تا ${pretty(max)} مترمربع` : "";
}
export function otherRequestBudgetText(d = {}) {
  if (d.pricePeriod === "negotiable") return "توافقی";
  return num(d.maxBudget)
    ? `اجاره تا ${pretty(d.maxBudget)} ریال / ${otherRequestLabel(OTHER_REQUEST_PERIODS, d.pricePeriod) || "ماهانه"}`
    : "";
}
