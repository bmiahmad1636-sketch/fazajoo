"use strict";
/** Storage financial adapter: delegates sanitization and price derivation to the
 * existing parking finance pipeline; only allowed periods come from shared RT-00.
 * This is not a separate matching engine. */
const POLICY = require("../../../shared/rental-term-policy.v1.json");
const {cleanParkingFinance, validateParkingFinance, parkingFinancePrice} = require("./parkingRentalFinance");
const opts=POLICY.categories.storage.rateUnitsByTerm;
function cleanStorageFinance(raw,wanted=false){return cleanParkingFinance(raw,wanted,"storage");}
function validateStorageFinance(raw,wanted=false){
  const v=cleanStorageFinance(raw,wanted);
  if(!["short","long"].includes(v.rentalTerm))return "مدت اصلی قرارداد انبار را انتخاب کنید.";
  if(v.rentalTerm==="short"&&!opts.short.includes(v.shortRateUnit))return "دوره محاسبه اجاره کوتاه‌مدت انبار باید روزانه، هفتگی یا ماهانه باشد.";
  if(v.rentalTerm==="long"&&!opts.long.includes(v.longRateUnit))return "دوره اجاره بلندمدت انبار معتبر نیست.";
  const err=validateParkingFinance(raw,wanted,"storage");
  return err?err.replace(/پارکینگ/g,"انبار"):"";
}
function storageFinancePrice(raw,wanted=false){
  if(validateStorageFinance(raw,wanted)) return {price:"",priceType:"negotiable"};
  return parkingFinancePrice(raw,wanted,"storage");
}
function readWantedStorageFinance(description){
  const match=String(description||"").match(/^\[FAZAJOO_WAREHOUSE_REQUEST:([^\]\n]+)\]/);
  if(!match)return null;
  try{
    const v=JSON.parse(decodeURIComponent(match[1]));
    return v&&typeof v==="object"&&!Array.isArray(v)?v:null;
  }catch{return null;}
}
module.exports={cleanStorageFinance,validateStorageFinance,storageFinancePrice,readWantedStorageFinance};
