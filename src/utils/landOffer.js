/** Real land supply contract — never treat intended use as a legal permit. */
import { LAND_PURPOSES, LAND_LEGAL, LAND_LOCATION, LAND_WATER, LAND_FEATURES, LAND_CROPS, LAND_IRRIGATION } from "./landRental.js";

export const LAND_OFFER_DEFAULT = Object.freeze({
  landType: "", allowedPurposes: [], otherPurpose: "", accessRoad: "",
  legalUse: "", locationType: "", slope: "", frontageM: "",
  vehicleAccess: "", waterSources: [], features: [], crops: [], irrigation: "", depositRial: "",
});
export const LAND_OFFER_TYPES = [
  ["vacant", "زمین خالی / بدون بنا"], ["agricultural", "زمین زراعی / آماده کشت"],
  ["prepared", "محوطه روباز آماده استفاده"], ["trees", "زمین درخت‌کاری‌شده"],
];
export const LAND_OFFER_PURPOSES = LAND_PURPOSES;
export const LAND_OFFER_LEGAL = LAND_LEGAL;
export const LAND_OFFER_LOCATION = LAND_LOCATION;
export const LAND_OFFER_WATER = LAND_WATER;
export const LAND_OFFER_FEATURES = LAND_FEATURES;
export const LAND_OFFER_CROPS = LAND_CROPS;
export const LAND_OFFER_IRRIGATION = LAND_IRRIGATION;
export const LAND_OFFER_ROADS = [
  ["asphalt", "آسفالت"], ["gravel", "شنی / سنگ‌ریزه"],
  ["dirt", "خاکی"], ["no_vehicle", "فقط پیاده"], ["unknown", "هنوز مشخص نیست"],
];
export const LAND_OFFER_VEHICLES = [
  ["foot", "فقط پیاده"], ["car", "خودروی سواری"],
  ["van", "وانت"], ["truck", "کامیون"], ["trailer", "تریلی"],
];
export const LAND_OFFER_SLOPES = [
  ["flat", "تقریباً هموار"], ["gentle", "شیب ملایم"], ["steep", "شیب زیاد"],
];
const digits = (v) => String(v ?? "").trim()
  .replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
  .replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
  .replace(/٫/g, ".").replace(/[٬,\s]/g, "");
const isChoice = (opts, v) => opts.some(([key]) => v === key);
const selections = (opts, values) => Array.isArray(values) ?
  [...new Set(values.filter(v=>isChoice(opts,v)))].slice(0,opts.length) : [];
const number = (v, min, max, decimals=2) => {
  const n=digits(v);
  if(!n || !(decimals === 0 ? /^\d+$/.test(n) : /^\d+(?:\.\d{1,2})?$/.test(n)))return null;
  const parsed=Number(n);
  return Number.isFinite(parsed) && parsed>=min && parsed<=max ? parsed : null;
};
export const landOfferLabel = (opts,key) => opts.find(([v])=>v===key)?.[1] || "";
export function landOfferFromAttributes(attrs) {
  const v=attrs?.schemaVersion===1 && attrs.category==="land" && attrs.values && !Array.isArray(attrs.values) ? attrs.values : {};
  const from=(opts,x)=>isChoice(opts,x)?x:"";
  return {
    ...LAND_OFFER_DEFAULT,
    landType:from(LAND_OFFER_TYPES,v.landType),
    allowedPurposes:selections(LAND_OFFER_PURPOSES,v.allowedPurposes),
    otherPurpose:typeof v.otherPurpose === "string" ? v.otherPurpose.slice(0,160) : "",
    accessRoad:from(LAND_OFFER_ROADS,v.accessRoad), legalUse:from(LAND_OFFER_LEGAL,v.legalUse),
    locationType:from(LAND_OFFER_LOCATION,v.locationType), slope:from(LAND_OFFER_SLOPES,v.slope),
    frontageM:v.frontageM==null?"":String(v.frontageM), vehicleAccess:from(LAND_OFFER_VEHICLES,v.vehicleAccess),
    waterSources:selections(LAND_OFFER_WATER,v.waterSources),
    features:selections(LAND_OFFER_FEATURES,v.features),
    crops:(v.landType==="agricultural" || selections(LAND_OFFER_PURPOSES,v.allowedPurposes).includes("agriculture"))?selections(LAND_OFFER_CROPS,v.crops):[],
    irrigation:(v.landType==="agricultural" || selections(LAND_OFFER_PURPOSES,v.allowedPurposes).includes("agriculture"))?from(LAND_OFFER_IRRIGATION,v.irrigation):"",
    depositRial:v.depositRial==null?"":String(v.depositRial),
  };
}
export function validateLandOffer(v={}) {
  if(!isChoice(LAND_OFFER_TYPES,v.landType)) return "وضعیت واقعی زمین را انتخاب کنید.";
  if(!selections(LAND_OFFER_PURPOSES,v.allowedPurposes).length) return "حداقل یک کاربرد قابل ارائه را انتخاب کنید.";
  if(selections(LAND_OFFER_PURPOSES,v.allowedPurposes).includes("other") && String(v.otherPurpose||"").trim().length<5) return "کاربرد دیگر را با حداقل ۵ حرف توضیح دهید.";
  if(!isChoice(LAND_OFFER_ROADS,v.accessRoad)) return "وضعیت راه دسترسی به زمین را مشخص کنید (می‌توانید «هنوز مشخص نیست» را انتخاب کنید).";
  if(digits(v.frontageM) && number(v.frontageM,0.1,5000)===null) return "بر زمین باید عددی بین ۰٫۱ تا ۵۰۰۰ متر باشد.";
  if(digits(v.depositRial) && number(v.depositRial,1,999999999999999,0)===null) return "مبلغ پول پیش معتبر نیست.";
  if(selections(LAND_OFFER_WATER,v.waterSources).includes("none") && selections(LAND_OFFER_WATER,v.waterSources).length>1) return "گزینه «بدون آب» را هم‌زمان با منابع آب انتخاب نکنید.";
  if(selections(LAND_OFFER_WATER,v.waterSources).includes("none") && selections(LAND_OFFER_FEATURES,v.features).includes("water")) return "وجود آب و گزینه «بدون آب» نمی‌توانند هم‌زمان ثبت شوند.";
  return "";
}
export function makeLandAttributes(v={}) {
  const purposes=selections(LAND_OFFER_PURPOSES,v.allowedPurposes);
  const waters=selections(LAND_OFFER_WATER,v.waterSources);
  const isAgri= v.landType==="agricultural" || purposes.includes("agriculture");
  const pick=(opts,key)=>isChoice(opts,key)?key:null;
  return { schemaVersion:1,category:"land",values:{
    landType:pick(LAND_OFFER_TYPES,v.landType),allowedPurposes:purposes,
    otherPurpose:purposes.includes("other")?String(v.otherPurpose||"").trim().slice(0,160):"",
    accessRoad:pick(LAND_OFFER_ROADS,v.accessRoad),
    legalUse:pick(LAND_OFFER_LEGAL,v.legalUse),locationType:pick(LAND_OFFER_LOCATION,v.locationType),
    slope:pick(LAND_OFFER_SLOPES,v.slope),frontageM:number(v.frontageM,0.1,5000),
    vehicleAccess:pick(LAND_OFFER_VEHICLES,v.vehicleAccess),
    waterSources:waters.includes("none") ? ["none"] : waters,
    features:selections(LAND_OFFER_FEATURES,v.features).filter(x=>!(waters.includes("none")&&x==="water")),
    crops:isAgri?selections(LAND_OFFER_CROPS,v.crops):[], irrigation:isAgri?pick(LAND_OFFER_IRRIGATION,v.irrigation):null,
    depositRial:number(v.depositRial,1,999999999999999,0),
  }};
}
