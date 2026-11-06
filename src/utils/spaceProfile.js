/**
 * Fazajoo space contract v1 — READ-ONLY compatibility adapter.
 * No database write, description rewrite, notification or match-score side effect.
 * Values not explicitly known stay null. Money is always in IRR.
 */
import STANDARD from "../../shared/space-standard.v1.json" with { type: "json" };

export { STANDARD as SPACE_STANDARD_V1 };
const TAGS = {
  parking: "FAZAJOO_PARKING_REQUEST", storage: "FAZAJOO_WAREHOUSE_REQUEST",
  warehouse: "FAZAJOO_SHED_REQUEST", residential: "FAZAJOO_RESIDENTIAL_REQUEST",
  villa: "FAZAJOO_VILLA_REQUEST", garden: "FAZAJOO_GARDEN_REQUEST",
  shop: "FAZAJOO_SHOP_REQUEST", land: "FAZAJOO_LAND_RENTAL",
  other: "FAZAJOO_OTHER_WANTED",
};
const PERIODS = new Set(["daily", "weekly", "monthly", "yearly"]);
const DIGITS = (value) => String(value ?? "")
  .replace(/[۰-۹]/g, (char) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(char)))
  .replace(/[٠-٩]/g, (char) => String("٠١٢٣٤٥٦٧٨٩".indexOf(char)))
  .replace(/٫/g, ".").replace(/[٬,\s]/g, "");

export function numericOrNull(value) {
  if (value === "" || value === null || value === undefined || typeof value === "boolean") return null;
  const normalized = DIGITS(value);
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
}
export function normalizeCity(value) {
  const name = String(value || "").trim().replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/\u200c/g, " ").replace(/\s+/g, " ")
    .replace(/^(?:شهر|شهرستان)\s+/, "").trim();
  return name || null;
}
function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function selectedFeatures(value) {
  return Array.isArray(value) ? [...new Set(value.filter((v) => typeof v === "string" && v.length <= 40))].slice(0, 30) : [];
}
function positiveFlags(object, aliases = {}) {
  return Object.entries(aliases).filter(([source]) => object?.[source] === true).map(([, target]) => target);
}
function periodOrNull(value) { return PERIODS.has(value) ? value : null; }

/** Reads only a known, anchored metadata tag; leaves malformed/legacy text untouched. */
export function readDemandMetadata(category, description = "") {
  const tag = TAGS[category];
  if (!tag) return null;
  const text = String(description || "");
  const parkingPrefix = category === "parking" ? text.match(/^\[کاربری پارکینگ: (خودرو|موتورسیکلت|سایر)(?: - [^\]\n]*)?\]\n?/) : null;
  const afterPrefix = parkingPrefix ? text.slice(parkingPrefix[0].length) : text;
  const match = afterPrefix.match(new RegExp(`^\\[${tag}:([^\\]\\n]+)\\]`));
  if (!match) return parkingPrefix ? { vehicleUsage: { خودرو: "car", موتورسیکلت: "motorcycle" }[parkingPrefix[1]] || null, specialUsage: parkingPrefix[1] === "سایر" } : null;
  try {
    const value = JSON.parse(decodeURIComponent(match[1]));
    if (!value || Array.isArray(value) || typeof value !== "object") return null;
    return category === "parking"
      ? { ...value, vehicleUsage: { خودرو: "car", موتورسیکلت: "motorcycle" }[parkingPrefix?.[1]] || null, specialUsage: parkingPrefix?.[1] === "سایر" }
      : value;
  } catch { return null; }
}
function validAttributes(listing) {
  const attrs = listing?.spaceAttributes;
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs) || attrs.schemaVersion !== 1 || attrs.category !== listing.category || !attrs.values || typeof attrs.values !== "object" || Array.isArray(attrs.values)) return {};
  const allowed = STANDARD.categories[listing.category]?.offerFields || [];
  return Object.fromEntries(allowed.filter((key) => Object.hasOwn(attrs.values, key)).map((key) => [key, attrs.values[key]]));
}

/** Adapt a persisted listing into common semantics (never invent missing facts). */
export function toSpaceProfile(listing = {}) {
  const category = String(listing.category || "");
  if (!STANDARD.categories[category]) return null;
  const side = listing.listingType === "wanted" || listing.listing_type === "wanted" ? "wanted" : "offer";
  const profile = {
    schemaVersion: 1, side, category,
    city: normalizeCity(listing.city),
    areaSqm: null, minAreaSqm: null, maxAreaSqm: null,
    bedrooms: null, minBedrooms: null, capacity: null, guests: null,
    rentRial: null, maxRentRial: null, depositRial: null, maxDepositRial: null,
    pricePeriod: null, fields: {}, features: [],
    source: "legacy-fields", hasStructuredDetails: false,
  };
  const res = listing.residentialDetails || {};
  const villa = listing.villaDetails || {};
  const garden = listing.gardenDetails || {};
  const shop = listing.shopDetails || {};
  if (side === "offer") {
    profile.areaSqm = numericOrNull(listing.area);
    profile.pricePeriod = periodOrNull(listing.priceType);
    if (category === "residential") {
      profile.rentRial = numericOrNull(res.monthlyRent);
      profile.depositRial = numericOrNull(res.deposit);
      profile.pricePeriod = "monthly";
      profile.bedrooms = numericOrNull(res.bedrooms);
      profile.fields.propertyType = textOrNull(res.propertyType);
      profile.features = positiveFlags(res, { parking: "parking", elevator: "elevator", storage: "storage", balcony: "balcony", furnished: "furnished" });
      if (Array.isArray(res.heatingSystems) && res.heatingSystems.length) profile.features.push("heating");
      if (Array.isArray(res.coolingSystems) && res.coolingSystems.length) profile.features.push("cooling");
    } else {
      if (profile.pricePeriod) profile.rentRial = numericOrNull(listing.price);
      if (category === "villa") {
        profile.bedrooms = numericOrNull(villa.bedrooms);
        profile.capacity = numericOrNull(villa.capacity);
        profile.features = positiveFlags(villa, { pool: "pool", heatedPool: "heated_pool", yard: "private_yard", furnished: "furnished", parking: "parking", barbecue: "barbecue", wifi: "wifi", petFriendly: "pet_friendly" });
      } else if (category === "garden") {
        profile.features = positiveFlags(garden, { water: "water", electricity: "electricity", fenced: "fenced", building: "building" });
        if (garden.irrigation) profile.features.push("irrigation");
      } else if (category === "shop") {
        profile.features = positiveFlags(shop, { cityGas: "gas", threePhase: "threePhase", restroom: "restroom" });
        if (shop.waterSupply && shop.waterSupply !== "none") profile.features.push("water");
        if (shop.electricitySupply && shop.electricitySupply !== "none") profile.features.push("electricity");
      }
    }
    // Future typed attributes are optional. Older ads still have a valid profile.
    const attrs = validAttributes(listing);
    profile.fields = { ...profile.fields, ...attrs };
    profile.features = [...new Set([...profile.features, ...selectedFeatures(attrs.features)])];
    profile.hasStructuredDetails = Object.keys(attrs).length > 0;
    if (category === "land" && attrs.depositRial != null) profile.depositRial = numericOrNull(attrs.depositRial);
    if (category === "garden") {
      profile.depositRial = numericOrNull(attrs.depositRial);
      profile.capacity = attrs.allowedPurposes?.includes("event") ? numericOrNull(attrs.eventCapacity) : null;
      if (garden.waterSource) profile.fields.waterSource = garden.waterSource === "share" ? "right" : garden.waterSource;
    }
    if (category === "shop" && attrs.transferType) {
      profile.depositRial = numericOrNull(attrs.depositRial);
      profile.rentRial = attrs.transferType === "rent" ? numericOrNull(attrs.monthlyRentRial) : null;
      profile.pricePeriod = attrs.transferType === "rent" ? "monthly" : null;
      profile.fields.keyMoneyRial = attrs.transferType === "key_money" ? numericOrNull(attrs.keyMoneyRial) : null;
    }
    if (category === "parking" && attrs.securityFeatures) profile.fields.securityFeatures = selectedFeatures(attrs.securityFeatures);
    if (category === "villa" && attrs.capacity != null) profile.capacity = numericOrNull(attrs.capacity);
    if (attrs.heightM != null) profile.fields.heightM = numericOrNull(attrs.heightM);
    if (attrs.entranceHeightCm != null) profile.fields.entranceHeightCm = numericOrNull(attrs.entranceHeightCm);
  } else {
    const meta = readDemandMetadata(category, listing.description);
    profile.hasStructuredDetails = Boolean(meta);
    profile.source = meta ? "wanted-metadata" : "legacy-wanted";
    profile.minAreaSqm = numericOrNull(meta?.minArea);
    profile.maxAreaSqm = numericOrNull(meta?.maxArea);
    if (category === "land" && meta?.areaUnit === "hectare") {
      if (profile.minAreaSqm !== null) profile.minAreaSqm *= 10000;
      if (profile.maxAreaSqm !== null) profile.maxAreaSqm *= 10000;
    }
    profile.minBedrooms = numericOrNull(meta?.minBedrooms);
    profile.guests = numericOrNull(category === "garden" && meta?.purpose === "event" ? meta?.eventGuests : meta?.guests);
    profile.features = selectedFeatures(meta?.features || meta?.amenities);
    profile.fields = {
      vehicleUsage: textOrNull(meta?.vehicleUsage), cover: textOrNull(meta?.cover),
      access: textOrNull(meta?.access), spaceType: textOrNull(meta?.spaceType),
      propertyType: textOrNull(meta?.propertyType), accommodationType: textOrNull(meta?.accommodationType),
      power: textOrNull(meta?.power), powerCapacityKw: category === "warehouse" ? numericOrNull(meta?.powerCapacity) : null, vehicleAccess: category === "warehouse" ? textOrNull(meta?.access) : null,
      purpose: textOrNull(meta?.purpose), primaryPurpose: textOrNull(meta?.primaryPurpose),
      gardenWaterPreference: category === "garden" ? textOrNull(meta?.waterPreference) : null,
      gardenDuration: category === "garden" ? textOrNull(meta?.duration) : null,
      gardenPrivacyRequired: category === "garden" && meta?.privacyRequired === true,
      legalUse: category === "land" && meta?.legalUse !== "other" ? textOrNull(meta?.legalUse) : null,
      locationType: category === "land" ? textOrNull(meta?.locationType) : null,
      activity: textOrNull(meta?.activity),
      leaseDuration: category === "warehouse" ? textOrNull(meta?.duration) : null,
      specialConditions: category === "warehouse" ? textOrNull(meta?.requirements) : null,
      transferType: textOrNull(meta?.transferType),
      rightsType: category === "shop" ? textOrNull(meta?.rightsType) : null,
      shopFloor: category === "shop" ? textOrNull(meta?.floor) : null,
      shopLocation: category === "shop" ? textOrNull(meta?.locationPreference) : null,
      shopFrontage: category === "shop" ? numericOrNull(meta?.frontage) : null,
      keyMoneyRial: category === "shop" ? numericOrNull(meta?.keyMoney) : null,
      floorPreference: textOrNull(meta?.floorPreference), specialUsage: meta?.specialUsage === true,
      minHeightM: numericOrNull(meta?.minHeight),
    };
    profile.pricePeriod = periodOrNull(meta?.pricePeriod || meta?.rentPeriod || listing.priceType);
    if (category === "residential" || category === "shop") {
      // Request budget ceilings are NOT owner asking prices.
      profile.maxRentRial = numericOrNull(meta?.monthlyRent);
      profile.maxDepositRial = numericOrNull(meta?.deposit);
      profile.pricePeriod = "monthly";
    } else if (category === "land") {
      profile.maxRentRial = numericOrNull(meta?.rent);
      profile.maxDepositRial = numericOrNull(meta?.deposit);
    } else {
      profile.maxRentRial = numericOrNull(meta?.maxBudget);
      profile.maxDepositRial = numericOrNull(meta?.maxDeposit);
    }
    // Old demand listings supplied a generic approximate area or budget only.
    // Do not silently turn the approximate area into an exact min/max range.
    if (!meta && numericOrNull(listing.area)) profile.fields.approximateAreaSqm = numericOrNull(listing.area);
    if (!meta && profile.maxRentRial === null && profile.pricePeriod) profile.maxRentRial = numericOrNull(listing.price);
  }
  return profile;
}
