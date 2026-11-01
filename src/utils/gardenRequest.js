// Only wanted-garden preferences; no changes to offer-garden details or backend schema.
export const GARDEN_REQUEST_PURPOSES = [
  ["recreation", "تفریح و استراحت خانوادگی"],
  ["orchard", "باغداری و بهره‌برداری از درختان"],
  ["gardening", "باغچه و پرورش گل و گیاه"],
  ["event", "گردهمایی یا مراسم مجاز"],
  ["hobby", "استفاده شخصی و آخر هفته"],
  ["other", "سایر هدف‌ها"],
];
export const GARDEN_REQUEST_DURATIONS = [
  ["flexible", "توافقی / فرقی ندارد"], ["daily", "روزانه"],
  ["weekend", "آخر هفته"], ["monthly", "ماهانه"],
  ["seasonal", "فصلی"], ["yearly", "سالانه"],
];
export const GARDEN_REQUEST_PERIODS = [
  ["daily", "روزانه"], ["monthly", "ماهانه"],
  ["yearly", "سالانه"], ["negotiable", "توافقی"],
];
export const GARDEN_REQUEST_FEATURES = [
  ["water", "آب"], ["electricity", "برق"], ["fenced", "محصور"],
  ["building", "اتاقک / ساختمان"], ["parking", "پارکینگ"],
  ["restroom", "سرویس بهداشتی"], ["irrigation", "آبیاری"],
  ["gazebo", "آلاچیق"], ["barbecue", "باربیکیو"], ["pool", "استخر"],
];
export const GARDEN_REQUEST_WATER = [
  ["any", "فرقی ندارد"], ["well", "چاه"], ["right", "حقابه"],
  ["network", "آب شبکه"], ["available", "آب قابل استفاده"],
];
export const EMPTY_GARDEN_REQUEST = {
  purpose: "", otherPurpose: "", minArea: "", maxArea: "",
  duration: "flexible", pricePeriod: "monthly", maxBudget: "", maxDeposit: "",
  features: [], waterPreference: "any", treesNote: "", eventGuests: "",
  privacyRequired: false, requirements: "",
};
const MARK = /^\[FAZAJOO_GARDEN_REQUEST:([^\]\n]+)\]\n?/;
export function gardenDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
}
const number = (value) => Number(gardenDigits(value) || 0);
const pretty = (value) => number(value).toLocaleString("fa-IR");
export const gardenRequestLabel = (choices, key) => choices.find(([id]) => id === key)?.[1] || "";

export function readGardenRequest(description = "", legacyGarden = {}, legacyArea = 0, legacyPrice = "", legacyPriceType = "monthly") {
  const original = String(description || "");
  const match = original.match(MARK);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          data: { ...EMPTY_GARDEN_REQUEST, ...parsed, features: Array.isArray(parsed.features) ? parsed.features : [] },
          description: original.slice(match[0].length).trim(), hasMetadata: true,
        };
      }
    } catch { /* Keep original content intact if malformed. */ }
  }
  // Legacy wanted-garden ads used GardenFields intended for owners. Never
  // invent a purpose; recover only fields that actually existed.
  const area = number(legacyArea) ? gardenDigits(legacyArea) : "";
  const period = GARDEN_REQUEST_PERIODS.some(([id]) => id === legacyPriceType) ? legacyPriceType : "negotiable";
  return {
    data: { ...EMPTY_GARDEN_REQUEST, minArea: area, maxArea: area,
      pricePeriod: period, maxBudget: gardenDigits(legacyPrice),
      treesNote: String(legacyGarden?.trees || ""),
      waterPreference: "any",
      features: GARDEN_REQUEST_FEATURES.filter(([key]) => Boolean(legacyGarden?.[key])).map(([key]) => key),
    },
    description: original.trim(), hasMetadata: false,
  };
}

export function writeGardenRequest(input = {}, notes = "") {
  const data = { ...EMPTY_GARDEN_REQUEST, ...input,
    purpose: String(input.purpose || ""),
    otherPurpose: String(input.otherPurpose || "").trim().slice(0, 120),
    minArea: gardenDigits(input.minArea), maxArea: gardenDigits(input.maxArea),
    maxBudget: gardenDigits(input.maxBudget), maxDeposit: gardenDigits(input.maxDeposit),
    treesNote: String(input.treesNote || "").trim().slice(0, 100),
    eventGuests: gardenDigits(input.eventGuests),
    features: Array.isArray(input.features) ? input.features.filter(v => GARDEN_REQUEST_FEATURES.some(([id]) => id === v)) : [],
    requirements: String(input.requirements || "").trim().slice(0, 240),
  };
  const extra = String(notes || "").trim();
  return `[FAZAJOO_GARDEN_REQUEST:${encodeURIComponent(JSON.stringify(data))}]${extra ? `\n${extra}` : ""}`;
}

export function validateGardenRequest(d = {}) {
  if (!GARDEN_REQUEST_PURPOSES.some(([id]) => id === d.purpose)) return "هدف اصلی اجاره باغ را انتخاب کنید.";
  if (d.purpose === "other" && String(d.otherPurpose || "").trim().length < 15) return "برای سایر هدف‌ها حداقل ۱۵ نویسه توضیح بدهید.";
  const min = number(d.minArea), max = number(d.maxArea);
  if (!min && !max) return "حداقل یا حداکثر متراژ موردنیاز را وارد کنید.";
  if (min > 10000000 || max > 10000000 || (min && max && min > max)) return "بازه متراژ معتبر نیست.";
  if (!GARDEN_REQUEST_PERIODS.some(([id]) => id === d.pricePeriod)) return "دوره بودجه را انتخاب کنید.";
  if (d.pricePeriod !== "negotiable" && !number(d.maxBudget)) return "سقف بودجه اجاره را وارد کنید یا حالت توافقی را انتخاب کنید.";
  if (gardenDigits(d.maxBudget).length > 15 || gardenDigits(d.maxDeposit).length > 15) return "مبلغ واردشده بیش از حد مجاز است.";
  if (String(d.requirements || "").length > 240) return "شرایط خاص حداکثر ۲۴۰ نویسه باشد.";
  return "";
}

export function gardenRequestAreaText(d = {}) {
  const min = number(d.minArea), max = number(d.maxArea);
  if (min && max) return min === max ? `${pretty(min)} مترمربع` : `${pretty(min)} تا ${pretty(max)} مترمربع`;
  return min ? `از ${pretty(min)} مترمربع` : max ? `تا ${pretty(max)} مترمربع` : "";
}
export function gardenRequestBudgetText(d = {}) {
  if (d.pricePeriod === "negotiable") return "توافقی";
  if (!number(d.maxBudget)) return "";
  const period = gardenRequestLabel(GARDEN_REQUEST_PERIODS, d.pricePeriod) || "ماهانه";
  return [`اجاره تا ${pretty(d.maxBudget)} ریال / ${period}`,
    ...(number(d.maxDeposit) ? [`ودیعه تا ${pretty(d.maxDeposit)} ریال`] : [])].join(" • ");
}
