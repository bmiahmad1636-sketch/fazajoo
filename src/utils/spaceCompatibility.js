/**
 * Read-only, explainable compatibility check for the future Fazajoo matching engine.
 * This is NOT a replacement for smartSearch.service or matchingEngine.js.
 * Unknown attributes do not count as "no", and no percent is fabricated.
 */
import { toSpaceProfile } from "./spaceProfile.js";

export function compareSpaceProfiles(wanted, offer) {
  const conflicts = [];
  const unknown = [];
  const matched = [];
  const requireCheck = (name, need, actual, compatible = (a, b) => a === b) => {
    if (need === null || need === undefined || need === "" || need === "any") return;
    if (actual === null || actual === undefined || actual === "") { unknown.push(name); return; }
    if (compatible(need, actual)) matched.push(name);
    else conflicts.push(name);
  };
  if (!wanted || !offer || wanted.side !== "wanted" || offer.side !== "offer") {
    return { status: "invalid", matched, conflicts: ["listing-direction"], unknown };
  }
  if (wanted.category !== offer.category) {
    return { status: "incompatible", matched, conflicts: ["category"], unknown };
  }
  requireCheck("city", wanted.city, offer.city, (need, actual) => need === actual);
  if (wanted.minAreaSqm !== null) requireCheck("min-area", wanted.minAreaSqm, offer.areaSqm, (need, actual) => actual >= need);
  if (wanted.maxAreaSqm !== null) requireCheck("max-area", wanted.maxAreaSqm, offer.areaSqm, (need, actual) => actual <= need);
  if (wanted.minBedrooms !== null) requireCheck("bedrooms", wanted.minBedrooms, offer.bedrooms, (need, actual) => actual >= need);
  if (wanted.guests !== null) requireCheck("capacity", wanted.guests, offer.capacity, (need, actual) => actual >= need);
  if (wanted.maxDepositRial !== null) requireCheck("deposit-irr", wanted.maxDepositRial, offer.depositRial, (need, actual) => actual <= need);
  if (wanted.maxRentRial !== null) {
    // Comparing daily vs monthly amounts is forbidden without an explicit policy.
    if (!wanted.pricePeriod || !offer.pricePeriod || wanted.pricePeriod !== offer.pricePeriod) unknown.push("price-period");
    else requireCheck("rent-irr", wanted.maxRentRial, offer.rentRial, (need, actual) => actual <= need);
  }
  const fields = wanted.fields || {};
  const available = offer.fields || {};
  if (wanted.category === "parking") {
    if (fields.specialUsage) unknown.push("parking-special-usage-review");
    requireCheck("parking-cover", fields.cover, available.cover);
    requireCheck("parking-vehicle", fields.vehicleUsage, available.vehicleUsage, (need, actual) => actual === "both" || actual === need);
    requireCheck("parking-access", fields.access, available.access, (need, actual) => actual === "anytime" || actual === need);
  } else if (wanted.category === "residential") {
    requireCheck("residential-type", fields.propertyType, available.propertyType);
  } else if (wanted.category === "storage" || wanted.category === "warehouse" || wanted.category === "shop") {
    requireCheck("space-type", fields.spaceType, available.spaceType);
    if (wanted.category === "storage") {
      requireCheck("storage-access", fields.access, available.access, (need, actual) => actual === "24h" || actual === need);
      requireCheck("storage-purpose", fields.purpose, available.allowedPurposes, (need, actual) => Array.isArray(actual) && actual.includes(need));
    }
    if (wanted.category === "shop") requireCheck("shop-transfer", fields.transferType, available.transferType);
    if (wanted.category === "warehouse") {
      requireCheck("industrial-activity", fields.activity, available.allowedActivities, (need, actual) => Array.isArray(actual) && actual.includes(need));
      requireCheck("industrial-min-height", fields.minHeightM, available.heightM, (need, actual) => actual >= need);
      requireCheck("industrial-power", fields.power, available.power, (need, actual) => need === actual || (need === "single" && actual === "three"));
      requireCheck("industrial-vehicle-access", fields.vehicleAccess, available.vehicleAccess, (need, actual) => ["van", "truck", "trailer"].indexOf(actual) >= ["van", "truck", "trailer"].indexOf(need));
    }
  }
  if (wanted.category === "garden") requireCheck("garden-purpose", fields.purpose, available.allowedPurposes, (need, actual) => Array.isArray(actual) && actual.includes(need));
  if (wanted.category === "land") requireCheck("land-purpose", fields.primaryPurpose, available.allowedPurposes, (need, actual) => Array.isArray(actual) && actual.includes(need));
  if (wanted.category === "villa") requireCheck("villa-type", fields.accommodationType, available.accommodationType);
  if (wanted.category === "residential" && fields.floorPreference && fields.floorPreference !== "any") unknown.push("residential-floor-review");
  // Absence from a legacy checklist is NOT a verified negative.
  for (const feature of wanted.features || []) {
    if ((offer.features || []).includes(feature)) matched.push(`feature:${feature}`);
    else unknown.push(`feature:${feature}`);
  }
  if (wanted.category === "other" && !conflicts.length) unknown.push("other-space-manual-review");
  const status = conflicts.length ? "incompatible" : unknown.length ? "needs_details" : "compatible";
  return { status, matched: [...new Set(matched)], conflicts: [...new Set(conflicts)], unknown: [...new Set(unknown)] };
}
export function compareSpaceListings(wantedListing, offerListing) {
  return compareSpaceProfiles(toSpaceProfile(wantedListing), toSpaceProfile(offerListing));
}
