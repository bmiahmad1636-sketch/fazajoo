/** Strict server-side allowlist for typed "other" supply. Never infer contracts from legacy price. */
const LAYOUTS=["indoor","outdoor","mixed"],ACCESS=["normal","independent","loading","flexible"];
const FEATURES=["water","electricity","restroom","parking","loading","private","internet","heating","cooling"];
const UNITS=["daily","weekly","monthly"],MODES=["deposit_rent","full_deposit","rent_only"];
function money(raw){
 if(raw===null||raw===undefined||raw===""||typeof raw==="boolean")return null;
 const s=String(raw).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"");
 if(!/^\d{1,15}$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)&&n>0?n:null;
}
function cleanOtherSpaceAttributes(attrs,category,side){
 if(category!=="other"||side!=="offer"||!attrs||attrs.schemaVersion!==1||attrs.category!=="other"||!attrs.values||typeof attrs.values!=="object"||Array.isArray(attrs.values))return {};
 const v=attrs.values,short=v.rentalTerm==="short",long=v.rentalTerm==="long";
 return {schemaVersion:1,category:"other",values:{
  usage:String(v.usage||"").trim().slice(0,180),layout:LAYOUTS.includes(v.layout)?v.layout:null,
  access:ACCESS.includes(v.access)?v.access:null,
  features:Array.isArray(v.features)?[...new Set(v.features.filter(x=>FEATURES.includes(x)))]:[],
  limitations:String(v.limitations||"").trim().slice(0,400),
  rentalTerm:short?"short":long?"long":null,canNegotiateOtherTerm:v.canNegotiateOtherTerm===true,
  shortRateUnit:short&&UNITS.includes(v.shortRateUnit)?v.shortRateUnit:null,
  shortRateRial:short?money(v.shortRateRial):null,securityHoldRial:short?money(v.securityHoldRial):null,
  financialMode:long&&MODES.includes(v.financialMode)?v.financialMode:null,
  longDepositRial:long&&v.financialMode!=="rent_only"?money(v.longDepositRial):null,
  longMonthlyRentRial:long&&v.financialMode!=="full_deposit"?money(v.longMonthlyRentRial):null,
 }};
}
module.exports={cleanOtherSpaceAttributes};
