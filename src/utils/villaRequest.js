// Wanted-villa data is kept in description because the production backend
// intentionally accepts only the existing space columns.
export const VILLA_REQUEST_TYPES = [
  ["villa", "ویلا"], ["garden_villa", "باغ‌ویلا"], ["cottage", "کلبه"],
  ["rural", "اقامتگاه روستایی"], ["suite", "سوئیت تفریحی"], ["other", "سایر اقامتگاه‌ها"],
];
export const VILLA_REQUEST_STAYS = [
  ["daily", "روزانه / شبانه"], ["weekend", "آخر هفته"],
  ["weekly", "هفتگی"], ["monthly", "ماهانه"], ["flexible", "توافقی"],
];
export const VILLA_REQUEST_AMENITIES = [
  ["pool", "استخر"], ["heated_pool", "استخر آب‌گرم"], ["indoor_pool", "استخر سرپوشیده"],
  ["private_yard", "حیاط اختصاصی"], ["furnished", "مبله"],
  ["parking", "پارکینگ"], ["barbecue", "باربیکیو"], ["gazebo", "آلاچیق"],
  ["wifi", "اینترنت"], ["air_conditioning", "سرمایش"],
  ["heating", "گرمایش"], ["pet_friendly", "پذیرش حیوان خانگی"],
];
export const EMPTY_VILLA_REQUEST = {
  accommodationType: "villa", otherType: "", stayType: "daily", guests: "",
  minBedrooms: "", minArea: "", maxArea: "", pricePeriod: "daily", maxBudget: "",
  maxDeposit: "", amenities: [], privacyRequired: false, requirements: "",
};
const MARK = /^\[FAZAJOO_VILLA_REQUEST:([^\]\n]+)\]\n?/;
export const normalizeVillaDigits = (value) => String(value ?? "")
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
  .replace(/[٬,\s]/g, "");
const digits = (value) => normalizeVillaDigits(value).replace(/\D/g, "");
const formatNumber = (value) => Number(digits(value) || 0).toLocaleString("fa-IR");
export const villaRequestLabel = (options, key) => options.find(([id]) => id === key)?.[1] || "";

export function readVillaRequest(description = "", oldVilla = {}, oldPrice = "", oldPeriod = "daily", oldArea = 0) {
  const text = String(description || "");
  const match = text.match(MARK);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          data: { ...EMPTY_VILLA_REQUEST, ...parsed, amenities: Array.isArray(parsed.amenities) ? parsed.amenities : [] },
          description: text.slice(match[0].length).trim(), hasMetadata: true,
        };
      }
    } catch { /* Preserve original description on invalid metadata. */ }
  }
  // Existing wanted-villa ads did not store request metadata. Use only actual
  // legacy fields and keep their human-written notes intact on edit.
  const period = ["daily", "weekly", "monthly"].includes(oldPeriod) ? oldPeriod : "daily";
  return {
    data: { ...EMPTY_VILLA_REQUEST,
      guests: oldVilla?.capacity ? String(oldVilla.capacity) : "",
      minBedrooms: oldVilla?.bedrooms ? String(oldVilla.bedrooms) : "",
      minArea: Number(oldArea) > 0 ? String(oldArea) : "",
      maxArea: Number(oldArea) > 0 ? String(oldArea) : "",
      pricePeriod: period,
      stayType: period,
      maxBudget: digits(oldPrice),
      amenities: VILLA_REQUEST_AMENITIES.filter(([key]) => ({
        pool: oldVilla?.pool, heated_pool: oldVilla?.heatedPool,
        private_yard: oldVilla?.yard, furnished: oldVilla?.furnished,
        parking: oldVilla?.parking, barbecue: oldVilla?.barbecue,
        wifi: oldVilla?.wifi, pet_friendly: oldVilla?.petFriendly,
        air_conditioning: oldVilla?.airConditioning, heating: oldVilla?.heating,
      })[key]).map(([key]) => key),
    },
    description: text.trim(), hasMetadata: false,
  };
}

export function writeVillaRequest(data = {}, notes = "") {
  const safe = { ...EMPTY_VILLA_REQUEST, ...data,
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    guests: digits(data.guests), minBedrooms: digits(data.minBedrooms),
    minArea: digits(data.minArea), maxArea: digits(data.maxArea),
    maxBudget: digits(data.maxBudget), maxDeposit: digits(data.maxDeposit),
    otherType: String(data.otherType || "").trim().slice(0, 70),
    requirements: String(data.requirements || "").trim().slice(0, 240),
  };
  const tail = String(notes || "").trim();
  return `[FAZAJOO_VILLA_REQUEST:${encodeURIComponent(JSON.stringify(safe))}]${tail ? `\n${tail}` : ""}`;
}
export function validateVillaRequest(data = {}) {
  if (!VILLA_REQUEST_TYPES.some(([key]) => key === data.accommodationType)) return "نوع اقامتگاه را انتخاب کنید.";
  if (data.accommodationType === "other" && String(data.otherType || "").trim().length < 5) return "نوع اقامتگاه دیگر را حداقل در ۵ نویسه توضیح دهید.";
  if (!VILLA_REQUEST_STAYS.some(([key]) => key === data.stayType)) return "مدت اقامت موردنظر را مشخص کنید.";
  const guests = Number(digits(data.guests) || 0);
  if (guests < 1 || guests > 100) return "تعداد مهمان باید بین ۱ تا ۱۰۰ نفر باشد.";
  if (Number(digits(data.minBedrooms) || 0) > 30) return "تعداد اتاق معتبر نیست.";
  const min = Number(digits(data.minArea) || 0), max = Number(digits(data.maxArea) || 0);
  if ((min && max && min > max) || min > 1000000 || max > 1000000) return "محدوده متراژ معتبر نیست.";
  if (!["daily", "weekly", "monthly"].includes(data.pricePeriod)) return "دوره بودجه معتبر نیست.";
  if (!Number(digits(data.maxBudget))) return "سقف بودجه اقامت را وارد کنید.";
  if (digits(data.maxBudget).length > 15 || digits(data.maxDeposit).length > 15) return "مبلغ واردشده بیش از حد مجاز است.";
  if (String(data.requirements || "").length > 240) return "شرایط خاص حداکثر ۲۴۰ نویسه باشد.";
  return "";
}
export function villaRequestAreaText(data = {}) {
  const min = Number(digits(data.minArea) || 0), max = Number(digits(data.maxArea) || 0);
  if (min && max) return min === max ? `${formatNumber(min)} مترمربع` : `${formatNumber(min)} تا ${formatNumber(max)} مترمربع`;
  if (min) return `از ${formatNumber(min)} مترمربع`;
  if (max) return `تا ${formatNumber(max)} مترمربع`;
  return Number(digits(data.guests) || 0) ? `مناسب ${formatNumber(data.guests)} نفر` : "";
}
export function villaRequestBudgetText(data = {}) {
  const period = { daily: "شبانه", weekly: "هفتگی", monthly: "ماهانه" }[data.pricePeriod] || "شبانه";
  const budget = Number(digits(data.maxBudget) || 0);
  if (!budget) return "";
  const parts = [`تا ${formatNumber(data.maxBudget)} ریال / ${period}`];
  if (Number(digits(data.maxDeposit) || 0)) parts.push(`ودیعه تا ${formatNumber(data.maxDeposit)} ریال`);
  return parts.join(" • ");
}
