/** Whitelist garden offer details on the server. Never apply to wanted gardens. */
const TYPES=["orchard","cultivation","leisure","mixed"];
const PURPOSES=["recreation","orchard","gardening","event","hobby","other"];
const ROADS=["asphalt","gravel","dirt","pedestrian","unknown"];
const DURATIONS=["flexible","daily","weekend","monthly","seasonal","yearly"];
const PRIVACY=["private","shared","unknown"];
const FEATURES=["parking","restroom","gazebo","barbecue","pool","lighting","security"];
const TERMS=["short","seasonal","long"];
const SHORT_UNITS=["daily","weekly","monthly"];
const FINANCIAL_MODES=["rent_only","full_deposit","deposit_rent"];
const allow=(a,x)=>a.includes(x)?x:null;
const list=(opts,x)=>Array.isArray(x)?[...new Set(x.filter(v=>opts.includes(v)))].slice(0,opts.length):[];
const number=(v,min,max)=>{
 if(v===null||v===undefined||v===""||typeof v==="boolean")return null;
 const s=String(v).trim().replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
 .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"");
 if(!/^\d+$/.test(s))return null;
 const n=Number(s);return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;
};
function cleanGardenSpaceAttributes(a,category,side){
 if(category!=="garden"||side!=="offer"||!a||a.schemaVersion!==1||a.category!=="garden"||!a.values||typeof a.values!=="object"||Array.isArray(a.values))return {};
 const v=a.values,uses=list(PURPOSES,v.allowedPurposes);
 return {schemaVersion:1,category:"garden",values:{
  gardenType:allow(TYPES,v.gardenType),allowedPurposes:uses,
  otherPurpose:uses.includes("other")?String(v.otherPurpose||"").trim().slice(0,160):"",
  accessRoad:allow(ROADS,v.accessRoad),rentalDuration:allow(DURATIONS,v.rentalDuration),
  privacy:allow(PRIVACY,v.privacy),features:list(FEATURES,v.features),
  eventCapacity:uses.includes("event")?number(v.eventCapacity,1,10000):null,
  rentalTerm:allow(TERMS,v.rentalTerm),canNegotiateOtherTerm:v.rentalTerm!=="seasonal"&&v.canNegotiateOtherTerm===true,
  shortRateUnit:v.rentalTerm==="short"?allow(SHORT_UNITS,v.shortRateUnit):null,
  shortRateRial:v.rentalTerm==="short"?number(v.shortRateRial,1,999999999999999):null,
  securityHoldRial:v.rentalTerm==="short"?number(v.securityHoldRial,1,999999999999999):null,
  seasonalRateRial:v.rentalTerm==="seasonal"?number(v.seasonalRateRial,1,999999999999999):null,
  seasonalSecurityHoldRial:v.rentalTerm==="seasonal"?number(v.seasonalSecurityHoldRial,1,999999999999999):null,
  longMonthlyRentRial:v.rentalTerm==="long"&&v.financialMode!=="full_deposit"?number(v.longMonthlyRentRial,1,999999999999999):null,
  financialMode:v.rentalTerm==="short"||v.rentalTerm==="seasonal"?null:allow(FINANCIAL_MODES,v.financialMode),
  depositRial:["short","seasonal"].includes(v.rentalTerm)||v.financialMode==="rent_only"?null:number(v.depositRial,1,999999999999999),
 }};
}
module.exports={cleanGardenSpaceAttributes};
