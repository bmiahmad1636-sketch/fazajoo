/** Other spaces — typed offer contracts; legacy listings remain unclassified. All amounts IRR. */
export const OTHER_LAYOUTS = [["indoor","سرپوشیده"],["outdoor","روباز"],["mixed","ترکیبی"]];
export const OTHER_ACCESS = [["normal","دسترسی معمول"],["independent","ورودی مستقل"],["loading","امکان بارگیری"],["flexible","با هماهنگی"]];
export const OTHER_FEATURES = [["water","آب"],["electricity","برق"],["restroom","سرویس بهداشتی"],["parking","پارکینگ"],["loading","بارگیری"],["private","حریم خصوصی"],["internet","اینترنت"],["heating","گرمایش"],["cooling","سرمایش"]];
export const OTHER_SHORT_UNITS = [["daily","روزانه"],["weekly","هفتگی"],["monthly","ماهانه (کوتاه‌مدت)"]];
export const OTHER_LONG_MODES = [["deposit_rent","رهن و اجاره"],["full_deposit","رهن کامل"],["rent_only","فقط اجاره"]];
export const OTHER_OFFER_DEFAULT = Object.freeze({usage:"",layout:"",access:"",features:[],rentalTerm:"",canNegotiateOtherTerm:false,
 shortRateUnit:"daily",shortRateRial:"",securityHoldRial:"",financialMode:"",longDepositRial:"",longMonthlyRentRial:"",limitations:""});
const oneOf=(items,v)=>items.some(([id])=>id===v);
export const otherOfferDigits = value => String(value??"")
 .replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
 .replace(/[٬,\s]/g,"").replace(/\D/g,"");
export const otherOfferMoney=value=>otherOfferDigits(value).replace(/\B(?=(\d{3})+(?!\d))/g,",");
const amount=value=>{const str=String(value??"").replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
 .replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٬,\s]/g,"");
 if(!/^\d{1,15}$/.test(str))return null;const n=Number(str);return Number.isSafeInteger(n)&&n>0?n:null;};
const typed=attrs=>attrs?.category==="other"&&attrs?.schemaVersion===1&&attrs.values&&typeof attrs.values==="object"&&!Array.isArray(attrs.values);
const unique=(v,options)=>Array.isArray(v)?options.filter(([id])=>v.includes(id)).map(([id])=>id):[];
export function otherOfferFromAttributes(attrs){
 if(!typed(attrs))return {...OTHER_OFFER_DEFAULT,features:[]};
 const v=attrs.values;
 return {...OTHER_OFFER_DEFAULT,
  usage:String(v.usage||"").slice(0,180),layout:oneOf(OTHER_LAYOUTS,v.layout)?v.layout:"",access:oneOf(OTHER_ACCESS,v.access)?v.access:"",
  features:unique(v.features,OTHER_FEATURES),rentalTerm:["short","long"].includes(v.rentalTerm)?v.rentalTerm:"",
  canNegotiateOtherTerm:v.canNegotiateOtherTerm===true,
  shortRateUnit:oneOf(OTHER_SHORT_UNITS,v.shortRateUnit)?v.shortRateUnit:"daily",
  shortRateRial:v.rentalTerm==="short"?String(amount(v.shortRateRial)||""):"",
  securityHoldRial:v.rentalTerm==="short"?String(amount(v.securityHoldRial)||""):"",
  financialMode:oneOf(OTHER_LONG_MODES,v.financialMode)?v.financialMode:"",
  longDepositRial:v.rentalTerm==="long"?String(amount(v.longDepositRial)||""):"",
  longMonthlyRentRial:v.rentalTerm==="long"?String(amount(v.longMonthlyRentRial)||""):"",
  limitations:String(v.limitations||"").slice(0,400)};
}
export function validateOtherOffer(d={},area=0,kind=""){
 if(String(kind||"").trim().length<3)return "نام فضای قابل واگذاری را حداقل با ۳ نویسه وارد کنید.";
 if(!Number.isFinite(Number(area))||Number(area)<=0)return "متراژ واقعی این فضا را مشخص کنید.";
 if(String(d.usage||"").trim().length<5)return "کاربرد قابل واگذاری را حداقل با ۵ نویسه توضیح دهید.";
 if(String(d.usage||"").length>180)return "متن کاربرد فضا حداکثر ۱۸۰ نویسه باشد.";
 if(String(d.limitations||"").length>400)return "متن محدودیت‌ها حداکثر ۴۰۰ نویسه باشد.";
 if(!oneOf(OTHER_LAYOUTS,d.layout))return "سرپوشیده یا روباز بودن فضا را مشخص کنید.";
 if(!["short","long"].includes(d.rentalTerm))return "مدت اصلی واگذاری را انتخاب کنید.";
 const must=(v,label)=>amount(v)?"":`${label} را به ریال وارد کنید.`;
 const optional=(v,label)=>otherOfferDigits(v)&&!amount(v)?`${label} معتبر نیست.`:"";
 if(d.rentalTerm==="short") {
  if(!oneOf(OTHER_SHORT_UNITS,d.shortRateUnit))return "دوره محاسبه اجاره کوتاه‌مدت را انتخاب کنید.";
  return must(d.shortRateRial,"مبلغ اجاره کوتاه‌مدت")||optional(d.securityHoldRial,"ودیعه / ضمانت خسارت");
 }
 if(!oneOf(OTHER_LONG_MODES,d.financialMode))return "روش مالی اجاره بلندمدت را انتخاب کنید.";
 if(d.financialMode!=="rent_only") {const error=must(d.longDepositRial,d.financialMode==="full_deposit"?"مبلغ رهن کامل":"ودیعه بلندمدت");if(error)return error;}
 if(d.financialMode!=="full_deposit") {const error=must(d.longMonthlyRentRial,"اجاره ماهانه");if(error)return error;}
 return "";
}
/** Determine where a validation message belongs, without repeating it below the whole form. */
export function otherOfferErrorField(error=""){
 const message=String(error||"");
 if(!message)return "";
 if(/نام فضای/.test(message))return "name";
 if(/متراژ/.test(message))return "area";
 if(/کاربرد/.test(message))return "usage";
 if(/سرپوشیده|روباز/.test(message))return "layout";
 if(/مدت اصلی/.test(message))return "rentalTerm";
 if(/دوره محاسبه/.test(message))return "shortRateUnit";
 if(/مبلغ اجاره کوتاه‌مدت/.test(message))return "shortRateRial";
 if(/ضمانت خسارت/.test(message))return "securityHoldRial";
 if(/روش مالی/.test(message))return "financialMode";
 if(/رهن کامل|ودیعه بلندمدت/.test(message))return "longDepositRial";
 if(/اجاره ماهانه/.test(message))return "longMonthlyRentRial";
 if(/محدودیت‌ها/.test(message))return "limitations";
 return "general";
}
export function makeOtherAttributes(d={}){
 const short=d.rentalTerm==="short",long=d.rentalTerm==="long";
 return {schemaVersion:1,category:"other",values:{
  usage:String(d.usage||"").trim().slice(0,180),layout:oneOf(OTHER_LAYOUTS,d.layout)?d.layout:null,
  access:oneOf(OTHER_ACCESS,d.access)?d.access:null,features:unique(d.features,OTHER_FEATURES),
  limitations:String(d.limitations||"").trim().slice(0,400),rentalTerm:short?"short":long?"long":null,
  canNegotiateOtherTerm:d.canNegotiateOtherTerm===true,
  shortRateUnit:short&&oneOf(OTHER_SHORT_UNITS,d.shortRateUnit)?d.shortRateUnit:null,
  shortRateRial:short?amount(d.shortRateRial):null,securityHoldRial:short?amount(d.securityHoldRial):null,
  financialMode:long&&oneOf(OTHER_LONG_MODES,d.financialMode)?d.financialMode:null,
  longDepositRial:long&&d.financialMode!=="rent_only"?amount(d.longDepositRial):null,
  longMonthlyRentRial:long&&d.financialMode!=="full_deposit"?amount(d.longMonthlyRentRial):null,
 }};
}
export function otherListingPrice(d={}){
 if(d.rentalTerm==="short") {const n=amount(d.shortRateRial);return {price:n?String(n):"",priceType:n&&oneOf(OTHER_SHORT_UNITS,d.shortRateUnit)?d.shortRateUnit:"negotiable"};}
 if(d.rentalTerm==="long"&&d.financialMode!=="full_deposit") {const n=amount(d.longMonthlyRentRial);return {price:n?String(n):"",priceType:n?"monthly":"negotiable"};}
 return {price:"",priceType:"negotiable"};
}
export const otherOfferLabel=(items,id)=>items.find(([k])=>id===k)?.[1]||"";
export function otherFinancialRows(attrs){
 if(!typed(attrs))return [];
 const v=attrs.values;const fmt=n=>amount(n)?`${amount(n).toLocaleString("fa-IR")} ریال`:"مبلغ اعلام نشده";
 if(v.rentalTerm==="short")return [
  {label:`اجاره ${otherOfferLabel(OTHER_SHORT_UNITS,v.shortRateUnit)||"مقطعی"}`,amount:fmt(v.shortRateRial)},
  ...(amount(v.securityHoldRial)?[{label:"ودیعه / ضمانت خسارت",amount:fmt(v.securityHoldRial)}]:[])];
 if(v.rentalTerm==="long")return [
  ...(v.financialMode!=="rent_only"?[{label:v.financialMode==="full_deposit"?"رهن کامل":"ودیعه",amount:fmt(v.longDepositRial)}]:[]),
  ...(v.financialMode!=="full_deposit"?[{label:"اجاره ماهانه",amount:fmt(v.longMonthlyRentRial)}]:[])];
 return [];
}
export const otherFinancialHeadline=attrs=>otherFinancialRows(attrs).map(x=>`${x.label} ${x.amount}`).join(" • ");
export function otherRentalBadges(attrs){
 if(!typed(attrs)||!["short","long"].includes(attrs.values.rentalTerm))return [];
 const primary=attrs.values.rentalTerm,alternative=primary==="short"?"long":"short";
 return [{term:primary,label:primary==="short"?"کوتاه‌مدت":"بلندمدت",state:"primary"},
  {term:alternative,label:alternative==="short"?"کوتاه‌مدت":"بلندمدت",state:attrs.values.canNegotiateOtherTerm===true?"possible":"inactive"}];
}
