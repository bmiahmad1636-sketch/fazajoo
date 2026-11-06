/** Professional residential *supply* — distinct from demand and recreational villa. */
export const RESIDENTIAL_OFFER_TYPES = [
  ["apartment", "آپارتمان"], ["house", "خانه"], ["villa", "خانه ویلایی"],
  ["suite", "سوئیت"], ["penthouse", "پنت‌هاوس"], ["room", "اتاق"], ["other", "سایر مسکونی"],
];
export const RESIDENTIAL_FINANCIAL_MODES = [
  ["deposit_rent", "رهن و اجاره"], ["full_deposit", "رهن کامل"], ["rent_only", "فقط اجاره"],
];
export const RESIDENTIAL_OFFER_DEFAULT = Object.freeze({
  rentalTerm: "long", canNegotiateOtherTerm: false,
  shortRateUnit: "night", shortRateRial: "", securityHoldRial: "",
  financialMode: "", otherType: "", features: [],
});
export const RESIDENTIAL_SHORT_RATE_UNITS = [["night", "شبانه"], ["week", "هفتگی"], ["month", "ماهانه (اقامت موقت)"]];
export const residentialTermLabel = (term) => term === "short" ? "کوتاه‌مدت" : term === "long" ? "بلندمدت" : "مدت نامشخص";
const has = (values, key) => values.some(([id]) => id === key);
const digits = (value) => String(value ?? "")
  .replace(/[۰-۹]/g, (v) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(v)))
  .replace(/[٠-٩]/g, (v) => String("٠١٢٣٤٥٦٧٨٩".indexOf(v)))
  .replace(/[٬,\s]/g, "").replace(/\D/g, "");
export const residentialMoneyDigits = digits;
export const residentialMoneyDisplay = (value) => digits(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const amount = (value) => {
  const raw = String(value ?? "")
    .replace(/[۰-۹]/g, (v) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(v)))
    .replace(/[٠-٩]/g, (v) => String("٠١٢٣٤٥٦٧٨٩".indexOf(v)))
    .replace(/[٬,\s]/g, "");
  if (!/^\d{1,15}$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
const hasTyped = (a) => a?.schemaVersion === 1 && a.category === "residential" &&
  a.values && typeof a.values === "object" && !Array.isArray(a.values);
export function residentialOfferFromAttributes(attributes, details = {}) {
  const v = hasTyped(attributes) ? attributes.values : {};
  const deposit = amount(details.deposit);
  const rent = amount(details.monthlyRent);
  return {
    ...RESIDENTIAL_OFFER_DEFAULT,
    rentalTerm: v.rentalTerm === "short" ? "short" : "long", // legacy residential money forms were long contracts
    canNegotiateOtherTerm: v.canNegotiateOtherTerm === true,
    shortRateUnit: RESIDENTIAL_SHORT_RATE_UNITS.some(([id]) => id === v.shortRateUnit) ? v.shortRateUnit : "night",
    shortRateRial: v.rentalTerm === "short" ? String(amount(v.shortRateRial) || "") : "",
    securityHoldRial: v.rentalTerm === "short" ? String(amount(v.securityHoldRial) || "") : "",
    financialMode: has(RESIDENTIAL_FINANCIAL_MODES, v.financialMode) ? v.financialMode :
      deposit && rent ? "deposit_rent" : deposit ? "full_deposit" : rent ? "rent_only" : "",
    otherType: typeof v.otherType === "string" ? v.otherType.slice(0, 80) : "",
    features: Array.isArray(v.features) ? v.features.filter((k) => k === "yard").slice(0, 1) : [],
  };
}
/** Remove irrelevant hidden financial fields from the selected contract.
 * Old listings may have historical values in these fields even though users cannot see/edit them.
 * This applies only to the supply-side financial details; the original input is not mutated.
 */
export function residentialDetailsForActiveContract(offer = {}, details = {}) {
  if (offer.rentalTerm === "short") return {...details, deposit: "", monthlyRent: ""};
  if (offer.financialMode === "rent_only") return {...details, deposit: ""};
  if (offer.financialMode === "full_deposit") return {...details, monthlyRent: ""};
  return {...details};
}
export function validateResidentialOffer(offer = {}, details = {}, area = 0) {
  if (!has(RESIDENTIAL_OFFER_TYPES, details.propertyType)) return "نوع ملک مسکونی را مشخص کنید.";
  if (details.propertyType === "other" && String(offer.otherType || "").trim().length < 5)
    return "نوع سایر فضای مسکونی را با حداقل ۵ نویسه توضیح دهید.";
  if (!Number.isFinite(Number(area)) || Number(area) <= 0) return "متراژ واقعی ملک مسکونی را وارد کنید.";
  if (String(details.bedrooms || "") && (!/^\d{1,2}$/.test(digits(details.bedrooms)) || Number(digits(details.bedrooms)) > 20)) return "تعداد اتاق معتبر نیست.";
  if (!["short", "long"].includes(offer.rentalTerm || "long")) return "نوع مدت اجاره مسکونی را مشخص کنید.";
  if (offer.rentalTerm === "short") {
    if (!RESIDENTIAL_SHORT_RATE_UNITS.some(([id]) => id === offer.shortRateUnit)) return "دوره قیمت کوتاه‌مدت را انتخاب کنید.";
    if (!amount(offer.shortRateRial)) return "قیمت اقامت کوتاه‌مدت را به ریال وارد کنید.";
    if (digits(offer.securityHoldRial) && !amount(offer.securityHoldRial)) return "مبلغ ضمانت خسارت معتبر نیست.";
    return "";
  }
  if (!has(RESIDENTIAL_FINANCIAL_MODES, offer.financialMode)) return "روش رهن و اجاره را انتخاب کنید.";
  if (offer.financialMode !== "rent_only" && !amount(details.deposit)) return "مبلغ ودیعه را به ریال وارد کنید.";
  if (offer.financialMode !== "full_deposit" && !amount(details.monthlyRent)) return "مبلغ اجاره ماهانه را به ریال وارد کنید.";
  if (offer.financialMode === "rent_only" && digits(details.deposit)) return "برای فقط اجاره، مبلغ ودیعه را پاک کنید.";
  if (offer.financialMode === "full_deposit" && digits(details.monthlyRent)) return "در رهن کامل، مبلغ اجاره باید خالی باشد.";
  return "";
}
export function makeResidentialAttributes(offer = {}, details = {}) {
  return { schemaVersion: 1, category: "residential", values: {
    propertyType: has(RESIDENTIAL_OFFER_TYPES, details.propertyType) ? details.propertyType : null,
    otherType: details.propertyType === "other" ? String(offer.otherType || "").trim().slice(0, 80) : "",
    rentalTerm: offer.rentalTerm === "short" ? "short" : "long",
    canNegotiateOtherTerm: offer.canNegotiateOtherTerm === true,
    shortRateUnit: offer.rentalTerm === "short" && RESIDENTIAL_SHORT_RATE_UNITS.some(([id]) => id === offer.shortRateUnit) ? offer.shortRateUnit : null,
    shortRateRial: offer.rentalTerm === "short" ? amount(offer.shortRateRial) : null,
    securityHoldRial: offer.rentalTerm === "short" ? amount(offer.securityHoldRial) : null,
    financialMode: offer.rentalTerm === "short" ? null : has(RESIDENTIAL_FINANCIAL_MODES, offer.financialMode) ? offer.financialMode : null,
    features: Array.isArray(offer.features) && ["house", "villa"].includes(details.propertyType) && offer.features.includes("yard") ? ["yard"] : [],
  }};
}
/** Generic price is *monthly rent only*: deposit is never used as rental price. */
export function residentialListingPrice(offer = {}, details = {}) {
  if (offer.rentalTerm === "short") {
    const rate = amount(offer.shortRateRial);
    const type = {night:"daily",week:"weekly",month:"monthly"}[offer.shortRateUnit];
    return {price:rate ? String(rate) : "",priceType:rate && type ? type : "negotiable"};
  }
  const rent = offer.financialMode === "full_deposit" ? null : amount(details.monthlyRent);
  return { price: rent ? String(rent) : "", priceType: rent ? "monthly" : "negotiable" };
}
/** No invented zeroes; legacy advertisements are displayed from their actual stored amounts. */
export function residentialFinancialRows(details = {}, attrs = null) {
  const deposit = amount(details.deposit);
  const rent = amount(details.monthlyRent);
  const a = hasTyped(attrs) ? attrs.values : {};
  const money = (v) => v ? `${v.toLocaleString("fa-IR")} ریال` : "مبلغ اعلام نشده";
  if (a.rentalTerm === "short") {
    const unit = {night:"شبانه",week:"هفتگی",month:"ماهانه (کوتاه‌مدت)"}[a.shortRateUnit] || "دوره نامشخص";
    const rows = [{label:`اجاره ${unit}`,amount:money(amount(a.shortRateRial))}];
    if (amount(a.securityHoldRial)) rows.push({label:"ودیعه / ضمانت خسارت (قابل استرداد طبق توافق)",amount:money(amount(a.securityHoldRial))});
    return rows;
  }
  const typed = hasTyped(attrs) && has(RESIDENTIAL_FINANCIAL_MODES, attrs.values.financialMode);
  const mode = typed ? attrs.values.financialMode : (deposit && rent ? "deposit_rent" : deposit ? "full_deposit" : rent ? "rent_only" : "");
  if (mode === "full_deposit") return [{ label: "رهن کامل", amount: money(deposit) }];
  if (mode === "rent_only") return [{ label: "اجاره ماهانه", amount: money(rent) }];
  if (mode === "deposit_rent") return [
    { label: "ودیعه", amount: money(deposit) }, { label: "اجاره ماهانه", amount: money(rent) },
  ];
  return [];
}
export function residentialFinancialHeadline(details = {}, attrs = null) {
  return residentialFinancialRows(details, attrs).map(({ label, amount }) => `${label} ${amount}`).join(" • ");
}

/** Only owner-approved alternatives receive a single tick; a legacy typed long offer is long only. */
export function residentialRentalBadges(attrs = null) {
  if (!hasTyped(attrs)) return [];
  const v = attrs.values;
  const term = ["short", "long"].includes(v.rentalTerm) ? v.rentalTerm :
    has(RESIDENTIAL_FINANCIAL_MODES, v.financialMode) ? "long" : null;
  if (!term) return [];
  return [
    {term, label:residentialTermLabel(term), state:"primary"},
    {term:term === "short" ? "long" : "short", label:residentialTermLabel(term === "short" ? "long" : "short"),
      state:v.canNegotiateOtherTerm === true ? "possible" : "inactive"},
  ];
}
