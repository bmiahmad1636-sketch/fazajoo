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
export const GARDEN_REQUEST_TERMS=[["short","کوتاه‌مدت / مقطعی"],["seasonal","فصلی"],["long","بلندمدت"]];
export const GARDEN_REQUEST_SHORT_UNITS=[["daily","روزانه"],["weekly","هفتگی"],["monthly","ماهانه"]];
export const GARDEN_REQUEST_FINANCIAL_MODES=[["rent_only","فقط اجاره"],["full_deposit","رهن کامل"],["deposit_rent","رهن و اجاره"]];
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
  rentalTerm:"", shortRateUnit:"daily", shortMaxBudgetRial:"", shortMaxSecurityHoldRial:"",
  seasonalMaxBudgetRial:"", seasonalMaxSecurityHoldRial:"",longFinancialMode:"deposit_rent",
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
    rentalTerm:GARDEN_REQUEST_TERMS.some(([id])=>id===input.rentalTerm)?input.rentalTerm:"",
    shortRateUnit:GARDEN_REQUEST_SHORT_UNITS.some(([id])=>id===input.shortRateUnit)?input.shortRateUnit:"daily",
    shortMaxBudgetRial:input.rentalTerm==="short"?gardenDigits(input.shortMaxBudgetRial):"",
    shortMaxSecurityHoldRial:input.rentalTerm==="short"?gardenDigits(input.shortMaxSecurityHoldRial):"",
    seasonalMaxBudgetRial:input.rentalTerm==="seasonal"?gardenDigits(input.seasonalMaxBudgetRial):"",
    seasonalMaxSecurityHoldRial:input.rentalTerm==="seasonal"?gardenDigits(input.seasonalMaxSecurityHoldRial):"",
    longFinancialMode:input.rentalTerm==="long"&&GARDEN_REQUEST_FINANCIAL_MODES.some(([id])=>id===input.longFinancialMode)?input.longFinancialMode:"",
    ...(input.rentalTerm==="short"||input.rentalTerm==="seasonal"?{maxBudget:"",maxDeposit:""}:input.rentalTerm==="long"?{maxBudget:input.longFinancialMode==="full_deposit"?"":gardenDigits(input.maxBudget),maxDeposit:input.longFinancialMode==="rent_only"?"":gardenDigits(input.maxDeposit)}:{}),
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
  if(GARDEN_REQUEST_TERMS.some(([id])=>id===d.rentalTerm)){
    if(d.rentalTerm==="short"){
      if(!GARDEN_REQUEST_SHORT_UNITS.some(([id])=>id===d.shortRateUnit))return "دوره محاسبه بودجه کوتاه‌مدت را مشخص کنید.";
      if(!number(d.shortMaxBudgetRial))return "حداکثر بودجه کوتاه‌مدت باغ را وارد کنید.";
    } else if(d.rentalTerm==="seasonal"){
      if(!number(d.seasonalMaxBudgetRial))return "حداکثر بودجه اجاره فصلی باغ را وارد کنید.";
    } else {
      if(!GARDEN_REQUEST_FINANCIAL_MODES.some(([id])=>id===d.longFinancialMode))return "شیوه مالی بلندمدت را مشخص کنید.";
      if(d.longFinancialMode!=="rent_only"&&!number(d.maxDeposit))return "حداکثر ودیعه / رهن باغ را وارد کنید.";
      if(d.longFinancialMode!=="full_deposit"&&!number(d.maxBudget))return "حداکثر اجاره ماهانه باغ را وارد کنید.";
    }
    for(const k of ["maxBudget","maxDeposit","shortMaxBudgetRial","shortMaxSecurityHoldRial","seasonalMaxBudgetRial","seasonalMaxSecurityHoldRial"]){
      if(gardenDigits(d[k]).length>15)return "مبلغ واردشده بیش از حد مجاز است.";
    }
    return String(d.requirements||"").length>240?"شرایط خاص حداکثر ۲۴۰ نویسه باشد.":"";
  }
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
export function gardenRequestBudgetRows(d={}){
 const n=(value)=>number(value)>0?`${pretty(value)} ریال`:"";
 if(d.rentalTerm==="short")return [...(n(d.shortMaxBudgetRial)?[{label:`حداکثر اجاره ${gardenRequestLabel(GARDEN_REQUEST_SHORT_UNITS,d.shortRateUnit)||"کوتاه‌مدت"}`,amount:n(d.shortMaxBudgetRial)}]:[]),...(n(d.shortMaxSecurityHoldRial)?[{label:"حداکثر ودیعه / ضمانت خسارت",amount:n(d.shortMaxSecurityHoldRial)}]:[])];
 if(d.rentalTerm==="seasonal")return [...(n(d.seasonalMaxBudgetRial)?[{label:"حداکثر اجاره هر فصل",amount:n(d.seasonalMaxBudgetRial)}]:[]),...(n(d.seasonalMaxSecurityHoldRial)?[{label:"حداکثر ضمانت خسارت",amount:n(d.seasonalMaxSecurityHoldRial)}]:[])];
 if(d.rentalTerm==="long")return [...(d.longFinancialMode!=="rent_only"&&n(d.maxDeposit)?[{label:d.longFinancialMode==="full_deposit"?"حداکثر رهن کامل":"حداکثر ودیعه",amount:n(d.maxDeposit)}]:[]),...(d.longFinancialMode!=="full_deposit"&&n(d.maxBudget)?[{label:"حداکثر اجاره ماهانه",amount:n(d.maxBudget)}]:[])];
 return [];
}
export function gardenWantedListingPrice(d={}){
 if(d.rentalTerm==="short")return {price:gardenDigits(d.shortMaxBudgetRial),priceType:d.shortRateUnit||"negotiable"};
 if(d.rentalTerm==="seasonal")return {price:"",priceType:"negotiable"};
 if(d.rentalTerm==="long")return {price:d.longFinancialMode==="full_deposit"?"":gardenDigits(d.maxBudget),priceType:d.longFinancialMode==="full_deposit"?"negotiable":"monthly"};
 return {price:d.pricePeriod==="negotiable"?"":gardenDigits(d.maxBudget),priceType:d.pricePeriod||"negotiable"};
}
export function gardenRequestBudgetText(d = {}) {
 const typed=gardenRequestBudgetRows(d);
 if(typed.length)return typed.map(row=>`${row.label} ${row.amount}`).join(" • ");
 if(GARDEN_REQUEST_TERMS.some(([id])=>id===d.rentalTerm))return "";
  if (d.pricePeriod === "negotiable") return "توافقی";
  if (!number(d.maxBudget)) return "";
  const period = gardenRequestLabel(GARDEN_REQUEST_PERIODS, d.pricePeriod) || "ماهانه";
  return [`اجاره تا ${pretty(d.maxBudget)} ریال / ${period}`,
    ...(number(d.maxDeposit) ? [`ودیعه تا ${pretty(d.maxDeposit)} ریال`] : [])].join(" • ");
}
