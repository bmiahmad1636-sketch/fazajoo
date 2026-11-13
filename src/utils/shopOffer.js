/** Standardized real shop/commercial offer. Request preferences remain independent. */
import {SHOP_RENTAL_DEFAULT,pickShopRental,validateShopRental,shopRentalListingPrice,shopRentalMoneyRows} from "./shopRental.js";
import { SHOP_TYPES, SHOP_ACTIVITIES, SHOP_FLOORS, SHOP_LOCATIONS, SHOP_TRANSFER } from "./shopRequest.js";
import {SHOP_RIGHTS, shopRightMoneyLabel} from "./shopRights.js";
import {shopDecimalInput} from "./shopDecimal.js";
export {shopDecimalInput};
export {SHOP_RIGHTS};
export const SHOP_DEAL_TYPES = [["rent","اجاره یا رهن فضای تجاری"],["key_money","واگذاری حق تجاری / سرقفلی"]];
export const SHOP_OFFER_TYPES = SHOP_TYPES;
export const SHOP_OFFER_ACTIVITIES = SHOP_ACTIVITIES;
export const SHOP_OFFER_FLOORS = SHOP_FLOORS.filter(([id])=>id);
export const SHOP_OFFER_LOCATIONS = SHOP_LOCATIONS.filter(([id])=>id);
export const SHOP_OFFER_TRANSFERS = SHOP_TRANSFER;
export const SHOP_OFFER_FEATURES = [
  ["showcase","ویترین"],["storage","انباری داخل واحد"],["parking","پارکینگ اختصاصی"],
  ["elevator","آسانسور"],["ventilation","تهویه"],["night","امکان فعالیت شبانه"]
];
export const SHOP_OFFER_DEFAULT = Object.freeze({
  ...SHOP_RENTAL_DEFAULT,spaceType:"",otherSpaceType:"",allowedActivities:[],otherActivity:"",transferType:"",floor:"",locationPreference:"",
  frontageM:"",features:[],rightsType:"",depositRial:"",monthlyRentRial:"",keyMoneyRial:""
});
const has=(list,id)=>list.some(([k])=>k===id);
const cleanText=v=>String(v??"").trim();
const digits=v=>cleanText(v).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"").replace(/٫/g,".");
function amount(v,max=1000000000000000){const x=digits(v);if(!x||!/^[0-9]+$/.test(x))return null;const n=Number(x);return Number.isSafeInteger(n)&&n>0&&n<=max?n:null;}
const chosen=(list,arr)=>Array.isArray(arr)?[...new Set(arr.filter(x=>has(list,x)))]:[];
/** Display grouping is UI-only; persisted amounts stay unformatted decimal digits. */
export function shopMoneyInputDigits(v){
 return cleanText(v).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
  .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
  .replace(/[^0-9]/g,"");
}
export function formatShopMoneyInput(v){
 return shopMoneyInputDigits(v).replace(/\B(?=(\d{3})+(?!\d))/g,",");
}
export const shopOfferLabel=(list,id)=>list.find(([x])=>x===id)?.[1]||"";
export function shopOfferFromAttributes(attrs){
 const v=attrs?.schemaVersion===1&&attrs?.category==="shop"&&attrs?.values&&!Array.isArray(attrs.values)?attrs.values:{};
 return {...SHOP_OFFER_DEFAULT,
  ...(["short","long"].includes(v.rentalTerm)?pickShopRental(v,false):{}),
  spaceType:has(SHOP_OFFER_TYPES,v.spaceType)?v.spaceType:"",
  otherSpaceType:v.spaceType==="other"?cleanText(v.otherSpaceType).slice(0,160):"",
  allowedActivities:chosen(SHOP_OFFER_ACTIVITIES,v.allowedActivities),
  otherActivity:cleanText(v.otherActivity).slice(0,160),
  transferType:has(SHOP_OFFER_TRANSFERS,v.transferType)?v.transferType:"",
  floor:has(SHOP_OFFER_FLOORS,v.floor)?v.floor:"",
  locationPreference:has(SHOP_OFFER_LOCATIONS,v.locationPreference)?v.locationPreference:"",
  frontageM:["mall","complex","booth"].includes(v.spaceType)||v.frontageM==null?"":String(v.frontageM),
  features:chosen(SHOP_OFFER_FEATURES,v.features).filter(x=>["mall","complex"].includes(v.spaceType)||x!=="elevator"),
  rightsType:has(SHOP_RIGHTS,v.rightsType)?v.rightsType:"",
  depositRial:v.depositRial==null?"":String(v.depositRial),
  monthlyRentRial:v.monthlyRentRial==null?"":String(v.monthlyRentRial),
  keyMoneyRial:v.keyMoneyRial==null?"":String(v.keyMoneyRial)
 };
}
export function validateShopOffer(v={}){
 if(!has(SHOP_OFFER_TYPES,v.spaceType))return "نوع فضای تجاری موجود را انتخاب کنید.";
 if(v.spaceType==="other"&&cleanText(v.otherSpaceType).length<4)return "نوع فضای تجاری دیگر را توضیح دهید.";
 if(!chosen(SHOP_OFFER_ACTIVITIES,v.allowedActivities).length)return "حداقل یک فعالیت قابل ارائه را انتخاب کنید.";
 if((v.allowedActivities||[]).includes("other")&&cleanText(v.otherActivity).length<4)return "فعالیت دیگر را حداقل در ۴ حرف توضیح دهید.";
 if(!has(SHOP_OFFER_TRANSFERS,v.transferType))return "نوع واگذاری واقعی ملک را انتخاب کنید.";
 if(v.transferType==="key_money"&&!has(SHOP_RIGHTS,v.rightsType))return "نوع حق مورد واگذاری را مشخص کنید.";
 if(!["mall","complex","booth"].includes(v.spaceType)&&cleanText(v.frontageM) && (!/^\d+(?:\.\d{1,2})?$/.test(digits(v.frontageM)) || Number(digits(v.frontageM))<=0 || Number(digits(v.frontageM))>1000))return "بر مغازه باید عددی بین صفر و ۱۰۰۰ متر باشد.";
 const monetaryFields=v.transferType==="rent"?["depositRial","monthlyRentRial"]:v.transferType==="full_deposit"?["depositRial"]:v.transferType==="key_money"?["keyMoneyRial"]:[];
 for(const key of monetaryFields){
   if(cleanText(v[key])&&!amount(v[key]))return "مبالغ مالی را به‌صورت عدد صحیح مثبت و به ریال وارد کنید.";
 }
 return "";
}
export function makeShopAttributes(v={}){
 const spaceType=has(SHOP_OFFER_TYPES,v.spaceType)?v.spaceType:null;
 const activities=chosen(SHOP_OFFER_ACTIVITIES,v.allowedActivities);
 const transfer=has(SHOP_OFFER_TRANSFERS,v.transferType)?v.transferType:null;
 const floor=has(SHOP_OFFER_FLOORS,v.floor)?v.floor:null;
 return {schemaVersion:1,category:"shop",values:{
  ...(["short","long"].includes(v.rentalTerm)&&transfer!=="key_money"?pickShopRental(v,false):{}),
  spaceType,otherSpaceType:spaceType==="other"?cleanText(v.otherSpaceType).slice(0,160):"",allowedActivities:activities,otherActivity:activities.includes("other")?cleanText(v.otherActivity).slice(0,160):"",
  transferType:transfer,floor,locationPreference:has(SHOP_OFFER_LOCATIONS,v.locationPreference)?v.locationPreference:null,
  frontageM:(()=>{if(["mall","complex","booth"].includes(spaceType))return null;const x=digits(v.frontageM);return /^\d+(?:\.\d{1,2})?$/.test(x)&&Number(x)>0&&Number(x)<=1000?Number(x):null;})(),
  features:chosen(SHOP_OFFER_FEATURES,v.features).filter(x=>["mall","complex"].includes(v.spaceType)||x!=="elevator"),rightsType:transfer==="key_money"&&has(SHOP_RIGHTS,v.rightsType)?v.rightsType:null,
  depositRial:!["short","long"].includes(v.rentalTerm)&&["rent","full_deposit"].includes(transfer)?amount(v.depositRial):null,
  monthlyRentRial:!["short","long"].includes(v.rentalTerm)&&transfer==="rent"?amount(v.monthlyRentRial):null,
  keyMoneyRial:transfer==="key_money"?amount(v.keyMoneyRial):null
 }};
}
/** The generic price is monthly rent ONLY, never deposit or commercial rights. */
export function shopListingPrice(v={}){
 if(v.transferType!=="key_money"&&["short","long"].includes(v.rentalTerm))return shopRentalListingPrice(v,false);
 const rent=v.transferType==="rent"?amount(v.monthlyRentRial):null;
 return rent?{price:String(rent),priceType:"monthly"}:{price:"",priceType:"negotiable"};
}

/** Truthful public price label: never mix monthly rent with a one-off commercial right. */
export function shopFinancialHeadline(attrs) {
 const v=attrs?.schemaVersion===1&&attrs?.category==="shop"?attrs.values:null;
 if(!v)return "";
 if(v.transferType!=="key_money"&&["short","long"].includes(v.rentalTerm))return shopRentalMoneyRows(v,false).map(r=>`${r.label}: ${r.amount}`).join(" • ");
 const fmt=n=>Number.isSafeInteger(Number(n))&&Number(n)>0?`${Number(n).toLocaleString("fa-IR")} ریال`:"";
 if(v.transferType==="rent"){
  const parts=[];
  if(fmt(v.depositRial)) parts.push(`ودیعه ${fmt(v.depositRial)}`);
  parts.push(fmt(v.monthlyRentRial)?`اجاره ماهانه ${fmt(v.monthlyRentRial)}`:"اجاره توافقی");
  return parts.join(" • ");
 }
 if(v.transferType==="full_deposit")return fmt(v.depositRial)?`رهن کامل ${fmt(v.depositRial)}`:"رهن کامل توافقی";
 if(v.transferType==="key_money")return `${shopRightMoneyLabel(v.rightsType,false)}: ${fmt(v.keyMoneyRial)||"توافقی پس از بررسی مدارک"}`;
 return "";
}

/** Structured public shop prices for readable details. Unknown amounts are not invented. */
export function shopFinancialRows(attrs) {
 const v=attrs?.schemaVersion===1&&attrs?.category==="shop"?attrs.values:null;
 if(!v)return [];
 if(v.transferType!=="key_money"&&["short","long"].includes(v.rentalTerm))return shopRentalMoneyRows(v,false);
 const money=n=>Number.isSafeInteger(Number(n))&&Number(n)>0?`${Number(n).toLocaleString("fa-IR")} ریال`:"";
 if(v.transferType==="rent") {
  const deposit=money(v.depositRial);
  return [...(deposit?[{label:"ودیعه",amount:deposit}]:[]),{label:"اجاره ماهانه",amount:money(v.monthlyRentRial)||"توافقی"}];
 }
 if(v.transferType==="full_deposit")return [{label:"رهن کامل",amount:money(v.depositRial)||"توافقی"}];
 if(v.transferType==="key_money")return [{label:shopRightMoneyLabel(v.rightsType,false),amount:money(v.keyMoneyRial)||"توافقی پس از بررسی مدارک"}];
 return [];
}
