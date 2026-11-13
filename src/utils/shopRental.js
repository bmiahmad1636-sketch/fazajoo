/** F5-04: shop lease adapter of EXISTING RT-00. Commercial rights are NOT rentals. */
import POLICY from "../../shared/rental-term-policy.v1.json" with {type:"json"};
import {getRentalOptions,parseRialAmount,validateRentalTermProfile} from "../../shared/rental-term-core.mjs";
import {STORAGE_RENTAL_OPTIONS,STORAGE_RENTAL_DEFAULT,STORAGE_WANTED_FINANCE_DEFAULT,
 pickStorageRental,changeStorageTerm,changeStorageMode,changeStorageUnit,
 validateStorageRental,storageListingPrice,storageMoneyRows,storageFinancialRows,storageFinancialHeadline} from "./storageRental.js";
export const SHOP_RENTAL_OPTIONS=getRentalOptions(POLICY,"shop");
if(!SHOP_RENTAL_OPTIONS || JSON.stringify(SHOP_RENTAL_OPTIONS.rateUnitsByTerm)!==JSON.stringify(STORAGE_RENTAL_OPTIONS.rateUnitsByTerm)
 || JSON.stringify(SHOP_RENTAL_OPTIONS.terms)!==JSON.stringify(STORAGE_RENTAL_OPTIONS.terms)) throw Error("Adapt F5-04 to RT-00 shop policy before changing rates");
export const SHOP_RENTAL_DEFAULT=Object.freeze({...STORAGE_RENTAL_DEFAULT});
export const SHOP_WANTED_FINANCE_DEFAULT=Object.freeze({...STORAGE_WANTED_FINANCE_DEFAULT});
export const pickShopRental=pickStorageRental;
export const changeShopTerm=changeStorageTerm;
export const changeShopMode=changeStorageMode;
export const changeShopUnit=changeStorageUnit;
export function validateShopRental(v={},wanted=false){
 const base=validateStorageRental(v,wanted);
 if(base)return base.replaceAll("انبار","مغازه یا فضای تجاری");
 const r=pickShopRental(v,wanted),long=r.rentalTerm==="long";
 const unit=long?r.longRateUnit:r.shortRateUnit;
 const money=x=>{const n=parseRialAmount(x);return n!==null&&n>0?n:null;};
 const rate=long?(wanted?r.maxRentRial:unit==="year"?r.longYearlyRentRial:r.longMonthlyRentRial):wanted?r.maxBudgetRial:r.shortRateRial;
 const check=validateRentalTermProfile({category:"shop",side:wanted?"wanted":"offer",primaryTerm:r.rentalTerm,rateUnit:unit,
  rateAmountRial:long&&r.financialMode==="full_deposit"?null:money(rate),
  leaseDepositRial:long&&!wanted&&r.financialMode!=="rent_only"?money(r.longDepositRial):null,
  securityHoldRial:!long&&!wanted?money(r.securityHoldRial):null,
  monthlyRentRial:long&&!wanted&&unit==="month"&&r.financialMode!=="full_deposit"?money(r.longMonthlyRentRial):null,
  canNegotiateOtherTerm:wanted?null:r.canNegotiateOtherTerm},POLICY,{requireTerm:true});
 return check.ok?"":"مدت و شرایط مالی مغازه با استاندارد اجاره فضاجو سازگار نیست.";
}
export const shopRentalListingPrice=(v,wanted=false)=>storageListingPrice(v,wanted);
export const shopRentalMoneyRows=(v,wanted=false)=>storageMoneyRows(v,wanted);
export const shopRentalFinancialRows=(v,wanted=false)=>storageFinancialRows(v,wanted);
export const shopRentalHeadline=(v,wanted=false)=>storageFinancialHeadline(v,wanted);
