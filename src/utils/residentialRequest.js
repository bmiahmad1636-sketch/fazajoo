// Independent requirements for wanted residential ads; the existing residential_details
// backend schema is intentionally left unchanged. Structured requirements live in description.
export const RESIDENTIAL_REQUEST_TYPES = [
  ["apartment", "آپارتمان"], ["house", "خانه"], ["villa", "خانه ویلایی"],
  ["suite", "سوئیت"], ["penthouse", "پنت‌هاوس"], ["room", "اتاق"], ["other", "سایر مسکونی"],
];
export const RESIDENTIAL_REQUEST_FEATURES = [
  ["parking", "پارکینگ"], ["storage", "انباری"], ["elevator", "آسانسور"],
  ["balcony", "بالکن"], ["furnished", "مبله"], ["yard", "حیاط"],
  ["heating", "سیستم گرمایش"], ["cooling", "سیستم سرمایش"],
];
export const RESIDENTIAL_FLOOR_PREFERENCES = [
  ["any", "فرقی ندارد"], ["ground", "همکف"], ["low", "طبقات پایین"],
  ["upper", "طبقات بالاتر"], ["last", "طبقه آخر"],
];
export const EMPTY_RESIDENTIAL_REQUEST = {
  propertyType: "apartment", otherType: "", minArea: "", maxArea: "",
  minBedrooms: "", rentalTerm: "long", shortRateUnit: "night", shortMaxBudgetRial: "",
  paymentType: "both", deposit: "", monthlyRent: "",
  floorPreference: "any", features: [], requirements: "",
};
const MARK = /^\[FAZAJOO_RESIDENTIAL_REQUEST:([^\]\n]+)\]\n?/;
export const normalizeResidentialDigits = (v) => String(v ?? "")
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
  .replace(/[٬,\s]/g, "");
const digits = (v) => normalizeResidentialDigits(v).replace(/\D/g, "");
export function readResidentialRequest(description = "", residentialDetails = {}, area = 0) {
  const text = String(description || "");
  const match = text.match(MARK);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          data: {
            ...EMPTY_RESIDENTIAL_REQUEST, ...parsed,
            // Older structured requests had long-term-only finance, but no explicit term.
            rentalTerm: parsed.rentalTerm === "short" ? "short" : "long",
            features: Array.isArray(parsed.features) ? parsed.features : [],
          },
          description: text.slice(match[0].length).trim(),
          hasMetadata: true,
          termDeclared: ["short", "long"].includes(parsed.rentalTerm),
        };
      }
    } catch { /* Leave corrupted metadata untouched instead of silently erasing it. */ }
  }
  // An existing wanted residential ad has no structured metadata. Seed the
  // new editor from fields that the old form actually stored, without losing notes.
  const deposit = digits(residentialDetails?.deposit);
  const rent = digits(residentialDetails?.monthlyRent);
  const legacyFeatures = RESIDENTIAL_REQUEST_FEATURES
    .filter(([key]) => residentialDetails?.[key] === true)
    .map(([key]) => key);
  return {
    data: {
      ...EMPTY_RESIDENTIAL_REQUEST,
      propertyType: residentialDetails?.propertyType || "apartment",
      minArea: area && Number(area) > 0 ? String(area) : "",
      maxArea: area && Number(area) > 0 ? String(area) : "",
      minBedrooms: residentialDetails?.bedrooms ? String(residentialDetails.bedrooms) : "",
      paymentType: deposit && rent ? "both" : deposit ? "deposit" : rent ? "rent" : "both",
      deposit, monthlyRent: rent,
      features: legacyFeatures,
      requirements: "",
    },
    description: text,
    hasMetadata: false,
    termDeclared: false,
  };
}
export function writeResidentialRequest(data, legacyDescription = "") {
  const safe = {
    ...EMPTY_RESIDENTIAL_REQUEST, ...data,
    minArea: digits(data?.minArea), maxArea: digits(data?.maxArea),
    minBedrooms: digits(data?.minBedrooms),
    rentalTerm: data?.rentalTerm === "short" ? "short" : "long",
    shortRateUnit: ["night","week","month"].includes(data?.shortRateUnit) ? data.shortRateUnit : "night",
    shortMaxBudgetRial: data?.rentalTerm === "short" ? digits(data?.shortMaxBudgetRial) : "",
    deposit: data?.rentalTerm === "short" ? "" : digits(data?.deposit),
    monthlyRent: data?.rentalTerm === "short" ? "" : digits(data?.monthlyRent),
    features: Array.isArray(data?.features) ? data.features : [],
    requirements: String(data?.requirements || "").trim().slice(0, 200),
  };
  const existingNotes = String(legacyDescription || "").trim().slice(0, 800);
  return `[FAZAJOO_RESIDENTIAL_REQUEST:${encodeURIComponent(JSON.stringify(safe))}]${existingNotes ? `\n${existingNotes}` : ""}`;
}
export function validateResidentialRequest(data = {}) {
  if (!RESIDENTIAL_REQUEST_TYPES.some(([v]) => v === data.propertyType)) return "نوع فضای مسکونی موردنیاز را انتخاب کنید.";
  if (data.propertyType === "other" && String(data.otherType || "").trim().length < 5) return "برای «سایر مسکونی» حداقل ۵ نویسه توضیح بدهید.";
  const min = Number(digits(data.minArea) || 0);
  const max = Number(digits(data.maxArea) || 0);
  if (!min && !max) return "حداقل یا حداکثر متراژ موردنیاز را وارد کنید.";
  if ((min && max && min > max) || min > 1000000 || max > 1000000) return "بازه متراژ معتبر نیست.";
  if (Number(digits(data.minBedrooms) || 0) > 20) return "تعداد اتاق موردنیاز معتبر نیست.";
  if (String(data.requirements || "").length > 200) return "شرایط خاص حداکثر ۲۰۰ نویسه باشد.";
  if (!["short", "long"].includes(data.rentalTerm || "long")) return "مدت اجاره موردنظر را مشخص کنید.";
  if (data.rentalTerm === "short") {
    if (!["night", "week", "month"].includes(data.shortRateUnit)) return "دوره بودجه کوتاه‌مدت را مشخص کنید.";
    if (!Number(digits(data.shortMaxBudgetRial))) return "سقف بودجه کوتاه‌مدت را وارد کنید.";
    return "";
  }
  if (!["deposit", "rent", "both"].includes(data.paymentType)) return "نوع بودجه را مشخص کنید.";
  if (["deposit", "both"].includes(data.paymentType) && !Number(digits(data.deposit))) return "سقف پول پیش را وارد کنید.";
  if (["rent", "both"].includes(data.paymentType) && !Number(digits(data.monthlyRent))) return "سقف اجاره ماهانه را وارد کنید.";
  return "";
}
export const residentialRequestLabel = (options, key) => options.find(([v]) => v === key)?.[1] || "";
const moneyText = (value) => Number(digits(value) || 0).toLocaleString("fa-IR");
export function residentialRequestAreaText(d = {}) {
  const min = Number(digits(d.minArea) || 0);
  const max = Number(digits(d.maxArea) || 0);
  if (min && max) return min === max ? `${moneyText(min)} مترمربع` : `${moneyText(min)} تا ${moneyText(max)} مترمربع`;
  if (min) return `از ${moneyText(min)} مترمربع`;
  if (max) return `تا ${moneyText(max)} مترمربع`;
  return "";
}
export function residentialRequestBudgetText(d = {}) {
  if (d.rentalTerm === "short") {
    const rate = Number(digits(d.shortMaxBudgetRial));
    const unit = {night:"شب",week:"هفته",month:"ماه (اقامت موقت)"}[d.shortRateUnit];
    return rate && unit ? `بودجه تا ${moneyText(rate)} ریال / ${unit}` : "بودجه کوتاه‌مدت اعلام نشده";
  }
  const items = [];
  if (["deposit", "both"].includes(d.paymentType) && Number(digits(d.deposit)) > 0)
    items.push(`پول پیش تا ${moneyText(d.deposit)} ریال`);
  if (["rent", "both"].includes(d.paymentType) && Number(digits(d.monthlyRent)) > 0)
    items.push(`اجاره تا ${moneyText(d.monthlyRent)} ریال / ماه`);
  return items.join(" • ");
}
// The backend validates residential_details amounts and whitelists its keys.
// Keep this compatibility payload distinct from the request-only metadata.
export function residentialRequestLegacyDetails(d = {}) {
  const accepted = ["apartment", "house", "villa", "suite", "penthouse", "other"];
  return {
    propertyType: accepted.includes(d.propertyType) ? d.propertyType : "other",
    deposit: d.rentalTerm === "short" ? "" : ["deposit", "both"].includes(d.paymentType) ? digits(d.deposit) : "",
    monthlyRent: d.rentalTerm === "short" ? "" : (["rent", "both"].includes(d.paymentType) ? digits(d.monthlyRent) : ""),
    bedrooms: digits(d.minBedrooms),
  };
}
