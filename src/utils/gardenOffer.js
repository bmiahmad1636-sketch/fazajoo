/** Actual garden supply; owner's statements are not legal permits. */
import { GARDEN_REQUEST_PURPOSES, GARDEN_REQUEST_FEATURES } from "./gardenRequest.js";
export const GARDEN_OFFER_TYPES = [
 ["orchard", "باغ درختان میوه"], ["cultivation", "باغ و باغچه کشت و پرورش"],
 ["leisure", "باغ تفریحی"], ["mixed", "باغ چندمنظوره"],
];
export const GARDEN_OFFER_PURPOSES = GARDEN_REQUEST_PURPOSES;
export const GARDEN_OFFER_ROADS = [
 ["asphalt", "آسفالت"], ["gravel", "شن‌ریزی / سنگ‌ریزه"],
 ["dirt", "خاکی"], ["pedestrian", "فقط پیاده"], ["unknown", "نامشخص"],
];
export const GARDEN_OFFER_DURATIONS = [
 ["flexible", "توافقی"], ["daily", "روزانه"], ["weekend", "آخر هفته"],
 ["monthly", "ماهانه"], ["seasonal", "فصلی"], ["yearly", "سالانه"],
];
export const GARDEN_OFFER_PRIVACY = [
 ["private", "اختصاصی و مستقل"], ["shared", "مشترک با دیگران"], ["unknown", "هنوز مشخص نیست"],
];
export const GARDEN_OFFER_FEATURES = GARDEN_REQUEST_FEATURES.filter(([key]) => ["parking", "restroom", "gazebo", "barbecue", "pool"].includes(key))
  .concat([["lighting", "روشنایی محوطه"], ["security", "نگهبانی / مراقبت"]]);
export const GARDEN_RENTAL_TERMS = [["short","کوتاه‌مدت / مقطعی"],["seasonal","فصلی"],["long","بلندمدت"]];
export const GARDEN_SHORT_UNITS = [["daily","روزانه"],["weekly","هفتگی"],["monthly","ماهانه"]];
export const GARDEN_FINANCIAL_MODES = [["rent_only", "فقط اجاره"], ["full_deposit", "رهن کامل"], ["deposit_rent", "رهن و اجاره"]];
export const GARDEN_RENT_PERIODS = [["daily","روزانه"],["weekly","هفتگی"],["monthly","ماهانه"],["yearly","سالانه"]];
export const GARDEN_OFFER_DEFAULT = Object.freeze({
 gardenType: "", allowedPurposes: [], otherPurpose: "", accessRoad: "", rentalDuration: "",
 privacy: "", features: [], eventCapacity: "", depositRial: "", financialMode: "",
 rentalTerm: "", canNegotiateOtherTerm: false,
 shortRateUnit: "daily", shortRateRial: "", securityHoldRial: "",
 seasonalRateRial: "", seasonalSecurityHoldRial: "", longMonthlyRentRial: "",
});
const digits = (v) => String(v ?? "").trim().replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
 .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g, "");
const choices = (opts,x) => opts.some(([id])=>id===x) ? x : "";
const list = (opts,v) => Array.isArray(v) ? [...new Set(v.filter(x=>Boolean(choices(opts,x))))].slice(0,opts.length) : [];
function number(v,min,max) {
 const n=digits(v); if(!/^\d+$/.test(n))return null;
 const num=Number(n);return Number.isSafeInteger(num)&&num>=min&&num<=max?num:null;
}
export const gardenMoneyInputDigits = (v) => digits(v).replace(/\D/g, "");
export const formatGardenMoneyInput = (v) => gardenMoneyInputDigits(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const gardenOfferLabel = (opts, id) => opts.find(([v])=>v===id)?.[1] || "";
export function gardenFinancialMode(attrs, price = "", priceType = "monthly") {
 const v = attrs?.schemaVersion === 1 && attrs.category === "garden" ? attrs.values || {} : {};
 if (choices(GARDEN_FINANCIAL_MODES, v.financialMode)) return v.financialMode;
 // Legacy garden advertisements had a deposit and a separate generic rental price.
 // Only infer a mode for editing old advertisements; never overwrite stored amounts.
 const deposit = number(v.depositRial,1,999999999999999);
 const rent = number(price,1,999999999999999);
 if (deposit && rent && priceType !== "negotiable") return "deposit_rent";
 if (deposit) return "full_deposit";
 if (rent || priceType === "negotiable") return "rent_only";
 return "";
}
export function gardenOfferFromAttributes(attr, price = "", priceType = "monthly") {
 const v=attr?.schemaVersion===1 && attr.category==="garden" && attr.values && typeof attr.values==="object" && !Array.isArray(attr.values) ? attr.values : {};
 const uses=list(GARDEN_OFFER_PURPOSES,v.allowedPurposes);
 const legacyTerm = !v.rentalTerm && v.rentalDuration && v.rentalDuration !== "flexible"
   ? (["daily","weekend"].includes(v.rentalDuration) ? "short" : v.rentalDuration === "seasonal" ? "seasonal" : ["monthly","yearly"].includes(v.rentalDuration) ? "long" : "") : "";
 return { ...GARDEN_OFFER_DEFAULT,
  gardenType:choices(GARDEN_OFFER_TYPES,v.gardenType), allowedPurposes:uses,
  otherPurpose:uses.includes("other")&&typeof v.otherPurpose==="string" ? v.otherPurpose.slice(0,160) : "",
  accessRoad:choices(GARDEN_OFFER_ROADS,v.accessRoad), rentalDuration:choices(GARDEN_OFFER_DURATIONS,v.rentalDuration),
  privacy:choices(GARDEN_OFFER_PRIVACY,v.privacy), features:list(GARDEN_OFFER_FEATURES,v.features),
  eventCapacity:uses.includes("event")&&v.eventCapacity!=null?String(v.eventCapacity):"",
  depositRial:v.depositRial!=null?String(v.depositRial):"",
  financialMode:gardenFinancialMode(attr,price,priceType),
  rentalTerm:choices(GARDEN_RENTAL_TERMS,v.rentalTerm) || legacyTerm,
  // Retain documented original price, without guessing a new contract for flexible legacy ads.
  canNegotiateOtherTerm:v.canNegotiateOtherTerm === true,
  shortRateUnit:choices(GARDEN_SHORT_UNITS,v.shortRateUnit) || (priceType === "weekly" ? "weekly" : priceType === "monthly" ? "monthly" : "daily"),
  shortRateRial:v.shortRateRial!=null?String(v.shortRateRial):legacyTerm==="short"&&["daily","weekly","monthly"].includes(priceType)?String(price||""):"",
  securityHoldRial:v.securityHoldRial!=null?String(v.securityHoldRial):"",
  seasonalRateRial:v.seasonalRateRial!=null?String(v.seasonalRateRial):"",
  seasonalSecurityHoldRial:v.seasonalSecurityHoldRial!=null?String(v.seasonalSecurityHoldRial):"",
  longMonthlyRentRial:v.longMonthlyRentRial!=null?String(v.longMonthlyRentRial):legacyTerm==="long"&&priceType==="monthly"?String(price||""):"",
 };
}
export function validateGardenOffer(v={}) {
 if(!choices(GARDEN_OFFER_TYPES,v.gardenType))return "نوع باغ موجود را انتخاب کنید.";
 const uses=list(GARDEN_OFFER_PURPOSES,v.allowedPurposes);
 if(!uses.length)return "حداقل یک کاربرد قابل واگذاری باغ را انتخاب کنید.";
 if(uses.includes("other")&&String(v.otherPurpose||"").trim().length<5)return "کاربرد دیگر باغ را با حداقل ۵ حرف توضیح دهید.";
 if(!choices(GARDEN_OFFER_ROADS,v.accessRoad))return "نوع راه دسترسی باغ را انتخاب کنید.";
 if(uses.includes("event")&&digits(v.eventCapacity)!==""&&number(v.eventCapacity,1,10000)===null)return "ظرفیت مهمان‌ها باید عددی بین ۱ تا ۱۰٬۰۰۰ باشد.";
 if (choices(GARDEN_RENTAL_TERMS,v.rentalTerm)) {
   if(v.rentalTerm === "short") {
     if(!choices(GARDEN_SHORT_UNITS,v.shortRateUnit))return "دوره محاسبه اجاره کوتاه‌مدت باغ را انتخاب کنید.";
     if(number(v.shortRateRial,1,999999999999999)===null)return "مبلغ اجاره کوتاه‌مدت باغ را به ریال وارد کنید.";
     if(digits(v.securityHoldRial)!=="" && number(v.securityHoldRial,1,999999999999999)===null)return "مبلغ ودیعه / ضمانت خسارت را درست وارد کنید.";
     return "";
   }
   if(v.rentalTerm === "seasonal"){
     if(number(v.seasonalRateRial,1,999999999999999)===null)return "مبلغ اجاره فصلی باغ را به ریال وارد کنید.";
     if(digits(v.seasonalSecurityHoldRial)!=="" && number(v.seasonalSecurityHoldRial,1,999999999999999)===null)return "مبلغ ضمانت خسارت فصلی را درست وارد کنید.";
     return "";
   }
   const mode=choices(GARDEN_FINANCIAL_MODES,v.financialMode);
   if(!mode)return "شیوه مالی اجاره بلندمدت باغ را انتخاب کنید.";
   if(mode!=="rent_only" && number(v.depositRial,1,999999999999999)===null)return "مبلغ رهن / ودیعه بلندمدت باغ را به ریال وارد کنید.";
   if(mode!=="full_deposit" && number(v.longMonthlyRentRial,1,999999999999999)===null)return "اجاره ماهانه بلندمدت باغ را به ریال وارد کنید.";
   return "";
 }
 const mode = choices(GARDEN_FINANCIAL_MODES,v.financialMode);
 if(!mode)return "شیوه دریافت رهن و اجاره باغ را مشخص کنید.";
 if(mode!=="rent_only" && number(v.depositRial,1,999999999999999)===null)return "مبلغ ودیعه باغ را به ریال وارد کنید.";
 if(mode==="rent_only" && digits(v.depositRial)!=="" )return "در حالت فقط اجاره، مبلغ ودیعه نباید ثبت شود.";
 return "";
}
export function makeGardenAttributes(v={}) {
 const uses=list(GARDEN_OFFER_PURPOSES,v.allowedPurposes);
 return {schemaVersion:1,category:"garden",values:{
  gardenType:choices(GARDEN_OFFER_TYPES,v.gardenType)||null,allowedPurposes:uses,
  otherPurpose:uses.includes("other")?String(v.otherPurpose||"").trim().slice(0,160):"",
  accessRoad:choices(GARDEN_OFFER_ROADS,v.accessRoad)||null,
  rentalDuration:choices(GARDEN_OFFER_DURATIONS,v.rentalDuration)||null,
  privacy:choices(GARDEN_OFFER_PRIVACY,v.privacy)||null,
  features:list(GARDEN_OFFER_FEATURES,v.features),
  eventCapacity:uses.includes("event")?number(v.eventCapacity,1,10000):null,
  rentalTerm:choices(GARDEN_RENTAL_TERMS,v.rentalTerm)||null,
  canNegotiateOtherTerm:v.rentalTerm!=="seasonal"&&v.canNegotiateOtherTerm===true,
  shortRateUnit:v.rentalTerm==="short"?choices(GARDEN_SHORT_UNITS,v.shortRateUnit):null,
  shortRateRial:v.rentalTerm==="short"?number(v.shortRateRial,1,999999999999999):null,
  securityHoldRial:v.rentalTerm==="short"?number(v.securityHoldRial,1,999999999999999):null,
  seasonalRateRial:v.rentalTerm==="seasonal"?number(v.seasonalRateRial,1,999999999999999):null,
  seasonalSecurityHoldRial:v.rentalTerm==="seasonal"?number(v.seasonalSecurityHoldRial,1,999999999999999):null,
  longMonthlyRentRial:v.rentalTerm==="long"&&v.financialMode!=="full_deposit"?number(v.longMonthlyRentRial,1,999999999999999):null,
  financialMode:v.rentalTerm==="short"||v.rentalTerm==="seasonal"?null:choices(GARDEN_FINANCIAL_MODES,v.financialMode)||null,
  depositRial:v.rentalTerm==="short"||v.rentalTerm==="seasonal"||v.financialMode==="rent_only"?null:number(v.depositRial,1,999999999999999),
 }};
}

/** Canonical generic price: only rental money goes in price, never one-off deposit. */
export function gardenListingPrice(v={},rent="",rentPeriod="monthly") {
 if(v.rentalTerm==="short"){
  const n=number(v.shortRateRial,1,999999999999999);
  return {price:n?String(n):"",priceType:n&&choices(GARDEN_SHORT_UNITS,v.shortRateUnit)?v.shortRateUnit:"negotiable"};
 }
 if(v.rentalTerm==="seasonal")return {price:"",priceType:"negotiable"};
 if(v.rentalTerm==="long"){
  const n=v.financialMode==="full_deposit"?null:number(v.longMonthlyRentRial,1,999999999999999);
  return {price:n?String(n):"",priceType:n?"monthly":"negotiable"};
 }
 if(v.financialMode==="full_deposit")return {price:"",priceType:"negotiable"};
 const amount=number(rent,1,999999999999999);
 if(!amount||rentPeriod==="negotiable")return {price:"",priceType:"negotiable"};
 return {price:String(amount),priceType:choices(GARDEN_RENT_PERIODS,rentPeriod)||"monthly"};
}
export function validateGardenFinancialRent(v={},rent="",rentPeriod="monthly") {
 if(["short","seasonal","long"].includes(v.rentalTerm))return "";
 if(!["rent_only","deposit_rent"].includes(v.financialMode))return "";
 if(rentPeriod==="negotiable")return "";
 return number(rent,1,999999999999999)===null ? "مبلغ اجاره باغ را به ریال وارد کنید یا دوره را توافقی انتخاب کنید." : "";
}
/** Actual public display, no invented deposit, rent, or unit period. */
export function gardenFinancialRows(attrs,price="",priceType="monthly") {
 if(attrs?.schemaVersion!==1||attrs.category!=="garden")return [];
 const v=attrs.values||{};
 if(v.rentalTerm==="short"||v.rentalTerm==="seasonal"){
  const isShort=v.rentalTerm==="short",amount=number(isShort?v.shortRateRial:v.seasonalRateRial,1,999999999999999);
  const hold=number(isShort?v.securityHoldRial:v.seasonalSecurityHoldRial,1,999999999999999);
  const rateLabel=isShort?`اجاره ${gardenOfferLabel(GARDEN_SHORT_UNITS,v.shortRateUnit)||"کوتاه‌مدت"}`:"اجاره هر فصل";
  return [{label:rateLabel,amount:amount?`${amount.toLocaleString("fa-IR")} ریال`:"مبلغ اعلام نشده"},...(hold?[{label:"ودیعه / ضمانت خسارت",amount:`${hold.toLocaleString("fa-IR")} ریال`}]:[])];
 }
 if(v.rentalTerm==="long"){
  const r=number(v.longMonthlyRentRial,1,999999999999999);
  const d=number(v.depositRial,1,999999999999999);
  if(v.financialMode==="full_deposit")return [{label:"رهن کامل",amount:d?`${d.toLocaleString("fa-IR")} ریال`:"مبلغ اعلام نشده"}];
  return [...(v.financialMode==="deposit_rent"?[{label:"ودیعه",amount:d?`${d.toLocaleString("fa-IR")} ریال`:"مبلغ اعلام نشده"}]:[]),{label:"اجاره ماهانه",amount:r?`${r.toLocaleString("fa-IR")} ریال`:"مبلغ اعلام نشده"}];
 }
 const mode=choices(GARDEN_FINANCIAL_MODES,v.financialMode);
 if(!mode)return []; // legacy untyped finance uses the original generic display
 const money=x=>{const n=number(x,1,999999999999999);return n?`${n.toLocaleString("fa-IR")} ریال`:""};
 const deposit=money(v.depositRial);
 const rent=money(price);
 const period=gardenOfferLabel(GARDEN_RENT_PERIODS,priceType);
 const label=period?`اجاره ${period}`:"اجاره";
 if(mode==="full_deposit")return [{label:"رهن کامل",amount:deposit||"مبلغ اعلام نشده"}];
 const rentalRow={label,amount:rent|| (priceType==="negotiable"?"توافقی":"مبلغ اعلام نشده")};
 return mode==="deposit_rent"?[{label:"ودیعه",amount:deposit||"مبلغ اعلام نشده"},rentalRow]:[rentalRow];
}
export function gardenFinancialHeadline(attrs,price="",priceType="monthly") {
 return gardenFinancialRows(attrs,price,priceType).map(({label,amount})=>`${label} ${amount}`).join(" • ");
}

/** Never show a possible alternative as an actual second rental contract. */
export function gardenRentalBadges(attrs){
 const v=attrs?.schemaVersion===1&&attrs.category==="garden"?attrs.values||{}:{};
 if(!["short","seasonal","long"].includes(v.rentalTerm))return [];
 const names={short:"کوتاه‌مدت",seasonal:"فصلی",long:"بلندمدت"};
 const result=[{term:v.rentalTerm,label:names[v.rentalTerm],state:"primary"}];
 if(v.rentalTerm!=="seasonal"){
  const other=v.rentalTerm==="short"?"long":"short";
  result.push({term:other,label:names[other],state:v.canNegotiateOtherTerm===true?"possible":"inactive"});
 }
 return result;
}
