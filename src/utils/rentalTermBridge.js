/**
 * Phase RT-00: read-only bridge between approved Fazajoo listings and duration policy.
 * Does NOT change active matching, persistence, forms, payments, notifications or prices.
 * Unknown / legacy duration is never guessed from a monthly rate.
 */
import POLICY from "../../shared/rental-term-policy.v1.json" with { type: "json" };
import { validateRentalTermProfile, assessRentalTermAlignment, parseRialAmount } from "../../shared/rental-term-core.mjs";
import { readDemandMetadata } from "./spaceProfile.js";

const asObject = x => x && typeof x === "object" && !Array.isArray(x) ? x : {};
const OFFER_RATE_UNIT = Object.freeze({ daily: "night", weekly: "week", monthly: "month", yearly: "year" });
const GARDEN_DURATION = Object.freeze({ daily: "short", weekend: "short", seasonal: "seasonal", yearly: "long" });
const amount = n => {
  const v = parseRialAmount(n);
  return v !== null && v > 0 ? v : null;
};
const sideOf = listing => (listing?.listingType === "wanted" || listing?.listing_type === "wanted") ? "wanted" : "offer";
const typedValues = listing => {
  const attrs = listing?.spaceAttributes;
  return attrs?.schemaVersion === 1 && attrs.category === listing.category ? asObject(attrs.values) : {};
};

/**
 * Exposes an entirely optional typed term profile for auditing / future integration.
 * In this phase only approved *explicit* contract terms are mapped.
 * Wanted-side max budgets are ceilings and must never masquerade as owner prices.
 */
export function readRentalTermSnapshot(listing = {}, policy = POLICY) {
  const category = listing?.category;
  const side = sideOf(listing);
  const attrs = side === "offer" ? typedValues(listing) : {};
  const metadata = side === "wanted" ? asObject(readDemandMetadata(category, listing?.description)) : {};
  let primaryTerm = null;
  let canNegotiateOtherTerm = null;
  let source = "not_declared";
  let rateUnit = null;
  let rateAmountRial = null;
  let leaseDepositRial = null;
  let monthlyRentRial = null;
  let securityHoldRial = null;
  const notes = [];

  if (category === "villa") {
    // Exact villa Phase08C types. Never use a default to fill untyped older ads.
    const term = side === "offer" ? attrs.rentalTerm : metadata.rentalTerm;
    if (term === "short" || term === "long") {
      primaryTerm = term;
      source = side === "offer" ? "villa_offer_typed" : "villa_wanted_metadata";
      if (side === "offer") {
        canNegotiateOtherTerm = attrs.canNegotiateOtherTerm === true;
        if (term === "short") {
          securityHoldRial = amount(attrs.depositRial);
          rateUnit = OFFER_RATE_UNIT[listing.priceType] || null;
          if (rateUnit) rateAmountRial = amount(listing.price);
        } else {
          leaseDepositRial = amount(attrs.longDepositRial);
          monthlyRentRial = amount(attrs.longMonthlyRentRial);
          if (monthlyRentRial !== null) {
            rateUnit = "month";
            rateAmountRial = monthlyRentRial;
          }
        }
      } else if (term === "short") {
        // Request budget is not an offered rental price; keep amounts null.
        rateUnit = OFFER_RATE_UNIT[metadata.pricePeriod] || null;
      } else {
        // A long-term villa request budget is measured monthly.
        rateUnit = "month";
      }
    }
  } else if (category === "residential") {
    if (side === "offer" && attrs.rentalTerm === "short") {
      primaryTerm = "short";
      source = "residential_typed_short_contract";
      rateUnit = ["night","week","month"].includes(attrs.shortRateUnit) ? attrs.shortRateUnit : null;
      rateAmountRial = rateUnit ? amount(attrs.shortRateRial) : null;
      securityHoldRial = amount(attrs.securityHoldRial);
      canNegotiateOtherTerm = attrs.canNegotiateOtherTerm === true;
    } else if (side === "wanted" && ["short", "long"].includes(metadata.rentalTerm)) {
      primaryTerm = metadata.rentalTerm;
      source = "residential_wanted_metadata";
      rateUnit = primaryTerm === "short" ? (["night","week","month"].includes(metadata.shortRateUnit) ? metadata.shortRateUnit : null) : "month";
      // Budgets are not asking prices. No budget gets mapped into rateAmountRial.
    } else if (side === "offer") {
    // The existing residential offer form explicitly records one of three
    // LONG-TERM contract types. Legacy/untyped listings stay unknown.
    if (["full_deposit", "rent_only", "deposit_rent"].includes(attrs.financialMode)) {
      primaryTerm = "long";
      source = "residential_typed_long_contract";
      canNegotiateOtherTerm = attrs.canNegotiateOtherTerm === true;
      leaseDepositRial = amount(listing?.residentialDetails?.deposit);
      monthlyRentRial = amount(listing?.residentialDetails?.monthlyRent);
      if (attrs.financialMode === "full_deposit") monthlyRentRial = null;
      if (attrs.financialMode === "rent_only") leaseDepositRial = null;
      if (monthlyRentRial !== null) {
        rateUnit = "month";
        rateAmountRial = monthlyRentRial;
      }
    }
    }
  } else if(category==="other"){
    const term=side==="offer"?attrs.rentalTerm:metadata.rentalTerm;
    if(term==="short"||term==="long"){
      primaryTerm=term;
      source=side==="offer"?"other_typed_offer":"other_wanted_metadata";
      if(side==="offer"){
        canNegotiateOtherTerm=attrs.canNegotiateOtherTerm===true;
        if(term==="short"){
          rateUnit=({daily:"day",weekly:"week",monthly:"month"})[attrs.shortRateUnit]||null;
          rateAmountRial=rateUnit?amount(attrs.shortRateRial):null;
          securityHoldRial=amount(attrs.securityHoldRial);
        }else{
          leaseDepositRial=amount(attrs.longDepositRial);
          monthlyRentRial=amount(attrs.longMonthlyRentRial);
          if(monthlyRentRial!==null){rateUnit="month";rateAmountRial=monthlyRentRial;}
        }
      }else if(term==="short")rateUnit=({daily:"day",weekly:"week",monthly:"month"})[metadata.pricePeriod]||null;
      else rateUnit="month";
    }
  } else if (["parking", "storage", "warehouse", "shop", "land"].includes(category)) {
    // Five-category adapter to the EXACT SAME RT-00 validator used above.
    // Existing listings do not have these typed term fields; they remain unknown.
    // Do not infer a term from an old monthly price or a legacy "duration".
    const data = side === "offer" ? attrs : metadata;
    const special = category === "shop" && data.transferType === "key_money" ||
      category === "land" && (data.paymentType === "crop_share" || data.transactionKind === "crop_share");
    if (special) {
      source = "special_transaction_manual_review";
      notes.push(category === "shop" ? "shop_rights_transfer_requires_legal_review" : "land_crop_share_requires_manual_review");
    } else if (["short", "seasonal", "long"].includes(data.rentalTerm)) {
      primaryTerm = data.rentalTerm;
      source = side === "offer" ? "typed_five_category_offer" : "typed_five_category_wanted";
      const unitMap = { hourly: "hour", hour: "hour", daily: "day", day: "day",
        nightly: "night", night: "night", weekly: "week", week: "week",
        monthly: "month", month: "month", yearly: "year", year: "year",
        seasonal: "season", season: "season" };
      const convertUnit = value => unitMap[value] || null;
      if (side === "offer") {
        canNegotiateOtherTerm = data.canNegotiateOtherTerm === true;
        if (primaryTerm === "short") {
          rateUnit = convertUnit(data.shortRateUnit);
          rateAmountRial = rateUnit ? amount(data.shortRateRial) : null;
          securityHoldRial = amount(data.securityHoldRial);
        } else if (primaryTerm === "seasonal") {
          rateUnit = "season";
          rateAmountRial = amount(data.seasonalRateRial);
          securityHoldRial = amount(data.seasonalSecurityHoldRial);
        } else {
          const mode = data.financialMode;
          leaseDepositRial = mode === "rent_only" ? null : amount(data.longDepositRial);
          if (mode !== "full_deposit") {
            if (convertUnit(data.longRateUnit) === "year") {
              rateUnit = "year";
              rateAmountRial = amount(data.longYearlyRentRial);
            } else {
              monthlyRentRial = amount(data.longMonthlyRentRial);
              if (monthlyRentRial !== null) {
                rateUnit = "month";
                rateAmountRial = monthlyRentRial;
              }
            }
          }
        }
      } else if (primaryTerm === "short") {
        rateUnit = convertUnit(data.shortRateUnit || data.pricePeriod);
      } else if (primaryTerm === "seasonal") {
        rateUnit = "season";
      } else {
        rateUnit = convertUnit(data.longRateUnit) || "month";
      }
    }
  } else if (category === "garden") {
    const term=side==="offer"?attrs.rentalTerm:metadata.rentalTerm;
    if(["short","seasonal","long"].includes(term)){
      primaryTerm=term;
      source=side==="offer"?"garden_typed_offer":"garden_wanted_metadata";
      if(side==="offer"){
        canNegotiateOtherTerm=term==="seasonal"?false:attrs.canNegotiateOtherTerm===true;
        if(term==="short"){
          rateUnit=({daily:"day",weekly:"week",monthly:"month"})[attrs.shortRateUnit]||null;
          rateAmountRial=rateUnit?amount(attrs.shortRateRial):null;
          securityHoldRial=amount(attrs.securityHoldRial);
        }else if(term==="seasonal"){
          rateUnit="season";rateAmountRial=amount(attrs.seasonalRateRial);
          securityHoldRial=amount(attrs.seasonalSecurityHoldRial);
        }else{
          leaseDepositRial=attrs.financialMode==="rent_only"?null:amount(attrs.depositRial);
          monthlyRentRial=attrs.financialMode==="full_deposit"?null:amount(attrs.longMonthlyRentRial);
          if(monthlyRentRial!==null){rateUnit="month";rateAmountRial=monthlyRentRial;}
        }
      }else if(term==="short")rateUnit=({daily:"day",weekly:"week",monthly:"month"})[metadata.shortRateUnit]||null;
      else if(term==="seasonal")rateUnit="season";
      else rateUnit="month";
    }else if(side==="offer"){
      // Legacy explicit duration has no verified security/lease deposit kind.
      primaryTerm = GARDEN_DURATION[attrs.rentalDuration] || null;
      if (primaryTerm) {
        source = "garden_typed_duration";
        const genericUnit = ({daily:"day",weekly:"week",monthly:"month",yearly:"year"})[listing.priceType] || null;
        if (genericUnit && (policy.categories?.garden?.rateUnitsByTerm?.[primaryTerm] || []).includes(genericUnit)) {
          rateUnit = genericUnit;rateAmountRial=amount(listing.price);
        }
        if (attrs.depositRial != null) notes.push("garden_deposit_kind_requires_review");
      }
    }
  }

  const check = validateRentalTermProfile({category, side, primaryTerm, rateUnit,
    canNegotiateOtherTerm, rateAmountRial, leaseDepositRial, monthlyRentRial, securityHoldRial}, policy);
  return {
    profile: check.value,
    ok: check.ok,
    errors: [...check.errors],
    source,
    notes,
    liveMatchingUpdated: false,
  };
}

/** This is ONLY a rental-term signal, never the real listing match verdict. */
export function inspectListingRentalAlignment(offerListing, wantedListing, policy = POLICY) {
  const offer = readRentalTermSnapshot(offerListing, policy);
  const wanted = readRentalTermSnapshot(wantedListing, policy);
  // A malformed typed contract is never an eligible match, even if its term
  // strings happen to agree. Prevent false positives before any live wiring.
  if (!offer.ok || !wanted.ok) return {
    status: "needs_review", reason: "invalid_term_profile", scope: "term_only",
    provenance: [offer.source, wanted.source], liveMatchingUpdated: false,
  };
  const result = assessRentalTermAlignment(offer.profile, wanted.profile, policy);
  return { ...result, provenance: [offer.source, wanted.source], liveMatchingUpdated: false };
}
