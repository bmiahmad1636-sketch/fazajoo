/** F5-05: Land rental contract is an adapter to the EXISTING RT-00 engine.
 * It does NOT score matches and never turns a proposed land use into a permit.
 * Money is IRR. Wanted limits are ceilings, not landlord's asking prices.
 */
import POLICY from "../../shared/rental-term-policy.v1.json" with { type: "json" };
import { getRentalOptions, parseRialAmount, validateRentalTermProfile } from "../../shared/rental-term-core.mjs";

export const LAND_TERMS = [["short","کوتاه‌مدت / مقطعی"],["seasonal","فصلی / فصل زراعی"],["long","بلندمدت"]];
export const LAND_MODES = [["rent_only","فقط اجاره"],["deposit_rent","رهن و اجاره"],["full_deposit","رهن کامل"]];
export const LAND_CONTRACT_UNITS = {
  short: [["day","روزانه"],["week","هفتگی"],["month","ماهانه"]],
  seasonal: [["season","هر فصل"]],
  long: [["month","ماهانه"],["year","سالانه"]],
};
export const LAND_CONTRACT_DEFAULT = Object.freeze({
  rentalTerm:"",shortRateUnit:"day",shortRateRial:"",securityHoldRial:"",
  seasonalRateRial:"",seasonalSecurityHoldRial:"",
  financialMode:"",longRateUnit:"month",longDepositRial:"",longMonthlyRentRial:"",longYearlyRentRial:"",
  canNegotiateOtherTerm:false,
  maxBudgetRial:"",maxSecurityHoldRial:"",maxRentRial:"",maxDepositRial:"",
  transactionKind:"lease",cropShareNotes:"",financeSchemaVersion:1,
});
const OPTIONS=getRentalOptions(POLICY,"land");
if(!OPTIONS || JSON.stringify(OPTIONS.terms)!==JSON.stringify(LAND_TERMS.map(([v])=>v)) ||
  Object.keys(LAND_CONTRACT_UNITS).some(term=>JSON.stringify(OPTIONS.rateUnitsByTerm[term])!==JSON.stringify(LAND_CONTRACT_UNITS[term].map(([v])=>v)))) {
  throw new Error("F5-05 land contract differs from shared RT-00 policy");
}
const hasTerm=t=>LAND_TERMS.some(([v])=>v===t);
const unitsFor=t=>LAND_CONTRACT_UNITS[t]||[];
const hasUnit=(t,u)=>unitsFor(t).some(([v])=>v===u);
const normalMoney=value=>parseRialAmount(value);
const positive=value=>{const n=normalMoney(value);return n!==null&&n>0&&n<=999999999999999?n:null;};
const moneyValid=v=>v===""||v===null||v===undefined||positive(v)!==null;
export const landMoneyInput = value => String(value??"").replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
  .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"").replace(/\D/g,"").slice(0,15);
export const landMoneyDisplay = value => landMoneyInput(value).replace(/\B(?=(\d{3})+(?!\d))/g,",");
export const landTermLabel=t=>LAND_TERMS.find(([key])=>key===t)?.[1]||"";
const labelUnit=(term,unit)=>unitsFor(term).find(([id])=>id===unit)?.[1]||"";
/** Do not mutate physical attributes. Only active financial mode is serialized. */
export function landActiveContract(raw={},wanted=false){
 const v={...LAND_CONTRACT_DEFAULT,...raw};
 const out={...LAND_CONTRACT_DEFAULT};
 if(v.transactionKind==="crop_share") {
   out.transactionKind="crop_share";
   out.cropShareNotes=String(v.cropShareNotes||"").trim().slice(0,800);
   return out;
 }
 out.transactionKind="lease";
 if(!hasTerm(v.rentalTerm))return out;
 out.rentalTerm=v.rentalTerm;
 if(v.rentalTerm==="short"){
  out.shortRateUnit=hasUnit("short",v.shortRateUnit)?v.shortRateUnit:"day";
  if(wanted){out.maxBudgetRial=v.maxBudgetRial??"";out.maxSecurityHoldRial=v.maxSecurityHoldRial??"";}
  else{out.shortRateRial=v.shortRateRial??"";out.securityHoldRial=v.securityHoldRial??"";}
 }else if(v.rentalTerm==="seasonal"){
  if(wanted){out.maxBudgetRial=v.maxBudgetRial??"";out.maxSecurityHoldRial=v.maxSecurityHoldRial??"";}
  else{out.seasonalRateRial=v.seasonalRateRial??"";out.seasonalSecurityHoldRial=v.seasonalSecurityHoldRial??"";}
 }else{
  out.financialMode=LAND_MODES.some(([m])=>m===v.financialMode)?v.financialMode:"";
  out.longRateUnit=hasUnit("long",v.longRateUnit)?v.longRateUnit:"month";
  if(out.financialMode!=="rent_only"){
   if(wanted)out.maxDepositRial=v.maxDepositRial??"";
   else out.longDepositRial=v.longDepositRial??"";
  }
  if(out.financialMode!=="full_deposit"){
   if(wanted)out.maxRentRial=v.maxRentRial??"";
   else if(out.longRateUnit==="year")out.longYearlyRentRial=v.longYearlyRentRial??"";
   else out.longMonthlyRentRial=v.longMonthlyRentRial??"";
  }
 }
 if(!wanted&&["short","long"].includes(v.rentalTerm))out.canNegotiateOtherTerm=v.canNegotiateOtherTerm===true;
 return out;
}
/** Every contract switch preserves the *physical* fields, and only scrubs inactive money. */
export function changeLandTerm(v={},term,wanted=false){
 return {...v,...landActiveContract({...LAND_CONTRACT_DEFAULT,rentalTerm:term,canNegotiateOtherTerm:v.canNegotiateOtherTerm},wanted)};
}
export function changeLandMode(v={},mode,wanted=false){
 const reset=wanted?{maxRentRial:"",maxDepositRial:""}:{longMonthlyRentRial:"",longYearlyRentRial:"",longDepositRial:""};
 return {...v,...reset,financialMode:LAND_MODES.some(([id])=>id===mode)?mode:""};
}
export function changeLandUnit(v={},unit,wanted=false){
 if(!hasUnit(v.rentalTerm,unit))return v;
 if(v.rentalTerm==="short")return {...v,shortRateUnit:unit,...(wanted?{maxBudgetRial:""}:{shortRateRial:""})};
 if(v.rentalTerm==="long")return {...v,longRateUnit:unit,...(wanted?{maxRentRial:""}:{longMonthlyRentRial:"",longYearlyRentRial:""})};
 return v;
}
export function validateLandContract(raw={},wanted=false){
 const v=landActiveContract(raw,wanted);
 if(raw.transactionKind==="crop_share"){
  return String(raw.cropShareNotes||"").trim().length>=15?"":"شرایط مشارکت در محصول را حداقل در ۱۵ نویسه توضیح دهید.";
 }
 if(!hasTerm(raw.rentalTerm))return "مدت اصلی قرارداد زمین را انتخاب کنید.";
 const t=v.rentalTerm,unit=t==="short"?v.shortRateUnit:t==="long"?v.longRateUnit:"season";
 if((t==="short"&&!hasUnit(t,raw.shortRateUnit))||(t==="long"&&!hasUnit(t,raw.longRateUnit)))return "دوره محاسبه اجاره زمین را انتخاب کنید.";
 if(t==="long"&&!LAND_MODES.some(([mode])=>mode===raw.financialMode))return "نوع قرارداد بلندمدت زمین را انتخاب کنید.";
 const rate=t==="short"?(wanted?v.maxBudgetRial:v.shortRateRial):t==="seasonal"?(wanted?v.maxBudgetRial:v.seasonalRateRial):wanted?v.maxRentRial:unit==="year"?v.longYearlyRentRial:v.longMonthlyRentRial;
 if((t!=="long"||v.financialMode!=="full_deposit")&&positive(rate)===null)
  return wanted?"سقف بودجه اجاره زمین را به ریال وارد کنید.":"مبلغ اجاره زمین را به ریال وارد کنید.";
 if(t==="long"&&v.financialMode!=="rent_only"&&positive(wanted?v.maxDepositRial:v.longDepositRial)===null)
  return wanted?"سقف رهن زمین را به ریال وارد کنید.":"مبلغ رهن زمین را به ریال وارد کنید.";
 const hold=t==="short"?(wanted?v.maxSecurityHoldRial:v.securityHoldRial):t==="seasonal"?(wanted?v.maxSecurityHoldRial:v.seasonalSecurityHoldRial):"";
 if(!moneyValid(hold))return "مبلغ ضمانت خسارت / ودیعه زمین معتبر نیست.";
 const check=validateRentalTermProfile({category:"land",side:wanted?"wanted":"offer",primaryTerm:t,rateUnit:unit,
  rateAmountRial:wanted||t==="long"&&v.financialMode==="full_deposit"?null:positive(rate),
  leaseDepositRial:wanted||t!=="long"||v.financialMode==="rent_only"?null:positive(v.longDepositRial),
  monthlyRentRial:wanted||t!=="long"||unit!=="month"||v.financialMode==="full_deposit"?null:positive(v.longMonthlyRentRial),
  securityHoldRial:wanted||t==="long"?null:positive(hold),
  canNegotiateOtherTerm:wanted?null:v.canNegotiateOtherTerm,
 },POLICY,{requireTerm:true});
 return check.ok?"":"شرایط قرارداد زمین با استاندارد مشترک اجاره فضاجو سازگار نیست.";
}
export function landContractPrice(raw={},wanted=false){
 const v=landActiveContract(raw,wanted);
 if(v.transactionKind==="crop_share"||!hasTerm(v.rentalTerm))return {price:"",priceType:"negotiable"};
 const t=v.rentalTerm,u=t==="short"?v.shortRateUnit:t==="long"?v.longRateUnit:"season";
 const n=t==="short"?positive(wanted?v.maxBudgetRial:v.shortRateRial):t==="seasonal"?null:positive(wanted?v.maxRentRial:u==="year"?v.longYearlyRentRial:v.longMonthlyRentRial);
 if(t==="long"&&v.financialMode==="full_deposit")return {price:"",priceType:"negotiable"};
 const period={day:"daily",week:"weekly",month:"monthly",year:"yearly"}[u]||"negotiable";
 return n!==null&&period!=="negotiable"?{price:String(n),priceType:period}:{price:"",priceType:"negotiable"};
}
const rial=v=>positive(v)===null?"":`${positive(v).toLocaleString("fa-IR")} ریال`;
export function landContractRows(raw={},wanted=false){
 const v=landActiveContract(raw,wanted);
 if(v.transactionKind==="crop_share")return [{label:"نوع توافق",amount:"مشارکت در محصول؛ نیازمند بررسی شرایط و مجوزها"}];
 if(!hasTerm(v.rentalTerm))return [];
 const t=v.rentalTerm;
 const rows=[{label:"مدت اصلی",amount:landTermLabel(t)}];
 if(t==="short"||t==="seasonal"){
  const rate=t==="short"?(wanted?v.maxBudgetRial:v.shortRateRial):(wanted?v.maxBudgetRial:v.seasonalRateRial);
  const rateLabel=t==="seasonal"?"هر فصل":labelUnit("short",v.shortRateUnit);
  if(rial(rate))rows.push({label:`${wanted?"سقف اجاره":"اجاره"} / ${rateLabel}`,amount:rial(rate)});
  const hold=t==="short"?(wanted?v.maxSecurityHoldRial:v.securityHoldRial):(wanted?v.maxSecurityHoldRial:v.seasonalSecurityHoldRial);
  if(rial(hold))rows.push({label:wanted?"حداکثر ضمانت خسارت / ودیعه":"ضمانت خسارت / ودیعه",amount:rial(hold)});
 }else{
  const mode=LAND_MODES.find(([key])=>key===v.financialMode)?.[1];
  if(mode)rows.push({label:"نوع قرارداد",amount:mode});
  const deposit=wanted?v.maxDepositRial:v.longDepositRial;
  const rent=wanted?v.maxRentRial:v.longRateUnit==="year"?v.longYearlyRentRial:v.longMonthlyRentRial;
  if(v.financialMode!=="rent_only"&&rial(deposit))rows.push({label:wanted?"سقف رهن":"مبلغ رهن",amount:rial(deposit)});
  if(v.financialMode!=="full_deposit"&&rial(rent))rows.push({label:`${wanted?"سقف اجاره":"اجاره"} / ${labelUnit("long",v.longRateUnit)}`,amount:rial(rent)});
 }
 return rows;
}
export function landContractMoneyRows(raw={},wanted=false){return landContractRows(raw,wanted).filter(({label})=>!["مدت اصلی","نوع قرارداد"].includes(label));}
export function landContractHeadline(raw={},wanted=false){return landContractMoneyRows(raw,wanted).map(({label,amount})=>`${label}: ${amount}`).join(" • ");}
export function landContractBadges(raw={},wanted=false){
 const v=landActiveContract(raw,wanted);
 if(v.transactionKind==="crop_share"||!hasTerm(v.rentalTerm))return [];
 const a=[{term:v.rentalTerm,label:landTermLabel(v.rentalTerm),state:wanted?"requested":"primary"}];
 if(!wanted&&["short","long"].includes(v.rentalTerm)&&v.canNegotiateOtherTerm===true){
  const opposite=v.rentalTerm==="short"?"long":"short";
  a.push({term:opposite,label:landTermLabel(opposite),state:"possible"});
 }
 return a;
}
