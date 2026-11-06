/** Professional residential *supply* — distinct from demand and recreational villa. */
export const RESIDENTIAL_OFFER_TYPES = [
  ["apartment", "آپارتمان"], ["house", "خانه"], ["villa", "خانه ویلایی"],
  ["suite", "سوئیت"], ["penthouse", "پنت‌هاوس"], ["room", "اتاق"], ["other", "سایر مسکونی"],
];
export const RESIDENTIAL_FINANCIAL_MODES = [
  ["deposit_rent", "رهن و اجاره"], ["full_deposit", "رهن کامل"], ["rent_only", "فقط اجاره"],
];
export const RESIDENTIAL_OFFER_DEFAULT = Object.freeze({ financialMode: "", otherType: "", features: [] });
const has = (values, key) => values.some(([id]) => id === key);
const digits = (value) => String(value ?? "")
  .replace(/[۰-۹]/g, (v) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(v)))
  .replace(/[٠-٩]/g, (v) => String("٠١٢٣٤٥٦٧٨٩".indexOf(v)))
  .replace(/[٬,\s]/g, "").replace(/\D/g, "");
export const residentialMoneyDigits = digits;
export const residentialMoneyDisplay = (value) => digits(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const amount = (value) => {
  const raw = digits(value);
  if (!raw || raw.length > 15) return null;
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
    financialMode: has(RESIDENTIAL_FINANCIAL_MODES, v.financialMode) ? v.financialMode :
      deposit && rent ? "deposit_rent" : deposit ? "full_deposit" : rent ? "rent_only" : "",
    otherType: typeof v.otherType === "string" ? v.otherType.slice(0, 80) : "",
    features: Array.isArray(v.features) ? v.features.filter((k) => k === "yard").slice(0, 1) : [],
  };
}
export function validateResidentialOffer(offer = {}, details = {}, area = 0) {
  if (!has(RESIDENTIAL_OFFER_TYPES, details.propertyType)) return "نوع ملک مسکونی را مشخص کنید.";
  if (details.propertyType === "other" && String(offer.otherType || "").trim().length < 5)
    return "نوع سایر فضای مسکونی را با حداقل ۵ نویسه توضیح دهید.";
  if (!Number.isFinite(Number(area)) || Number(area) <= 0) return "متراژ واقعی ملک مسکونی را وارد کنید.";
  if (!has(RESIDENTIAL_FINANCIAL_MODES, offer.financialMode)) return "روش رهن و اجاره را انتخاب کنید.";
  if (offer.financialMode !== "rent_only" && !amount(details.deposit)) return "مبلغ ودیعه را به ریال وارد کنید.";
  if (offer.financialMode !== "full_deposit" && !amount(details.monthlyRent)) return "مبلغ اجاره ماهانه را به ریال وارد کنید.";
  if (offer.financialMode === "rent_only" && digits(details.deposit)) return "برای فقط اجاره، مبلغ ودیعه را پاک کنید.";
  if (offer.financialMode === "full_deposit" && digits(details.monthlyRent)) return "در رهن کامل، مبلغ اجاره باید خالی باشد.";
  if (String(details.bedrooms || "") && (!/^\d{1,2}$/.test(digits(details.bedrooms)) || Number(digits(details.bedrooms)) > 20)) return "تعداد اتاق معتبر نیست.";
  return "";
}
export function makeResidentialAttributes(offer = {}, details = {}) {
  return { schemaVersion: 1, category: "residential", values: {
    propertyType: has(RESIDENTIAL_OFFER_TYPES, details.propertyType) ? details.propertyType : null,
    otherType: details.propertyType === "other" ? String(offer.otherType || "").trim().slice(0, 80) : "",
    financialMode: has(RESIDENTIAL_FINANCIAL_MODES, offer.financialMode) ? offer.financialMode : null,
    features: Array.isArray(offer.features) && ["house", "villa"].includes(details.propertyType) && offer.features.includes("yard") ? ["yard"] : [],
  }};
}
/** Generic price is *monthly rent only*: deposit is never used as rental price. */
export function residentialListingPrice(offer = {}, details = {}) {
  const rent = offer.financialMode === "full_deposit" ? null : amount(details.monthlyRent);
  return { price: rent ? String(rent) : "", priceType: rent ? "monthly" : "negotiable" };
}
/** No invented zeroes; legacy advertisements are displayed from their actual stored amounts. */
export function residentialFinancialRows(details = {}, attrs = null) {
  const deposit = amount(details.deposit);
  const rent = amount(details.monthlyRent);
  const typed = hasTyped(attrs) && has(RESIDENTIAL_FINANCIAL_MODES, attrs.values.financialMode);
  const mode = typed ? attrs.values.financialMode : (deposit && rent ? "deposit_rent" : deposit ? "full_deposit" : rent ? "rent_only" : "");
  const money = (v) => v ? `${v.toLocaleString("fa-IR")} ریال` : "مبلغ اعلام نشده";
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
