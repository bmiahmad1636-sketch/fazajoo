"use strict";
/** F5-01: Parking finance INPUT validation/sanitization, not a second matching engine.
 * Shared RT-00 JSON is the only source for allowed terms and rate units.
 */
const POLICY = require("../../../shared/rental-term-policy.v1.json");
const OPTIONS = POLICY.categories.parking;
const TERMS = OPTIONS.terms;
const MODES = ["rent_only", "full_deposit", "deposit_rent"];
const units = (term, category = "parking") => POLICY.categories[category]?.rateUnitsByTerm?.[term] || [];
const money = input => {
  if (input === null || input === undefined || input === "" || typeof input === "boolean") return null;
  const cleaned = String(input).replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/[,٬\s]/g, "");
  if (!/^\d{1,15}$/.test(cleaned)) return null;
  const val = Number(cleaned);
  return Number.isSafeInteger(val) && val > 0 ? val : null;
};
const absent = x => x === "" || x === null || x === undefined;
const invalidOptional = x => !absent(x) && money(x) === null;
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
function cleanParkingFinance(raw, wanted = false, category = "parking") {
  const v = asObject(raw);
  const term = TERMS.includes(v.rentalTerm) ? v.rentalTerm : null;
  const short = term === "short";
  const long = term === "long";
  const mode = long && MODES.includes(v.financialMode) ? v.financialMode : null;
  const shortRateUnit = short && units("short", category).includes(v.shortRateUnit) ? v.shortRateUnit : null;
  const longRateUnit = long && units("long", category).includes(v.longRateUnit) ? v.longRateUnit : null;
  return {
    rentalTerm: term,
    shortRateUnit,
    shortRateRial: !wanted && short ? money(v.shortRateRial) : null,
    securityHoldRial: !wanted && short ? money(v.securityHoldRial) : null,
    maxBudgetRial: wanted && short ? money(v.maxBudgetRial) : null,
    maxSecurityHoldRial: wanted && short ? money(v.maxSecurityHoldRial) : null,
    financialMode: mode,
    longRateUnit,
    longMonthlyRentRial: !wanted && long && longRateUnit === "month" && mode !== "full_deposit" ? money(v.longMonthlyRentRial) : null,
    longYearlyRentRial: !wanted && long && longRateUnit === "year" && mode !== "full_deposit" ? money(v.longYearlyRentRial) : null,
    longDepositRial: !wanted && long && mode !== "rent_only" ? money(v.longDepositRial) : null,
    maxRentRial: wanted && long && mode !== "full_deposit" ? money(v.maxRentRial) : null,
    maxDepositRial: wanted && long && mode !== "rent_only" ? money(v.maxDepositRial) : null,
    canNegotiateOtherTerm: !wanted && v.canNegotiateOtherTerm === true,
  };
}
function validateParkingFinance(raw, wanted = false, category = "parking") {
  const src = asObject(raw);
  const v = cleanParkingFinance(src, wanted, category);
  if (!v.rentalTerm) return "مدت اصلی پارکینگ لازم است.";
  if (v.rentalTerm === "short") {
    if (!v.shortRateUnit) return "دوره کوتاه‌مدت معتبر نیست.";
    if (!(wanted ? v.maxBudgetRial : v.shortRateRial)) return "مبلغ کوتاه‌مدت یا سقف بودجه پارکینگ لازم است.";
    if (invalidOptional(wanted ? src.maxSecurityHoldRial : src.securityHoldRial)) return "ضمانت خسارت / ودیعه باید مبلغ معتبر باشد.";
  } else {
    if (!v.longRateUnit || !v.financialMode) return "دوره و نوع قرارداد بلندمدت پارکینگ لازم است.";
    if (v.financialMode !== "rent_only" && !(wanted ? v.maxDepositRial : v.longDepositRial)) return "رهن پارکینگ یا سقف آن لازم است.";
    if (v.financialMode !== "full_deposit" && !(wanted ? v.maxRentRial : v.longRateUnit === "year" ? v.longYearlyRentRial : v.longMonthlyRentRial)) return "اجاره پارکینگ یا سقف آن لازم است.";
  }
  return "";
}
function parkingFinancePrice(raw, wanted = false, category = "parking") {
  const v = cleanParkingFinance(raw, wanted, category);
  if (validateParkingFinance(raw, wanted, category)) return {price:"",priceType:"negotiable"};
  const rateUnit = v.rentalTerm === "short" ? v.shortRateUnit : v.longRateUnit;
  const amount = v.rentalTerm === "short" ? (wanted ? v.maxBudgetRial : v.shortRateRial)
    : v.financialMode === "full_deposit" ? null : (wanted ? v.maxRentRial : v.longRateUnit === "year" ? v.longYearlyRentRial : v.longMonthlyRentRial);
  const priceType = amount && rateUnit !== "hour" ? ({day:"daily",week:"weekly",month:"monthly",year:"yearly"}[rateUnit] || "negotiable") : "negotiable";
  return { price: priceType === "negotiable" ? "" : String(amount), priceType };
}
function readWantedParkingFinance(description) {
  const match = String(description || "").match(/\[FAZAJOO_PARKING_REQUEST:([^\]\n]+)\]/);
  if (!match) return null;
  try {
    const v = JSON.parse(decodeURIComponent(match[1]));
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return v;
  } catch { return null; }
}
module.exports = {cleanParkingFinance, validateParkingFinance, parkingFinancePrice, readWantedParkingFinance};
