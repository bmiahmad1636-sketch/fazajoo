/**
 * Fazajoo rental-term foundation, v1. Pure ESM, no side effects, no data migration.
 * Its result is only a term-alignment signal, NEVER a complete smart-search match.
 * Both browser and server can pass the same policy JSON to these pure functions.
 */
export const RENTAL_TERM_SCHEMA_VERSION = 1;
const TERM_SHORT = 'short';
const TERM_LONG = 'long';
const TERM_SEASONAL = 'seasonal';
const YES = 'compatible_term';
const REVIEW = 'needs_review';
const NO = 'incompatible_term';

const asObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const sameCategory = (left, right) => typeof left === 'string' && left === right;

export function getRentalOptions(policy, category) {
  const entry = asObject(policy?.categories)[category];
  if (!entry) return null;
  return {
    category,
    terms: [...entry.terms],
    rateUnitsByTerm: Object.fromEntries(
      Object.entries(entry.rateUnitsByTerm).map(([k, v]) => [k, [...v]])
    ),
    manualReviewRequired: entry.manualReviewRequired === true
  };
}

/** Reject invalid amounts. Missing = null. Zero stays zero; no guessed "negotiable". */
export function parseRialAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const digits = value.trim()
    .replace(/[۰-۹]/g, char => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char)))
    .replace(/[٠-٩]/g, char => String('٠١٢٣٤٥٦٧٨٩'.indexOf(char)))
    .replace(/[٬,\s]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const num = Number(digits);
  return Number.isSafeInteger(num) ? num : null;
}

/**
 * Validates only the new duration profile; does not touch legacy listing columns.
 * Primary term is null for legacy/unknown, never guessed from rate unit.
 */
export function validateRentalTermProfile(raw, policy, { requireTerm = false } = {}) {
  const value = asObject(raw);
  const errors = [];
  const category = typeof value.category === 'string' ? value.category : null;
  const available = getRentalOptions(policy, category);
  if (!available) errors.push('unknown_category');

  const side = value.side === 'offer' || value.side === 'wanted' ? value.side : null;
  if (!side) errors.push('invalid_side');

  const term = value.primaryTerm === undefined || value.primaryTerm === null || value.primaryTerm === ''
    ? null : value.primaryTerm;
  if (requireTerm && !term) errors.push('term_required');
  if (term !== null && (!available || !available.terms.includes(term))) errors.push('term_not_allowed');

  const unit = value.rateUnit === undefined || value.rateUnit === null || value.rateUnit === ''
    ? null : value.rateUnit;
  if (unit !== null && (term === null || !available?.rateUnitsByTerm[term]?.includes(unit))) {
    errors.push('rate_unit_not_allowed_for_term');
  }

  const consent = value.canNegotiateOtherTerm === undefined || value.canNegotiateOtherTerm === null
    ? null : value.canNegotiateOtherTerm;
  if (consent !== null && typeof consent !== 'boolean') errors.push('consent_must_be_boolean');
  if (consent === true && (side !== 'offer' || ![TERM_SHORT, TERM_LONG].includes(term) || !available?.terms.includes(term === TERM_SHORT ? TERM_LONG : TERM_SHORT))) {
    errors.push('alternative_consent_not_allowed');
  }

  const amounts = {};
  for (const key of ['rateAmountRial', 'leaseDepositRial', 'securityHoldRial', 'monthlyRentRial']) {
    const rawAmount = value[key];
    if (rawAmount !== null && rawAmount !== undefined && rawAmount !== '' && parseRialAmount(rawAmount) === null) {
      errors.push(`invalid_${key}`);
    }
    amounts[key] = parseRialAmount(rawAmount);
  }
  // Contract deposit is only a long-term concept. A damage/security hold is not a mortgage/deposit.
  if (amounts.leaseDepositRial !== null && term !== TERM_LONG) errors.push('lease_deposit_requires_long_term');
  if (amounts.monthlyRentRial !== null && term !== TERM_LONG) errors.push('monthly_rent_requires_long_term');
  // A seasonal damage/security hold is a supported explicit contract concept
  // for categories that permit seasonal rentals (e.g. garden and land). It is
  // NEVER a long-term lease deposit and must not be inferred from legacy data.
  const seasonalHoldAllowed = term === TERM_SEASONAL &&
    available?.terms.includes(TERM_SEASONAL) &&
    available?.rateUnitsByTerm?.[TERM_SEASONAL]?.includes('season');
  if (amounts.securityHoldRial !== null && term !== TERM_SHORT && !seasonalHoldAllowed) {
    errors.push('security_hold_requires_short_term');
  }
  if (amounts.rateAmountRial !== null && !unit) errors.push('rate_unit_required_for_rate_amount');

  return {
    ok: errors.length === 0,
    errors,
    value: {
      schemaVersion: RENTAL_TERM_SCHEMA_VERSION,
      category,
      side,
      primaryTerm: term,
      rateUnit: unit,
      canNegotiateOtherTerm: consent,
      ...amounts
    }
  };
}

/**
 * Inspect duration only. Matching by city, subtype, price, area and permissions belongs
 * to existing matching engine. An alternate term always requires owner negotiation.
 */
export function assessRentalTermAlignment(offer, wanted, policy) {
  const a = asObject(offer);
  const b = asObject(wanted);
  const result = (status, reason) => ({ status, reason, scope: 'term_only' });
  if (!getRentalOptions(policy, a.category) || !getRentalOptions(policy, b.category)) {
    return result(REVIEW, 'unknown_category');
  }
  if (!sameCategory(a.category, b.category)) return result(NO, 'different_category');
  if (!a.primaryTerm || !b.primaryTerm) return result(REVIEW, 'unknown_legacy_term');
  const options = getRentalOptions(policy, a.category);
  if (!options.terms.includes(a.primaryTerm) || !options.terms.includes(b.primaryTerm)) {
    return result(REVIEW, 'unrecognized_term');
  }
  if (a.primaryTerm !== b.primaryTerm) {
    if (a.canNegotiateOtherTerm === true && [TERM_SHORT, TERM_LONG].includes(a.primaryTerm) &&
        [TERM_SHORT, TERM_LONG].includes(b.primaryTerm)) {
      return result(REVIEW, 'alternative_requires_owner_agreement');
    }
    return result(NO, 'term_mismatch');
  }
  if (options.manualReviewRequired) return result(REVIEW, 'other_category_requires_review');
  if (b.rateUnit && a.rateUnit && a.rateUnit !== b.rateUnit) {
    return result(REVIEW, 'price_unit_not_directly_comparable');
  }
  if (b.rateUnit && !a.rateUnit) return result(REVIEW, 'offer_rate_unit_unknown');
  return result(YES, 'same_primary_term');
}

export function getTermBadgeState(offer, policy) {
  const p = asObject(offer);
  const conf = getRentalOptions(policy, p.category);
  if (!conf || ![TERM_SHORT, TERM_LONG].includes(p.primaryTerm)) return null;
  const alternate = p.primaryTerm === TERM_SHORT ? TERM_LONG : TERM_SHORT;
  if (!conf.terms.includes(alternate)) return null;
  return {
    primary: { term: p.primaryTerm, checkmarks: 2, active: true },
    alternative: { term: alternate, checkmarks: p.canNegotiateOtherTerm === true ? 1 : 0,
      active: p.canNegotiateOtherTerm === true, negotiationOnly: true }
  };
}
