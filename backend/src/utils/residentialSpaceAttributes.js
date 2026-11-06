/** Server-side whitelist for actual residential supply only. */
const TYPES = ["apartment", "house", "villa", "suite", "penthouse", "room", "other"];
const MODES = ["deposit_rent", "full_deposit", "rent_only"];
const SHORT_UNITS = ["night", "week", "month"];
const amount = (raw) => {
  if (raw === undefined || raw === null || raw === "" || typeof raw === "boolean") return null;
  const v = String(raw).replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g, "");
  if (!/^\d{1,15}$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
function cleanResidentialSpaceAttributes(attributes, category, side) {
  if (category !== "residential" || side !== "offer" || !attributes ||
      attributes.schemaVersion !== 1 || attributes.category !== "residential" ||
      !attributes.values || typeof attributes.values !== "object" || Array.isArray(attributes.values)) return {};
  const v = attributes.values;
  const propertyType = TYPES.includes(v.propertyType) ? v.propertyType : null;
  return { schemaVersion: 1, category: "residential", values: {
    propertyType,
    rentalTerm: v.rentalTerm === "short" ? "short" : "long",
    canNegotiateOtherTerm: v.canNegotiateOtherTerm === true,
    shortRateUnit: v.rentalTerm === "short" && SHORT_UNITS.includes(v.shortRateUnit) ? v.shortRateUnit : null,
    shortRateRial: v.rentalTerm === "short" ? amount(v.shortRateRial) : null,
    securityHoldRial: v.rentalTerm === "short" ? amount(v.securityHoldRial) : null,
    financialMode: v.rentalTerm === "short" ? null : MODES.includes(v.financialMode) ? v.financialMode : null,
    otherType: propertyType === "other" ? String(v.otherType || "").trim().slice(0, 80) : "",
    features: ["house", "villa"].includes(propertyType) && Array.isArray(v.features) && v.features.includes("yard") ? ["yard"] : [],
  }};
}
module.exports = { cleanResidentialSpaceAttributes };
