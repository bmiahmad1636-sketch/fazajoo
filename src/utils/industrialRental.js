/** F5-03: warehouse/shed/workshop typed contract adapter using the EXISTING RT-00.
 * No second matching engine. Physical details always survive contract switches.
 */
import POLICY from "../../shared/rental-term-policy.v1.json" with { type: "json" };
import { getRentalOptions, parseRialAmount, validateRentalTermProfile } from "../../shared/rental-term-core.mjs";
import {
  STORAGE_RENTAL_OPTIONS, STORAGE_RENTAL_DEFAULT, STORAGE_WANTED_FINANCE_DEFAULT,
  pickStorageRental, changeStorageTerm, changeStorageMode, changeStorageUnit,
  validateStorageRental, storageListingPrice, storageFinancialRows,
  storageMoneyRows, storageFinancialHeadline,
} from "./storageRental.js";
export const INDUSTRIAL_RENTAL_OPTIONS=getRentalOptions(POLICY,"warehouse");
if(!INDUSTRIAL_RENTAL_OPTIONS ||
  JSON.stringify(INDUSTRIAL_RENTAL_OPTIONS.rateUnitsByTerm)!==JSON.stringify(STORAGE_RENTAL_OPTIONS.rateUnitsByTerm) ||
  JSON.stringify(INDUSTRIAL_RENTAL_OPTIONS.terms)!==JSON.stringify(STORAGE_RENTAL_OPTIONS.terms)) {
  throw new Error("Industrial/warehouse RT-00 rental policy must be adapted before diverging from storage periods");
}
export const INDUSTRIAL_RENTAL_DEFAULT=Object.freeze({...STORAGE_RENTAL_DEFAULT});
export const INDUSTRIAL_WANTED_FINANCE_DEFAULT=Object.freeze({...STORAGE_WANTED_FINANCE_DEFAULT});
export const pickIndustrialRental=pickStorageRental;
export const changeIndustrialTerm=changeStorageTerm;
export const changeIndustrialMode=changeStorageMode;
export const changeIndustrialUnit=changeStorageUnit;
export function validateIndustrialRental(values,wanted=false){
  const original=validateStorageRental(values,wanted);
  if(original)return original.replaceAll("انبار","سوله یا کارگاه");
  const v=pickIndustrialRental(values,wanted);
  const long=v.rentalTerm==="long", unit=long?v.longRateUnit:v.shortRateUnit;
  const amount=x=>{ const n=parseRialAmount(x);return n!==null&&n>0?n:null;};
  const rent=long?(wanted?v.maxRentRial:unit==="year"?v.longYearlyRentRial:v.longMonthlyRentRial):wanted?v.maxBudgetRial:v.shortRateRial;
  const check=validateRentalTermProfile({category:"warehouse",side:wanted?"wanted":"offer",primaryTerm:v.rentalTerm,rateUnit:unit,
    canNegotiateOtherTerm:wanted?null:v.canNegotiateOtherTerm,
    rateAmountRial:long&&v.financialMode==="full_deposit"?null:amount(rent),
    leaseDepositRial:long&&v.financialMode!=="rent_only"&&!wanted?amount(v.longDepositRial):null,
    securityHoldRial:!long&&!wanted?amount(v.securityHoldRial):null,
    monthlyRentRial:long&&unit==="month"&&v.financialMode!=="full_deposit"&&!wanted?amount(v.longMonthlyRentRial):null,
  },POLICY,{requireTerm:true});
  return check.ok?"":"قرارداد سوله یا کارگاه با استاندارد مشترک فضاجو سازگار نیست.";
}
export const industrialListingPrice=storageListingPrice;
export const industrialFinancialRows=storageFinancialRows;
export const industrialMoneyRows=storageMoneyRows;
export const industrialFinancialHeadline=storageFinancialHeadline;
