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
    if (category === "warehouse") {
      const raw=listing.spaceAttributes;
      const v=raw?.schemaVersion===1 && raw?.category==="warehouse" && raw?.values && !Array.isArray(raw.values) ? raw.values : null;
      if(v && ["short","long"].includes(v.rentalTerm)){
        profile.fields.rentalTerm=v.rentalTerm;
        profile.fields.canNegotiateOtherTerm=v.canNegotiateOtherTerm===true;
        if(v.rentalTerm==="short"){
          profile.depositRial=null;
          profile.rentRial=numericOrNull(v.shortRateRial);
          profile.pricePeriod={day:"daily",week:"weekly",month:"monthly"}[v.shortRateUnit]||null;
          profile.fields.securityHoldRial=numericOrNull(v.securityHoldRial);
        }else{
          profile.depositRial=v.financialMode==="rent_only"?null:numericOrNull(v.longDepositRial);
          profile.rentRial=v.financialMode==="full_deposit"?null:numericOrNull(v.longRateUnit==="year"?v.longYearlyRentRial:v.longMonthlyRentRial);
          profile.pricePeriod=v.financialMode==="full_deposit"?null:({month:"monthly",year:"yearly"}[v.longRateUnit]||null);
        }
      }
    }
    if (category === "land" && attrs.depositRial != null) profile.depositRial = numericOrNull(attrs.depositRial);
    if (category === "garden") {
      profile.depositRial = ["short","seasonal"].includes(attrs.rentalTerm)?null:numericOrNull(attrs.depositRial);
      profile.fields.gardenRentalTerm=["short","seasonal","long"].includes(attrs.rentalTerm)?attrs.rentalTerm:null;
      profile.fields.canNegotiateOtherTerm=attrs.canNegotiateOtherTerm===true;
      if(attrs.rentalTerm==="short"){
        profile.rentRial=numericOrNull(attrs.shortRateRial);
        profile.pricePeriod=attrs.shortRateUnit||null;
        profile.fields.securityHoldRial=numericOrNull(attrs.securityHoldRial);
      }else if(attrs.rentalTerm==="seasonal"){
        profile.rentRial=numericOrNull(attrs.seasonalRateRial);
        profile.pricePeriod="seasonal";
        profile.fields.securityHoldRial=numericOrNull(attrs.seasonalSecurityHoldRial);
      }else if(attrs.rentalTerm==="long"){
        profile.rentRial=attrs.financialMode==="full_deposit"?null:numericOrNull(attrs.longMonthlyRentRial);
        profile.pricePeriod=profile.rentRial?"monthly":null;
      }
      profile.capacity = attrs.allowedPurposes?.includes("event") ? numericOrNull(attrs.eventCapacity) : null;
      if (garden.waterSource) profile.fields.waterSource = garden.waterSource === "share" ? "right" : garden.waterSource;
    }
    if (category === "shop" && attrs.transferType) {
      const raw=listing.spaceAttributes?.schemaVersion===1&&listing.spaceAttributes?.category==="shop"?listing.spaceAttributes.values:null;
      if(raw && ["short","long"].includes(raw.rentalTerm) && raw.transferType!=="key_money"){
        profile.fields.rentalTerm=raw.rentalTerm;
        profile.fields.canNegotiateOtherTerm=raw.canNegotiateOtherTerm===true;
        if(raw.rentalTerm==="short"){
          profile.rentRial=numericOrNull(raw.shortRateRial);
          profile.depositRial=null;
          profile.fields.securityHoldRial=numericOrNull(raw.securityHoldRial);
          profile.pricePeriod={day:"daily",week:"weekly",month:"monthly"}[raw.shortRateUnit]||null;
        }else{
          profile.depositRial=raw.financialMode==="rent_only"?null:numericOrNull(raw.longDepositRial);
          profile.rentRial=raw.financialMode==="full_deposit"?null:numericOrNull(raw.longRateUnit==="year"?raw.longYearlyRentRial:raw.longMonthlyRentRial);
          profile.pricePeriod=raw.financialMode==="full_deposit"?null:({month:"monthly",year:"yearly"}[raw.longRateUnit]||null);
        }
      }else{
      profile.depositRial = numericOrNull(attrs.depositRial);
      profile.rentRial = attrs.transferType === "rent" ? numericOrNull(attrs.monthlyRentRial) : null;
      profile.pricePeriod = attrs.transferType === "rent" ? "monthly" : null;
      profile.fields.keyMoneyRial = attrs.transferType === "key_money" ? numericOrNull(attrs.keyMoneyRial) : null;
      }
    }
    if(category === "other" && Object.keys(attrs).length){
      profile.fields.rentalTerm=["short","long"].includes(attrs.rentalTerm)?attrs.rentalTerm:null;
      profile.fields.canNegotiateOtherTerm=attrs.canNegotiateOtherTerm===true;
      if(attrs.rentalTerm==="short"){
        profile.rentRial=numericOrNull(attrs.shortRateRial);
        profile.pricePeriod=periodOrNull(attrs.shortRateUnit);
        profile.depositRial=null; // Short-term refundable damage hold is never a lease deposit.
        profile.fields.securityHoldRial=numericOrNull(attrs.securityHoldRial);
      }else if(attrs.rentalTerm==="long"){
        profile.depositRial=numericOrNull(attrs.longDepositRial);
        profile.rentRial=attrs.financialMode==="full_deposit"?null:numericOrNull(attrs.longMonthlyRentRial);
        profile.pricePeriod=profile.rentRial?"monthly":null;
      }
    }
    if (category === "parking" && attrs.securityFeatures) profile.fields.securityFeatures = selectedFeatures(attrs.securityFeatures);
    if (category === "residential" && Object.keys(attrs).length) {
      profile.fields.rentalTerm = ["short", "long"].includes(attrs.rentalTerm)
        ? attrs.rentalTerm : ["full_deposit","deposit_rent","rent_only"].includes(attrs.financialMode) ? "long" : null;
      profile.fields.canNegotiateOtherTerm = attrs.canNegotiateOtherTerm === true;
      if (profile.fields.rentalTerm === "short") {
        profile.rentRial = numericOrNull(attrs.shortRateRial);
        profile.depositRial = null; // Short stay damage hold is NOT lease deposit.
        profile.pricePeriod = {night:"daily",week:"weekly",month:"monthly"}[attrs.shortRateUnit] || null;
        profile.fields.securityHoldRial = numericOrNull(attrs.securityHoldRial);
        profile.fields.shortRateUnit = attrs.shortRateUnit || null;
      }
    }
    if (category === "villa") {
      profile.fields.canNegotiateOtherTerm = attrs.canNegotiateOtherTerm === true;
      if (attrs.rentalTerm === "long") {
        profile.depositRial = numericOrNull(attrs.longDepositRial);
        profile.rentRial = numericOrNull(attrs.longMonthlyRentRial);
        profile.pricePeriod = profile.rentRial ? "monthly" : null;
      } else if (attrs.depositRial != null) profile.depositRial = numericOrNull(attrs.depositRial);
      if (attrs.availableStays) profile.fields.availableStays = Array.isArray(attrs.availableStays) ? attrs.availableStays : null;
      if (attrs.privacy === "unknown") profile.fields.privacy = null;
    }
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
      gardenDuration: category === "garden" && !meta?.rentalTerm ? textOrNull(meta?.duration) : null,
      gardenRentalTerm:category==="garden"&&["short","seasonal","long"].includes(meta?.rentalTerm)?meta.rentalTerm:null,
      gardenPrivacyRequired: category === "garden" && meta?.privacyRequired === true,
      legalUse: category === "land" && meta?.legalUse !== "other" ? textOrNull(meta?.legalUse) : null,
      locationType: category === "land" ? textOrNull(meta?.locationType) : null,
      activity: textOrNull(meta?.activity),
      leaseDuration: category === "warehouse" && !["short","long"].includes(meta?.rentalTerm) ? textOrNull(meta?.duration) : null,
      industrialRentalTerm: category === "warehouse" && ["short","long"].includes(meta?.rentalTerm) ? meta.rentalTerm : null,
      specialConditions: category === "warehouse" ? textOrNull(meta?.requirements) : null,
      transferType: textOrNull(meta?.transferType),
      shopRentalTerm: category==="shop"&&["short","long"].includes(meta?.rentalTerm)?meta.rentalTerm:null,
      shopOtherSpaceType: category==="shop"&&meta?.spaceType==="other" ? textOrNull(meta?.otherSpaceType) : null,
      rightsType: category === "shop" ? textOrNull(meta?.rightsType) : null,
      shopFloor: category === "shop" ? textOrNull(meta?.floor) : null,
      shopLocation: category === "shop" ? textOrNull(meta?.locationPreference) : null,
      shopFrontage: category === "shop" ? numericOrNull(meta?.frontage) : null,
      villaStayType: category === "villa" && meta?.rentalTerm !== "long" ? textOrNull(meta?.stayType) : null,
      villaRentalTerm: category === "villa" ? textOrNull(meta?.rentalTerm) : null,
      otherRentalTerm: category === "other" && ["short","long"].includes(meta?.rentalTerm) ? meta.rentalTerm : null,
      residentialRentalTerm: category === "residential" ? (meta?.rentalTerm === "short" || meta?.rentalTerm === "long" ? meta.rentalTerm : null) : null,
      residentialShortRateUnit: category === "residential" ? textOrNull(meta?.shortRateUnit) : null,
      villaFinancialMode: category === "villa" && meta?.rentalTerm === "long" ? textOrNull(meta?.financialMode) : null,
      villaPrivacyRequired: category === "villa" && meta?.privacyRequired === true,
      keyMoneyRial: category === "shop" ? numericOrNull(meta?.keyMoney) : null,
      floorPreference: textOrNull(meta?.floorPreference), specialUsage: meta?.specialUsage === true,
      minHeightM: numericOrNull(meta?.minHeight),
    };
    profile.pricePeriod = periodOrNull(meta?.pricePeriod || meta?.rentPeriod || listing.priceType);
    if (category === "residential" || category === "shop") {
      // Request budget ceilings are NOT owner asking prices.
      if(category==="shop"&&meta?.transferType==="key_money"){
        profile.maxRentRial=null;profile.maxDepositRial=null;profile.pricePeriod=null;
      } else if(category==="shop"&&["short","long"].includes(meta?.rentalTerm)){
        profile.maxRentRial=meta.rentalTerm==="short"?numericOrNull(meta.maxBudgetRial):meta.financialMode==="full_deposit"?null:numericOrNull(meta.maxRentRial);
        profile.maxDepositRial=meta.rentalTerm==="long"&&meta.financialMode!=="rent_only"?numericOrNull(meta.maxDepositRial):null;
        profile.pricePeriod=meta.rentalTerm==="short"?({day:"daily",week:"weekly",month:"monthly"}[meta.shortRateUnit]||null):meta.financialMode==="full_deposit"?null:({month:"monthly",year:"yearly"}[meta.longRateUnit]||null);
        profile.fields.securityHoldBudget=meta.rentalTerm==="short"?numericOrNull(meta.maxSecurityHoldRial):null;
      } else if (category === "residential" && meta?.rentalTerm === "short") {
        profile.maxRentRial = numericOrNull(meta?.shortMaxBudgetRial);
        profile.maxDepositRial = null;
        profile.pricePeriod = {night:"daily",week:"weekly",month:"monthly"}[meta?.shortRateUnit] || null;
      } else {
        profile.maxRentRial = numericOrNull(meta?.monthlyRent);
        profile.maxDepositRial = numericOrNull(meta?.deposit);
        profile.pricePeriod = "monthly";
      }
    } else if (category === "garden" && ["short","seasonal","long"].includes(meta?.rentalTerm)) {
      if(meta.rentalTerm==="short"){
        profile.maxRentRial=numericOrNull(meta.shortMaxBudgetRial);
        profile.maxDepositRial=null;
        profile.pricePeriod=periodOrNull(meta.shortRateUnit);
        profile.fields.shortSecurityHoldBudget=numericOrNull(meta.shortMaxSecurityHoldRial);
      }else if(meta.rentalTerm==="seasonal"){
        profile.maxRentRial=numericOrNull(meta.seasonalMaxBudgetRial);
        profile.maxDepositRial=null;
        profile.pricePeriod="seasonal";
        profile.fields.shortSecurityHoldBudget=numericOrNull(meta.seasonalMaxSecurityHoldRial);
      }else{
        profile.maxRentRial=meta.longFinancialMode==="full_deposit"?null:numericOrNull(meta.maxBudget);
        profile.maxDepositRial=meta.longFinancialMode==="rent_only"?null:numericOrNull(meta.maxDeposit);
        profile.pricePeriod=profile.maxRentRial?"monthly":null;
      }
    } else if(category === "other"){
      // A demand's ceiling is never the asking rate. Deposit and monthly rent stay separate.
      const term=meta?.rentalTerm;
      if(term==="short"){
        profile.pricePeriod=periodOrNull(meta?.pricePeriod);
        profile.maxRentRial=profile.pricePeriod?numericOrNull(meta?.maxBudget):null;
        profile.maxDepositRial=null;
      }else if(term==="long"){
        profile.pricePeriod="monthly";
        profile.maxRentRial=["deposit_rent","rent_only"].includes(meta?.financialMode)?numericOrNull(meta?.maxMonthlyRentRial):null;
        profile.maxDepositRial=["deposit_rent","full_deposit"].includes(meta?.financialMode)?numericOrNull(meta?.maxDepositRial):null;
      }else{
        profile.pricePeriod=null;profile.maxRentRial=null;profile.maxDepositRial=null;
      }
    } else if (category === "warehouse" && ["short","long"].includes(meta?.rentalTerm)) {
      const short=meta.rentalTerm==="short";
      profile.maxRentRial=short?numericOrNull(meta.maxBudgetRial):meta.financialMode==="full_deposit"?null:numericOrNull(meta.maxRentRial);
      profile.maxDepositRial=short||meta.financialMode==="rent_only"?null:numericOrNull(meta.maxDepositRial);
      profile.pricePeriod=short?({day:"daily",week:"weekly",month:"monthly"}[meta.shortRateUnit]||null):meta.financialMode==="full_deposit"?null:({month:"monthly",year:"yearly"}[meta.longRateUnit]||null);
      profile.fields.maxSecurityHoldRial=short?numericOrNull(meta.maxSecurityHoldRial):null;
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
