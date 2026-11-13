"use strict";
/** F5-03 warehouse shed/workshop: typed adapter of the SAME RT-00 policy.
 * No separate matcher, and never promote a wanted budget into an owner price.
 */
const POLICY = require("../../../shared/rental-term-policy.v1.json");
const {cleanParkingFinance,validateParkingFinance,parkingFinancePrice}=require("./parkingRentalFinance");
const OPTIONS=POLICY.categories.warehouse.rateUnitsByTerm;
function cleanIndustrialFinance(raw,wanted=false){return cleanParkingFinance(raw,wanted,"warehouse");}
function validateIndustrialFinance(raw,wanted=false){
  const v=cleanIndustrialFinance(raw,wanted);
  if(!["short","long"].includes(v.rentalTerm))return "مدت اصلی قرارداد سوله یا کارگاه را انتخاب کنید.";
  if(v.rentalTerm==="short"&&!OPTIONS.short.includes(v.shortRateUnit))return "دوره کوتاه‌مدت سوله یا کارگاه معتبر نیست.";
  if(v.rentalTerm==="long"&&!OPTIONS.long.includes(v.longRateUnit))return "دوره بلندمدت سوله یا کارگاه معتبر نیست.";
  const err=validateParkingFinance(raw,wanted,"warehouse");
  return err?err.replace(/پارکینگ/g,"سوله یا کارگاه"):"";
}
function industrialFinancePrice(raw,wanted=false){
  return validateIndustrialFinance(raw,wanted)?{price:"",priceType:"negotiable"}:parkingFinancePrice(raw,wanted,"warehouse");
}
function readWantedIndustrialFinance(description){
  const match=String(description||"").match(/^\[FAZAJOO_SHED_REQUEST:([^\]\n]+)\]/);
  if(!match)return null;
  try {const v=JSON.parse(decodeURIComponent(match[1]));return v&&typeof v==="object"&&!Array.isArray(v)?v:null;}
  catch{return null;}
}
module.exports={cleanIndustrialFinance,validateIndustrialFinance,industrialFinancePrice,readWantedIndustrialFinance};
