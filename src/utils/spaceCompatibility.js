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
  // A possible alternative term has no verified alternate pricing.
  const villaOtherTermReview = wanted.category === "villa" &&
    Boolean(wanted.fields?.villaRentalTerm && offer.fields?.rentalTerm) &&
    wanted.fields.villaRentalTerm !== offer.fields.rentalTerm &&
    offer.fields.canNegotiateOtherTerm === true;
  if (villaOtherTermReview) unknown.push("villa-alternative-term-price-and-contract-review");
  // Explicit residential term mismatches never become confirmed financial matches.
  const residentialWantedTerm = wanted.category === "residential" ? wanted.fields?.residentialRentalTerm : null;
  const residentialOfferTerm = wanted.category === "residential" ? offer.fields?.rentalTerm : null;
  const residentialOtherTermReview = Boolean(residentialWantedTerm && residentialOfferTerm &&
    residentialWantedTerm !== residentialOfferTerm && offer.fields?.canNegotiateOtherTerm === true);
  if (residentialOtherTermReview) unknown.push("residential-alternative-term-price-and-contract-review");
  if (wanted.category === "residential") {
    if (!residentialWantedTerm || !residentialOfferTerm) unknown.push("residential-term-unknown");
    else if (residentialWantedTerm !== residentialOfferTerm && !residentialOtherTermReview) conflicts.push("residential-rental-term");
    else if (residentialWantedTerm === residentialOfferTerm) matched.push("residential-rental-term");
  }
  const otherWantedTerm=wanted.category==="other"?wanted.fields?.otherRentalTerm:null;
  const otherOfferTerm=wanted.category==="other"?offer.fields?.rentalTerm:null;
  const otherAlternativeReview=Boolean(otherWantedTerm&&otherOfferTerm&&otherWantedTerm!==otherOfferTerm&&offer.fields?.canNegotiateOtherTerm===true);
  if(wanted.category==="other"){
    if(!otherWantedTerm||!otherOfferTerm)unknown.push("other-term-unknown-or-negotiable");
    else if(otherWantedTerm!==otherOfferTerm){
      if(otherAlternativeReview)unknown.push("other-alternative-term-and-price-review");
      else conflicts.push("other-rental-term");
    } else matched.push("other-rental-term");
  }
  // F5-03: typed industrial contracts cannot match across primary terms.
  // Alternative owner consent signals *manual review*, not confirmed pricing.
  const industrialWantedTerm=wanted.category==="warehouse"?wanted.fields?.industrialRentalTerm:null;
  const industrialOfferTerm=wanted.category==="warehouse"?offer.fields?.rentalTerm:null;
  const industrialAlternativeReview=Boolean(industrialWantedTerm&&industrialOfferTerm&&
    industrialWantedTerm!==industrialOfferTerm&&offer.fields?.canNegotiateOtherTerm===true);
  if(industrialWantedTerm&&industrialOfferTerm){
    if(industrialWantedTerm!==industrialOfferTerm){
      if(industrialAlternativeReview)unknown.push("industrial-alternative-term-price-and-contract-review");
      else conflicts.push("industrial-rental-term");
    }else matched.push("industrial-rental-term");
  }
  // F5-04: shop leases use exactly the same duration meaning as RT-00.
  // A landlord's willingness to negotiate another term is NOT a priced match.
  const shopWantedTerm=wanted.category==="shop"&&wanted.fields?.transferType!=="key_money"?wanted.fields?.shopRentalTerm:null;
  const shopOfferTerm=wanted.category==="shop"&&offer.fields?.transferType!=="key_money"?offer.fields?.rentalTerm:null;
  const shopAlternativeReview=Boolean(shopWantedTerm&&shopOfferTerm&&shopWantedTerm!==shopOfferTerm&&offer.fields?.canNegotiateOtherTerm===true);
  if(wanted.category==="shop"&&wanted.fields?.transferType!=="key_money"){
    if(!shopWantedTerm||!shopOfferTerm)unknown.push("shop-rental-term-unknown");
    else if(shopWantedTerm!==shopOfferTerm){
      if(shopAlternativeReview)unknown.push("shop-alternative-term-and-price-review");
      else conflicts.push("shop-rental-term");
    }else matched.push("shop-rental-term");
  }
  const gardenWantedContract=wanted.category==="garden"?wanted.fields?.gardenRentalTerm:null;
  const gardenOfferContract=wanted.category==="garden"?offer.fields?.gardenRentalTerm:null;
  const gardenFinancialReview=wanted.category==="garden"&&Boolean(gardenWantedContract||gardenOfferContract)&&(!gardenWantedContract||!gardenOfferContract||gardenWantedContract!==gardenOfferContract);
  const deferContractMoney = shopAlternativeReview || Boolean(shopWantedTerm&&shopOfferTerm&&shopWantedTerm!==shopOfferTerm) || industrialAlternativeReview || Boolean(industrialWantedTerm&&industrialOfferTerm&&industrialWantedTerm!==industrialOfferTerm) || gardenFinancialReview || otherAlternativeReview || Boolean(otherWantedTerm&&otherOfferTerm&&otherWantedTerm!==otherOfferTerm) || villaOtherTermReview || residentialOtherTermReview ||
    Boolean(residentialWantedTerm && residentialOfferTerm && residentialWantedTerm !== residentialOfferTerm);
  // Two amounts with different periods (or unverified alternative conditions) cannot be compared.
  if (!deferContractMoney && wanted.maxDepositRial !== null) requireCheck("deposit-irr", wanted.maxDepositRial, offer.depositRial, (need, actual) => actual <= need);
  if (!deferContractMoney && wanted.maxRentRial !== null) {
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
    // "other" is free text on both sides: identical IDs do not prove identical property types.
    if (fields.propertyType === "other") unknown.push("residential-other-type-review");
    else requireCheck("residential-type", fields.propertyType, available.propertyType);
  } else if (wanted.category === "storage" || wanted.category === "warehouse" || wanted.category === "shop") {
    if(wanted.category==="shop"&&(fields.spaceType==="other"||available.spaceType==="other")){
      unknown.push("shop-other-space-type-review");
    }else requireCheck("space-type", fields.spaceType, available.spaceType);
    if (wanted.category === "storage") {
      requireCheck("storage-access", fields.access, available.access, (need, actual) => actual === "24h" || actual === need);
      if (fields.purpose === "other") unknown.push("storage-other-purpose-review");
      else requireCheck("storage-purpose", fields.purpose, available.allowedPurposes, (need, actual) => Array.isArray(actual) && actual.includes(need));
    }
    if (wanted.category === "shop") {
      requireCheck("shop-transfer",fields.transferType,available.transferType);
      if(fields.activity === "other") unknown.push("shop-other-activity-review");
      else requireCheck("shop-activity",fields.activity,available.allowedActivities,(need,actual)=>Array.isArray(actual)&&actual.includes(need));
      requireCheck("shop-floor",fields.shopFloor,available.floor);
      requireCheck("shop-location",fields.shopLocation,available.locationPreference);
      if(fields.shopFrontage != null) requireCheck("shop-frontage",fields.shopFrontage,available.frontageM,(need,actual)=>Number(actual)>=need);
      if(fields.transferType==="key_money"){
        requireCheck("shop-rights-kind",fields.rightsType,available.rightsType);
        if(fields.keyMoneyRial!=null)requireCheck("shop-key-money-budget",fields.keyMoneyRial,available.keyMoneyRial,(need,actual)=>actual<=need);
        unknown.push("shop-commercial-rights-legal-review");
      }
      if(fields.activity)unknown.push("shop-business-permit-review");
    }
    if (wanted.category === "warehouse") {
      // Contract duration and prose constraints cannot be inferred from physical features.
      if (fields.leaseDuration) unknown.push("industrial-duration-review");
      if (fields.specialConditions) unknown.push("industrial-special-conditions-review");
      // "other" means open-ended free text. Never declare it compatible by ID alone.
      if (fields.activity === "other") unknown.push("industrial-other-activity-review");
      else requireCheck("industrial-activity", fields.activity, available.allowedActivities, (need, actual) => Array.isArray(actual) && actual.includes(need));
      requireCheck("industrial-min-height", fields.minHeightM, available.heightM, (need, actual) => actual >= need);
      requireCheck("industrial-power", fields.power, available.power, (need, actual) => need === actual || actual === "both");
      if (fields.power === "three" && fields.powerCapacityKw != null) {
        requireCheck("industrial-power-capacity", fields.powerCapacityKw, available.powerCapacityKw, (need, actual) => actual >= need);
      }
      requireCheck("industrial-vehicle-access", fields.vehicleAccess, available.vehicleAccess, (need, actual) => ["van", "truck", "trailer"].indexOf(actual) >= ["van", "truck", "trailer"].indexOf(need));
    }
  }
  if (wanted.category === "garden") {
    const needTerm=fields.gardenRentalTerm;
    const ownerTerm=available.gardenRentalTerm;
    const alternative=needTerm&&ownerTerm&&needTerm!==ownerTerm&&
       needTerm!=="seasonal"&&ownerTerm!=="seasonal"&&available.canNegotiateOtherTerm===true;
    if(!needTerm||!ownerTerm)unknown.push("garden-term-unknown");
    else if(needTerm!==ownerTerm){if(alternative)unknown.push("garden-alternative-term-and-pricing-review");else conflicts.push("garden-rental-term");}
    else matched.push("garden-rental-term");
    if(needTerm&&ownerTerm&&(alternative||needTerm!==ownerTerm))unknown.push("garden-contract-pricing-not-comparable");
    if (fields.purpose === "other") unknown.push("garden-other-purpose-review");
    else requireCheck("garden-purpose", fields.purpose, available.allowedPurposes, (need, actual) => Array.isArray(actual) && actual.includes(need));
    if (fields.purpose === "event") unknown.push("garden-event-legal-review");
    if (!fields.gardenRentalTerm && fields.gardenDuration && fields.gardenDuration !== "flexible") {
      if (fields.gardenDuration === "weekend" && available.rentalDuration === "daily") unknown.push("garden-weekend-review");
      else requireCheck("garden-duration",fields.gardenDuration,available.rentalDuration,(need,actual)=>actual === "flexible" || actual === need);
    }
    if (fields.gardenPrivacyRequired) requireCheck("garden-privacy","private",available.privacy === "unknown" ? null : available.privacy);
    if (fields.gardenWaterPreference && fields.gardenWaterPreference !== "any") {
      const need=fields.gardenWaterPreference;
      const actual=available.waterSource;
      // Unknown water sources or broad preferences must not be turned into false exact matches.
      if (need === "available") {
        if (actual === null || actual === undefined) unknown.push("garden-water");
        else if (actual === "none") conflicts.push("garden-water");
        else matched.push("garden-water");
      } else if (need === "well" || need === "right" || need === "network") requireCheck("garden-water",need,actual);
    }
  }
  if (wanted.category === "land") {
    // 'Other' is free text; checking the ID alone would be a false positive.
    if (fields.primaryPurpose === "other") unknown.push("land-other-purpose-review");
    else requireCheck("land-purpose", fields.primaryPurpose, available.allowedPurposes, (need, actual) => Array.isArray(actual) && actual.includes(need));
    requireCheck("land-legal-use", fields.legalUse, available.legalUse === "other" ? null : available.legalUse);
    requireCheck("land-location-type", fields.locationType, available.locationType);
    // A landlord's advertised activity is never equivalent to a land-use permit.
    if (fields.primaryPurpose) unknown.push("land-permit-review");
  }
  if (wanted.category === "villa") {
    // Do not compare an overnight holiday rate to a long-term monthly contract.
    const offerTerm=available.rentalTerm||(Array.isArray(available.availableStays)&&available.availableStays.length?"short":null);
    const wantedTerm=fields.villaRentalTerm||(fields.villaStayType?"short":null);
    if(!villaOtherTermReview)requireCheck("villa-rental-term",wantedTerm,offerTerm);
    if(wantedTerm==="long"&&offerTerm==="long")requireCheck("villa-contract-mode",fields.villaFinancialMode,available.financialMode);
    if (fields.accommodationType === "other") unknown.push("villa-other-type-review");
    else requireCheck("villa-type", fields.accommodationType, available.accommodationType);
    if (fields.villaPrivacyRequired) requireCheck("villa-privacy","private",available.privacy);
    if (!villaOtherTermReview && wantedTerm!=="long" && fields.villaStayType && fields.villaStayType !== "flexible") {
      const stays = available.availableStays;
      // Weekend vs daily is not automatically equivalent; needs owner confirmation.
      if (fields.villaStayType === "weekend" && Array.isArray(stays) && stays.includes("daily") && !stays.includes("weekend") && !stays.includes("flexible")) unknown.push("villa-weekend-review");
      else requireCheck("villa-stay",fields.villaStayType,stays,(need,actual)=>Array.isArray(actual)&&(actual.includes(need)||actual.includes("flexible")));
    }
  }
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
