import {SHOP_WANTED_FINANCE_DEFAULT,pickShopRental,shopRentalMoneyRows} from "./shopRental.js";
import {shopRightMoneyLabel} from "./shopRights.js";
import {shopDecimalInput} from "./shopDecimal.js";
// Wanted-shop preferences are stored in the existing description field.
export const EMPTY_SHOP_REQUEST = {...SHOP_WANTED_FINANCE_DEFAULT,spaceType:"",otherSpaceType:"",activity:"",otherActivity:"",minArea:"",maxArea:"",floor:"",locationPreference:"",frontage:"",features:[],transferType:"rent",deposit:"",monthlyRent:"",keyMoney:"",rightsType:"",requirements:""};
export const SHOP_TYPES = [["street","مغازه بر خیابان"],["mall","مغازه داخل پاساژ"],["complex","واحد تجاری در مجتمع"],["booth","غرفه / کیوسک"],["large","فروشگاه بزرگ"],["other","سایر"]];
export const SHOP_ACTIVITIES = [["clothing","پوشاک و کیف و کفش"],["food","مواد غذایی و سوپرمارکت"],["mobile","موبایل و لوازم دیجیتال"],["jewelry","طلا و جواهر"],["beauty","آرایشی و بهداشتی"],["services","خدماتی"],["restaurant","رستوران و کافه"],["other","سایر"]];
export const SHOP_FLOORS = [["","فرقی ندارد"],["ground","همکف"],["basement","زیرزمین"],["upper","طبقات بالاتر"],["first","طبقه اول"]];
export const SHOP_LOCATIONS = [["","فرقی ندارد"],["entrance","نزدیک ورودی"],["escalator","نزدیک پله‌برقی"],["main","راهروی اصلی / پرتردد"],["street","بر خیابان اصلی"],["corner","نبش / دوبر"]];
export const SHOP_FEATURES = [["showcase","ویترین"],["storage","انبار"],["water","آب"],["gas","گاز"],["electricity","برق"],["threePhase","برق سه‌فاز"],["restroom","سرویس بهداشتی"],["parking","پارکینگ"],["elevator","آسانسور"],["ventilation","تهویه"],["night","امکان فعالیت شبانه"]];
export const SHOP_TRANSFER = [["rent","اجاره یا رهن"],["full_deposit","رهن کامل"],["key_money","واگذاری حق تجاری / سرقفلی"]];
const MARK = /^\[FAZAJOO_SHOP_REQUEST:([^\]\n]+)\]\n?/;
export function readShopRequest(description="") {const text=String(description||"");const m=text.match(MARK);let parsed={};if(m){try{parsed=JSON.parse(decodeURIComponent(m[1]))}catch{parsed={}}}return {data:{...EMPTY_SHOP_REQUEST,...parsed,features:Array.isArray(parsed.features)?parsed.features:[]},description:m?text.slice(m[0].length).trim():text.trim()};}
export function writeShopRequest(data){
 const safe={...EMPTY_SHOP_REQUEST,...data,features:Array.isArray(data?.features)?data.features:[]};
 const rental=safe.transferType==="rent";
 const cleaned={...safe,...(rental?pickShopRental(safe,true):SHOP_WANTED_FINANCE_DEFAULT),
  deposit:"",monthlyRent:"",keyMoney:rental?"":safe.keyMoney,rightsType:rental?"":safe.rightsType};
 // Store only non-default attributes. This keeps Persian encoded request metadata well below
 // the backend description limit and lets the reader reconstruct defaults on edit.
 const compact=Object.fromEntries(Object.entries(cleaned).filter(([key,val])=>{
   if(val===undefined||val===null||val==="")return false;
   if(Array.isArray(val)&&val.length===0)return false;
   // Server must receive the explicitly selected term AND its calculation period,
   // even when the period equals the UI default (daily or monthly).
   if(key==="transferType" || (rental && key==="rentalTerm"))return true;
   if(rental && safe.rentalTerm==="short" && key==="shortRateUnit")return true;
   if(rental && safe.rentalTerm==="long" && ["longRateUnit","financialMode"].includes(key))return true;
   if(key in EMPTY_SHOP_REQUEST&&EMPTY_SHOP_REQUEST[key]===val)return false;
   return true;
 }));
 return `[FAZAJOO_SHOP_REQUEST:${encodeURIComponent(JSON.stringify(compact))}]`;
}
export function shopOptionLabel(options,value){return options.find(([id])=>id===value)?.[1]||value||"تعیین نشده";}
export function shopRequestValidation(d={}){if(!d.spaceType)return "نوع فضای تجاری را انتخاب کنید.";if(d.spaceType==="other"&&String(d.otherSpaceType||"").trim().length<4)return "نوع فضای تجاری دیگر را توضیح دهید.";if(!d.activity)return "نوع فعالیت را انتخاب کنید.";if(d.activity==="other"&&String(d.otherActivity||"").trim().length<4)return "فعالیت دیگر را توضیح دهید.";const min=Number(d.minArea||0),max=Number(d.maxArea||0);if(min<0||max<0||(min&&max&&min>max))return "محدوده متراژ معتبر نیست.";if(!d.transferType)return "نوع واگذاری را مشخص کنید.";
 const front=String(d.frontage??"").trim();const normalized=shopDecimalInput(front);
 if(front && (normalized!==front.replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٫,،]/g,".") || !/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized)<=0 || Number(normalized)>1000))return "برِ مغازه باید عدد مثبت تا ۱۰۰۰ متر با حداکثر دو رقم اعشار باشد.";
if(d.transferType==="key_money"&&!d.rightsType)return "نوع حق سرقفلی یا کسب‌وپیشه را مشخص کنید.";for(const k of ["deposit","monthlyRent","keyMoney"]){const v=String(d[k]||"").replace(/,/g,"");if(v&&!/^\d+$/.test(v))return "مبلغ بودجه باید عددی باشد."}if(writeShopRequest(d).length>4800)return "متن شرایط خاص بیش از حد طولانی است؛ آن را کوتاه‌تر کنید.";return "";}

export function shopWantedFinancialRows(v={}) {
 if(v.transferType==="key_money"){
  const n=Number(String(v.keyMoney||"").replace(/[,٬\s]/g,""));
  return v.rightsType?[{label:shopRightMoneyLabel(v.rightsType,true),amount:Number.isSafeInteger(n)&&n>0?`${n.toLocaleString("fa-IR")} ریال`:"بودجه اعلام نشده"}]:[];
 }
 return ["short","long"].includes(v.rentalTerm)?shopRentalMoneyRows(v,true):[];
}
export const shopWantedFinancialHeadline=v=>shopWantedFinancialRows(v).map(r=>`${r.label}: ${r.amount}`).join(" • ");
export function shopRequestAreaText(v={}){
 const a=Number(v.minArea||0),b=Number(v.maxArea||0);
 if(a>0&&b>0)return `${a.toLocaleString("fa-IR")} تا ${b.toLocaleString("fa-IR")} مترمربع`;
 if(a>0)return `حداقل ${a.toLocaleString("fa-IR")} مترمربع`;
 if(b>0)return `حداکثر ${b.toLocaleString("fa-IR")} مترمربع`;
 return "";
}
