/** Server-side whitelist for actual residential supply only. */
const TYPES = ["apartment", "house", "villa", "suite", "penthouse", "room", "other"];
const MODES = ["deposit_rent", "full_deposit", "rent_only"];
function cleanResidentialSpaceAttributes(attributes, category, side) {
  if (category !== "residential" || side !== "offer" || !attributes ||
      attributes.schemaVersion !== 1 || attributes.category !== "residential" ||
      !attributes.values || typeof attributes.values !== "object" || Array.isArray(attributes.values)) return {};
  const v = attributes.values;
  const propertyType = TYPES.includes(v.propertyType) ? v.propertyType : null;
  return { schemaVersion: 1, category: "residential", values: {
    propertyType,
    financialMode: MODES.includes(v.financialMode) ? v.financialMode : null,
    otherType: propertyType === "other" ? String(v.otherType || "").trim().slice(0, 80) : "",
    features: ["house", "villa"].includes(propertyType) && Array.isArray(v.features) && v.features.includes("yard") ? ["yard"] : [],
  }};
}
module.exports = { cleanResidentialSpaceAttributes };
