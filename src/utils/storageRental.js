/** F5-02. Typed storage adapter of the existing RT-00 policy, NOT a second matching engine. */
import POLICY from "../../shared/rental-term-policy.v1.json" with { type: "json" };
import { getRentalOptions, parseRialAmount, validateRentalTermProfile } from "../../shared/rental-term-core.mjs";
import {
  PARKING_RENTAL_DEFAULT, PARKING_WANTED_FINANCE_DEFAULT,
  validateParkingRentalOffer, validateParkingRentalRequest, parkingListingPrice,
  parkingFinancialRows, parkingMoneyRows, parkingFinancialHeadline,
  changeParkingRentalTerm, changeParkingFinancialMode, changeParkingRateUnit,
} from "./parkingRental.js";

export const STORAGE_RENTAL_OPTIONS = getRentalOptions(POLICY, "storage");
if (!STORAGE_RENTAL_OPTIONS || !["day","week"].every(u=>STORAGE_RENTAL_OPTIONS.rateUnitsByTerm.short.includes(u))) {
  throw new Error("Storage duration policy missing in RT-00");
}
export const STORAGE_RENTAL_DEFAULT = Object.freeze({ ...PARKING_RENTAL_DEFAULT });
export const STORAGE_WANTED_FINANCE_DEFAULT = Object.freeze({ ...PARKING_WANTED_FINANCE_DEFAULT });
const isUnit = (term, unit) => STORAGE_RENTAL_OPTIONS.rateUnitsByTerm[term]?.includes(unit) === true;
const rial = value => { const n=parseRialAmount(value); return n !== null && n > 0 ? n : null; };
/** Only the chosen contract can carry amounts. Switching terms/modes never leaks stale money. */
export function pickStorageRental(values={}, wanted=false) {
  const defaults = wanted ? STORAGE_WANTED_FINANCE_DEFAULT : STORAGE_RENTAL_DEFAULT;
  const v={ ...defaults, ...(values && typeof values==="object" ? values : {}) };
  const result={...defaults};
  if (!STORAGE_RENTAL_OPTIONS.terms.includes(v.rentalTerm)) return result;
  result.rentalTerm=v.rentalTerm;
  if (v.rentalTerm==="short") {
    result.shortRateUnit=isUnit("short",v.shortRateUnit)?v.shortRateUnit:"day";
    if(wanted){ result.maxBudgetRial=v.maxBudgetRial??""; result.maxSecurityHoldRial=v.maxSecurityHoldRial??""; }
    else { result.shortRateRial=v.shortRateRial??""; result.securityHoldRial=v.securityHoldRial??""; }
  } else {
    result.financialMode=["rent_only","deposit_rent","full_deposit"].includes(v.financialMode)?v.financialMode:"";
    result.longRateUnit=isUnit("long",v.longRateUnit)?v.longRateUnit:"month";
    if (result.financialMode!=="rent_only") {
      if(wanted)result.maxDepositRial=v.maxDepositRial??"";
      else result.longDepositRial=v.longDepositRial??"";
    }
    if (result.financialMode!=="full_deposit") {
      if(wanted)result.maxRentRial=v.maxRentRial??"";
      else if(result.longRateUnit==="year")result.longYearlyRentRial=v.longYearlyRentRial??"";
      else result.longMonthlyRentRial=v.longMonthlyRentRial??"";
    }
  }
  if(!wanted) result.canNegotiateOtherTerm=v.canNegotiateOtherTerm===true;
  return result;
}
/** Keep storage-specific physical/request details on contract edits.
 * Only the financial subset is normalized; inactive money is still cleared.
 * Do not use pickStorageRental's finance-only result as the whole form value.
 */
const withStorageDetails = (values, finance) => ({ ...values, ...finance });
export const changeStorageTerm=(v,term,wanted=false)=>withStorageDetails(v,pickStorageRental(changeParkingRentalTerm(v,term,wanted),wanted));
export const changeStorageMode=(v,mode,wanted=false)=>withStorageDetails(v,pickStorageRental(changeParkingFinancialMode(v,mode,wanted),wanted));
export const changeStorageUnit=(v,unit,wanted=false)=>{
  if(!isUnit(v.rentalTerm,unit))return withStorageDetails(v,pickStorageRental(v,wanted));
  // The parking change helper rejects short/month by parking policy; storage must
  // use its own RT-00 permitted units, retaining category-specific attributes.
  const changed=v.rentalTerm==="short"
    ? {...v,shortRateUnit:unit,...(wanted?{maxBudgetRial:""}:{shortRateRial:""})}
    : changeParkingRateUnit(v,unit,wanted);
  return withStorageDetails(v,pickStorageRental(changed,wanted));
};
export function validateStorageRental(values,wanted=false){
  const v=pickStorageRental(values,wanted);
  const rawTerm=values?.rentalTerm;
  if (STORAGE_RENTAL_OPTIONS.terms.includes(rawTerm) && !isUnit(rawTerm, rawTerm === "short" ? values?.shortRateUnit : values?.longRateUnit))
    return "دوره محاسبه اجاره انبار معتبر نیست.";
  if(!v.rentalTerm) return "مدت اصلی قرارداد انبار را انتخاب کنید.";
  if(!isUnit(v.rentalTerm, v.rentalTerm==="short"?v.shortRateUnit:v.longRateUnit))return "دوره محاسبه اجاره انبار معتبر نیست.";
  const parkingError=wanted?validateParkingRentalRequest(v,true,"storage"):validateParkingRentalOffer(v,true,"storage");
  if(parkingError)return parkingError.replaceAll("پارکینگ","انبار");
  const long=v.rentalTerm==="long";
  const unit=long?v.longRateUnit:v.shortRateUnit;
  const rent=long?(wanted?v.maxRentRial:(unit==="year"?v.longYearlyRentRial:v.longMonthlyRentRial)):(wanted?v.maxBudgetRial:v.shortRateRial);
  const profile=validateRentalTermProfile({category:"storage",side:wanted?"wanted":"offer",
    primaryTerm:v.rentalTerm,rateUnit:unit,canNegotiateOtherTerm:wanted?null:v.canNegotiateOtherTerm,
    rateAmountRial:long&&v.financialMode==="full_deposit"?null:rial(rent),
    leaseDepositRial:long&&v.financialMode!=="rent_only"?(wanted?null:rial(v.longDepositRial)):null,
    securityHoldRial:!long&&!wanted?rial(v.securityHoldRial):null,
    monthlyRentRial:long&&unit==="month"&&v.financialMode!=="full_deposit"&&!wanted?rial(v.longMonthlyRentRial):null,
  },POLICY,{requireTerm:true});
  return profile.ok?"":"قرارداد انبار با استاندارد مشترک فضاجو سازگار نیست.";
}
export const storageListingPrice=(v,wanted=false)=>parkingListingPrice(pickStorageRental(v,wanted),wanted) || {price:"",priceType:"negotiable"};
export const storageFinancialRows=(v,wanted=false)=>parkingFinancialRows(pickStorageRental(v,wanted),wanted);
export const storageMoneyRows=(v,wanted=false)=>parkingMoneyRows(pickStorageRental(v,wanted),wanted);
export const storageFinancialHeadline=(v,wanted=false)=>parkingFinancialHeadline(pickStorageRental(v,wanted),wanted);
