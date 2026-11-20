/* Fazajoo DS09/DS10 — financial presentation policy.
   DS10 aligns all 9 supply/demand categories: money decisions happen on step one.
   Short-term villa rental rate remains in the legacy price/priceType fields
   for backward-compatible API persistence, but the controls live on step one.
   Deposits are separate from rental rates. */
import { villaFinancialHeadline, villaFinancialRows } from './villaOffer.js';

export const LISTING_FINAL_CATEGORIES = Object.freeze([
  'parking', 'storage', 'warehouse', 'shop', 'land',
  'residential', 'villa', 'garden', 'other',
]);

export function shouldAskGenericPriceAtFinalStep(_category, _isWanted, _villaTerm = '') {
  // Kept as a compatibility export for DS09 tests and consumers.
  // No category asks for an additional rental rate on the final step.
  return false;
}

export function shouldAskVillaShortRateAtFirstStep(category, isWanted, villaTerm = '') {
  return category === 'villa' && !isWanted && villaTerm !== 'long';
}

export function validateVillaShortRate(price, priceType) {
  if (priceType === 'negotiable') return '';
  if (!['daily', 'weekly', 'monthly'].includes(priceType)) {
    return 'دوره محاسبه هزینه اقامت را انتخاب کن.';
  }
  if (cleanMoney(price) === null) {
    return 'مبلغ اقامت کوتاه‌مدت ویلا را در همین مرحله به ریال وارد کن یا توافقی را انتخاب کن.';
  }
  return '';
}

function cleanMoney(raw) {
  const normalized = String(raw ?? '').trim()
    .replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[٬,\s]/g, '');
  return /^\d{1,15}$/.test(normalized) && Number(normalized) > 0
    ? Number(normalized) : null;
}

/** Draft preview must distinguish a short-stay rental rate not yet entered
 * from a refundable security deposit already entered on the first step. */
export function villaOfferPreviewAtFinalStep(attributes, price = '', priceType = 'daily') {
  if (attributes?.schemaVersion !== 1 || attributes?.category !== 'villa') return '';
  if (attributes.values?.rentalTerm !== 'short' || priceType === 'negotiable' || cleanMoney(price) !== null) {
    return villaFinancialHeadline(attributes, price, priceType);
  }
  const period = { daily: 'شبانه', weekly: 'هفتگی', monthly: 'ماهانه' }[priceType];
  const first = period ? `هزینه اقامت ${period}: هنوز وارد نشده` : 'هزینه اقامت: هنوز وارد نشده';
  const deposit = villaFinancialRows(attributes, '', priceType).find(row => row.label.startsWith('ودیعه'));
  return deposit ? `${first} • ${deposit.label}: ${deposit.amount}` : first;
}
