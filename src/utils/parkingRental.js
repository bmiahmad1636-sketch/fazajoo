/** F5-01: Parking-specific finance adapter for the EXISTING RT-00 contract.
 * Not a matching engine. All amounts are IRR. Never infer terms for legacy ads.
 */
import POLICY from "../../shared/rental-term-policy.v1.json" with { type: "json" };
import { getRentalOptions, parseRialAmount, validateRentalTermProfile } from "../../shared/rental-term-core.mjs";

export const PARKING_TERMS = [["short", "کوتاه‌مدت / مقطعی"], ["long", "بلندمدت"]];
export const PARKING_MODES = [["rent_only", "فقط اجاره"], ["deposit_rent", "رهن و اجاره"], ["full_deposit", "رهن کامل"]];
export const PARKING_UNITS = {
  short: [["hour", "ساعتی"], ["day", "روزانه"], ["week", "هفتگی"]],
  long: [["month", "ماهانه"], ["year", "سالانه"]],
};
const allowed = getRentalOptions(POLICY, "parking");
if (!allowed || !PARKING_UNITS.short.every(([id]) => allowed.rateUnitsByTerm.short.includes(id)) ||
    !PARKING_UNITS.long.every(([id]) => allowed.rateUnitsByTerm.long.includes(id))) {
  throw new Error("Parking rental configuration differs from RT-00 policy");
}
const cleanAmount = value => parseRialAmount(value);
const positive = value => {
  const n = cleanAmount(value);
  return n !== null && n > 0 && n <= 999999999999999 ? n : null;
};
const optionalMoneyValid = value => value === "" || value === null || value === undefined || positive(value) !== null;
const unitAllowed = (term, unit, category = "parking") => getRentalOptions(POLICY, category)?.rateUnitsByTerm?.[term]?.includes(unit) === true;
export const PARKING_RENTAL_DEFAULT = Object.freeze({
  rentalTerm: "", shortRateUnit: "day", shortRateRial: "", securityHoldRial: "",
  financialMode: "", longRateUnit: "month", longMonthlyRentRial: "", longYearlyRentRial: "",
  longDepositRial: "", canNegotiateOtherTerm: false,
});
export const PARKING_WANTED_FINANCE_DEFAULT = Object.freeze({
  rentalTerm: "", shortRateUnit: "day", maxBudgetRial: "", maxSecurityHoldRial: "",
  financialMode: "", longRateUnit: "month", maxRentRial: "", maxDepositRial: "",
});

/** Switching contract/period scrubs stale amounts BEFORE preview and persistence. */
export function changeParkingRentalTerm(values, term, wanted = false) {
  const defaults = wanted ? PARKING_WANTED_FINANCE_DEFAULT : PARKING_RENTAL_DEFAULT;
  if (!PARKING_TERMS.some(([key]) => key === term)) return { ...values, ...defaults };
  return { ...values, ...defaults, rentalTerm: term,
    ...(wanted ? {} : { canNegotiateOtherTerm: values.canNegotiateOtherTerm === true }) };
}
export function changeParkingFinancialMode(values, financialMode, wanted = false) {
  if (!PARKING_MODES.some(([key]) => key === financialMode)) financialMode = "";
  if (wanted) return { ...values, financialMode, maxDepositRial: "", maxRentRial: "" };
  return { ...values, financialMode, longDepositRial: "", longMonthlyRentRial: "", longYearlyRentRial: "" };
}
export function changeParkingRateUnit(values, unit, wanted = false) {
  const term = values.rentalTerm;
  if (!unitAllowed(term, unit)) return values;
  if (term === "short") return { ...values, shortRateUnit: unit,
    ...(wanted ? { maxBudgetRial: "" } : { shortRateRial: "" }) };
  if (wanted) return { ...values, longRateUnit: unit, maxRentRial: "" };
  return { ...values, longRateUnit: unit, longMonthlyRentRial: "", longYearlyRentRial: "" };
}

function contractValidation(values, wanted, requireTerm, category = "parking") {
  const term = values?.rentalTerm || "";
  if (!term && !requireTerm) return ""; // legacy edit: no implicit conversion
  if (!PARKING_TERMS.some(([key]) => key === term)) return "مدت اصلی قرارداد پارکینگ را انتخاب کنید.";
  const unit = term === "short" ? values.shortRateUnit : values.longRateUnit;
  const mode = values.financialMode;
  if (!unitAllowed(term, unit, category)) return "دوره محاسبه اجاره را متناسب با مدت قرارداد انتخاب کنید.";
  if (term === "long" && !PARKING_MODES.some(([key]) => key === mode)) return "نوع قرارداد بلندمدت را انتخاب کنید.";
  const requiredRent = term === "short" ? (wanted ? values.maxBudgetRial : values.shortRateRial)
    : wanted ? values.maxRentRial : (unit === "year" ? values.longYearlyRentRial : values.longMonthlyRentRial);
  if ((term === "short" || mode !== "full_deposit") && !positive(requiredRent)) {
    return wanted ? "سقف بودجه اجاره را به ریال وارد کنید." : "مبلغ اجاره را به ریال وارد کنید.";
  }
  if (term === "long" && mode !== "rent_only" && !positive(wanted ? values.maxDepositRial : values.longDepositRial)) {
    return wanted ? "سقف مبلغ رهن را به ریال وارد کنید." : "مبلغ رهن را به ریال وارد کنید.";
  }
  const optionalSecurity = wanted ? values.maxSecurityHoldRial : values.securityHoldRial;
  if (term === "short" && !optionalMoneyValid(optionalSecurity)) return "مبلغ ضمانت خسارت / ودیعه معتبر نیست.";
  // RT-00 validates the period and deposit semantics. Wanted limits are NOT offer amounts.
  const profile = validateRentalTermProfile({ category, side: wanted ? "wanted" : "offer",
    primaryTerm: term, rateUnit: unit,
    canNegotiateOtherTerm: wanted ? null : values.canNegotiateOtherTerm === true,
    rateAmountRial: wanted || (term === "long" && mode === "full_deposit") ? null : positive(requiredRent),
    leaseDepositRial: wanted || term !== "long" || mode === "rent_only" ? null : positive(values.longDepositRial),
    monthlyRentRial: wanted || term !== "long" || mode === "full_deposit" || unit !== "month" ? null : positive(values.longMonthlyRentRial),
    securityHoldRial: wanted || term !== "short" ? null : positive(values.securityHoldRial),
  }, POLICY, { requireTerm: true });
  if (!profile.ok) return "شرایط قرارداد با استاندارد مشترک فضاجو سازگار نیست.";
  return "";
}
export function validateParkingRentalOffer(values, requireTerm = true, category = "parking") { return contractValidation(values, false, requireTerm, category); }
export function validateParkingRentalRequest(values, requireTerm = true, category = "parking") { return contractValidation(values, true, requireTerm, category); }

/** Generic listing columns are only a backwards-compatible headline, never deposit money. */
export function parkingListingPrice(values, wanted = false) {
  const term = values?.rentalTerm;
  if (!PARKING_TERMS.some(([key]) => key === term)) return null;
  const unit = term === "short" ? values.shortRateUnit : values.longRateUnit;
  const rent = term === "short" ? (wanted ? values.maxBudgetRial : values.shortRateRial)
    : wanted ? values.maxRentRial : (unit === "year" ? values.longYearlyRentRial : values.longMonthlyRentRial);
  const money = term === "long" && values.financialMode === "full_deposit" ? null : positive(rent);
  const priceType = !money || unit === "hour" ? "negotiable" : ({day:"daily",week:"weekly",month:"monthly",year:"yearly"}[unit] || "negotiable");
  return { price: money && priceType !== "negotiable" ? String(money) : "", priceType };
}
export const parkingRialText = value => positive(value) === null ? "" : `${positive(value).toLocaleString("fa-IR")} ریال`;
export const parkingTermLabel = term => PARKING_TERMS.find(([id]) => id === term)?.[1] || "";
export function parkingFinancialRows(values, wanted = false) {
  if (!values || !PARKING_TERMS.some(([key]) => key === values.rentalTerm)) return [];
  const labelUnit = unit => [...PARKING_UNITS.short, ...PARKING_UNITS.long].find(([id]) => id === unit)?.[1] || "";
  const rows = [{ label: "مدت قرارداد", amount: parkingTermLabel(values.rentalTerm) }];
  if (values.rentalTerm === "short") {
    const price = parkingRialText(wanted ? values.maxBudgetRial : values.shortRateRial);
    if (price) rows.push({ label: `${wanted ? "سقف بودجه" : "هزینه استفاده"} / ${labelUnit(values.shortRateUnit)}`, amount: price });
    const hold = parkingRialText(wanted ? values.maxSecurityHoldRial : values.securityHoldRial);
    if (hold) rows.push({ label: wanted ? "حداکثر ضمانت خسارت / ودیعه" : "ضمانت خسارت / ودیعه", amount: hold });
  } else {
    const mode = PARKING_MODES.find(([id]) => id === values.financialMode)?.[1];
    if (mode) rows.push({ label: "نوع قرارداد", amount: mode });
    const rent = parkingRialText(wanted ? values.maxRentRial : (values.longRateUnit === "year" ? values.longYearlyRentRial : values.longMonthlyRentRial));
    const deposit = parkingRialText(wanted ? values.maxDepositRial : values.longDepositRial);
    if (deposit && values.financialMode !== "rent_only") rows.push({ label: wanted ? "سقف رهن" : "مبلغ رهن", amount: deposit });
    if (rent && values.financialMode !== "full_deposit") rows.push({ label: `${wanted ? "سقف اجاره" : "اجاره"} / ${labelUnit(values.longRateUnit)}`, amount: rent });
  }
  return rows;
}
/** Monetary figures ONLY: title/mode belong to the contract area, not the price box. */
export const parkingMoneyRows = (values, wanted = false) => parkingFinancialRows(values, wanted)
  .filter(row => row.label !== "مدت قرارداد" && row.label !== "نوع قرارداد");
export const parkingFinancialHeadline = (values, wanted = false) => parkingMoneyRows(values, wanted)
  .map(row => `${row.label}: ${row.amount}`).join(" • ") || "";
/** Presentation-only metadata: never grants a second price or auto-match. */
export function parkingRentalBadges(values, wanted = false) {
  const term = values?.rentalTerm;
  if (!PARKING_TERMS.some(([key]) => key === term)) return [];
  const primary = { term, label: term === "short" ? "کوتاه‌مدت" : "بلندمدت", state: wanted ? "requested" : "primary" };
  if (wanted || values.canNegotiateOtherTerm !== true) return [primary];
  const alternative = term === "short" ? "long" : "short";
  return [primary, { term: alternative, label: alternative === "short" ? "کوتاه‌مدت" : "بلندمدت", state: "possible" }];
}
