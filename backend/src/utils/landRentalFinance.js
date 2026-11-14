"use strict";
/** F5-05 land finance: server-side RT-00 policy adapter, no independent matching engine. */
const policy=require("../../../shared/rental-term-policy.v1.json");
const periods=policy.categories.land.rateUnitsByTerm;
const limit=999999999999999;
const number = value => {
 if(value===null||value===undefined||value==="")return null;
 const txt=String(value).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
   .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"");
 if(!/^\d{1,15}$/.test(txt))return null;
 const n=Number(txt);return Number.isSafeInteger(n)&&n>0&&n<=limit?n:null;
};
const money=(v)=>number(v);
function cleanLandFinance(raw={},wanted=false){
 const v=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
 const r={financeSchemaVersion:v.financeSchemaVersion===1?1:null,transactionKind:v.transactionKind==="crop_share"?"crop_share":"lease",
  rentalTerm:null,canNegotiateOtherTerm:false,shortRateUnit:null,shortRateRial:null,securityHoldRial:null,
  seasonalRateRial:null,seasonalSecurityHoldRial:null,financialMode:null,longRateUnit:null,
  longDepositRial:null,longMonthlyRentRial:null,longYearlyRentRial:null,
  maxBudgetRial:null,maxSecurityHoldRial:null,maxRentRial:null,maxDepositRial:null,
  cropShareNotes:""};
 if(r.transactionKind==="crop_share"){
  r.cropShareNotes=String(v.cropShareNotes||"").trim().slice(0,800);return r;
 }
 if(!periods[v.rentalTerm])return r;
 r.rentalTerm=v.rentalTerm;
 if(r.rentalTerm==="short"){
  r.shortRateUnit=periods.short.includes(v.shortRateUnit)?v.shortRateUnit:null;
  if(wanted){r.maxBudgetRial=money(v.maxBudgetRial);r.maxSecurityHoldRial=money(v.maxSecurityHoldRial);}
  else{r.shortRateRial=money(v.shortRateRial);r.securityHoldRial=money(v.securityHoldRial);}
 }else if(r.rentalTerm==="seasonal"){
  if(wanted){r.maxBudgetRial=money(v.maxBudgetRial);r.maxSecurityHoldRial=money(v.maxSecurityHoldRial);}
  else{r.seasonalRateRial=money(v.seasonalRateRial);r.seasonalSecurityHoldRial=money(v.seasonalSecurityHoldRial);}
 }else{
  r.financialMode=["rent_only","deposit_rent","full_deposit"].includes(v.financialMode)?v.financialMode:null;
  r.longRateUnit=periods.long.includes(v.longRateUnit)?v.longRateUnit:null;
  if(r.financialMode!=="rent_only"){
   if(wanted)r.maxDepositRial=money(v.maxDepositRial);
   else r.longDepositRial=money(v.longDepositRial);
  }
  if(r.financialMode!=="full_deposit"){
   if(wanted)r.maxRentRial=money(v.maxRentRial);
   else if(r.longRateUnit==="year")r.longYearlyRentRial=money(v.longYearlyRentRial);
   else r.longMonthlyRentRial=money(v.longMonthlyRentRial);
  }
 }
 if(!wanted&&["short","long"].includes(r.rentalTerm))r.canNegotiateOtherTerm=v.canNegotiateOtherTerm===true;
 return r;
}
function validateLandFinance(raw={},wanted=false){
 const v=cleanLandFinance(raw,wanted);
 if(v.transactionKind==="crop_share")return String(v.cropShareNotes||"").length>=15?"":"شرایط مشارکت در محصول باید حداقل ۱۵ نویسه باشد.";
 if(!v.rentalTerm)return "مدت اصلی قرارداد زمین لازم است.";
 if(v.rentalTerm==="short"&&!v.shortRateUnit)return "دوره محاسبه کوتاه‌مدت زمین معتبر نیست.";
 if(v.rentalTerm==="long"&&(!v.longRateUnit||!v.financialMode))return "مدت یا نوع قرارداد بلندمدت زمین معتبر نیست.";
 if(v.rentalTerm==="short"&&!(wanted?v.maxBudgetRial:v.shortRateRial))return "مبلغ اجاره کوتاه‌مدت زمین لازم است.";
 if(v.rentalTerm==="seasonal"&&!(wanted?v.maxBudgetRial:v.seasonalRateRial))return "مبلغ اجاره فصلی زمین لازم است.";
 if(v.rentalTerm==="long"){
  if(v.financialMode!=="rent_only"&&!(wanted?v.maxDepositRial:v.longDepositRial))return "مبلغ رهن بلندمدت زمین لازم است.";
  if(v.financialMode!=="full_deposit"&&!(wanted?v.maxRentRial:v.longRateUnit==="year"?v.longYearlyRentRial:v.longMonthlyRentRial))return "مبلغ اجاره بلندمدت زمین لازم است.";
 }
 // An explicitly present malformed optional amount must be rejected, not silently dropped.
 const optional=v.rentalTerm==="short"?(wanted?raw.maxSecurityHoldRial:raw.securityHoldRial):v.rentalTerm==="seasonal"?(wanted?raw.maxSecurityHoldRial:raw.seasonalSecurityHoldRial):null;
 if(optional!==null&&optional!==undefined&&optional!==""&&money(optional)===null)return "مبلغ ضمانت خسارت زمین معتبر نیست.";
 return "";
}
function landFinancePrice(raw={},wanted=false){
 const v=cleanLandFinance(raw,wanted);
 if(v.transactionKind==="crop_share"||!v.rentalTerm)return {price:"",priceType:"negotiable"};
 if(v.rentalTerm==="seasonal"||v.rentalTerm==="long"&&v.financialMode==="full_deposit")return {price:"",priceType:"negotiable"};
 const rate=v.rentalTerm==="short"?(wanted?v.maxBudgetRial:v.shortRateRial):wanted?v.maxRentRial:v.longRateUnit==="year"?v.longYearlyRentRial:v.longMonthlyRentRial;
 const unit=v.rentalTerm==="short"?v.shortRateUnit:v.longRateUnit;
 const priceType={day:"daily",week:"weekly",month:"monthly",year:"yearly"}[unit]||"negotiable";
 return rate&&priceType!=="negotiable"?{price:String(rate),priceType}:{price:"",priceType:"negotiable"};
}
function readWantedLandFinance(description=""){
 const m=String(description||"").match(/^\[FAZAJOO_LAND_RENTAL:([^\]\n]+)\]/);
 if(!m)return null;
 try{const v=JSON.parse(decodeURIComponent(m[1]));return v&&typeof v==="object"&&!Array.isArray(v)?v:null;}catch{return null;}
}
module.exports={cleanLandFinance,validateLandFinance,landFinancePrice,readWantedLandFinance};
