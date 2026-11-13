/** Real industrial shed/workshop supply, independent of demand metadata. */
import { INDUSTRIAL_RENTAL_DEFAULT, pickIndustrialRental } from "./industrialRental.js";
import { SHED_TYPES, shedActivitiesFor } from "./shedRequest.js";

export const INDUSTRIAL_OFFER_DEFAULT = Object.freeze({
  spaceType: "", allowedActivities: [], otherActivity: "", power: "",
  powerCapacityKw: "", heightM: "", vehicleAccess: "", features: [],
  flooring: "", craneCapacityTons: "", operationHours: "",
  ...INDUSTRIAL_RENTAL_DEFAULT,
});
export const INDUSTRIAL_TYPES = SHED_TYPES;
export const INDUSTRIAL_FEATURE_OPTIONS = [
  ["water","آب"],["gas","گاز"],["security","نگهبانی / امنیت"],
  ["ventilation","تهویه"],["office","فضای اداری"],["wc","سرویس بهداشتی"],
  ["loading","محوطه بارگیری"],["floor","کف مقاوم صنعتی"],
  ["fire_safety","تجهیزات ایمنی حریق"],["crane","جرثقیل سقفی"],
  ["truck_yard","محوطه مانور کامیون"],["soundproof","عایق صوتی"],
  ["workbench","میزکار / فضای کار"],
];
export const industrialFeaturesFor = (type) => INDUSTRIAL_FEATURE_OPTIONS.filter(([key]) =>
  type === "shed" ? !["soundproof","workbench"].includes(key)
  : type === "workshop" ? !["crane","truck_yard"].includes(key)
  : false
);
export const INDUSTRIAL_POWER = [["none","انشعاب برق ندارد"],["single","تک‌فاز"],["three","سه‌فاز"],["both","تک‌فاز و سه‌فاز"]];
export const INDUSTRIAL_VEHICLES = [["none","فقط دسترسی پیاده"],["van","وانت"],["truck","کامیون"],["trailer","تریلی"]];
export const INDUSTRIAL_FLOORS = [["concrete","بتن"],["reinforced","کف صنعتی مقاوم"],["tile","سرامیک / موزاییک"],["earth","خاکی / آسفالت"],["other","سایر"]];
export const INDUSTRIAL_HOURS = [["24h","شبانه‌روزی"],["day","ساعات روز"],["scheduled","با هماهنگی"],["restricted","ساعات محدود"]];
const asText = v => String(v ?? "").trim();
const numText = v => asText(v).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/٫/g,".");
const isOption = (list,v) => list.some(([id])=>id===v);
const selected = (options, raw) => Array.isArray(raw)?[...new Set(raw.filter(v=>isOption(options,v)))]:[];
const numeric = (value,min,max) => {const v=numText(value); if(!v) return null; if(!/^\d+(?:\.\d{1,2})?$/.test(v))return null;const n=Number(v);return n>=min&&n<=max?n:null;};
export const industrialLabel=(list,value)=>list.find(([id])=>id===value)?.[1]||"";
export function industrialOfferFromAttributes(attrs) {
 const v=attrs?.schemaVersion===1 && attrs?.category==="warehouse" && attrs?.values && !Array.isArray(attrs.values) ? attrs.values : {};
 const t=isOption(INDUSTRIAL_TYPES,v.spaceType)?v.spaceType:"";
 return { ...INDUSTRIAL_OFFER_DEFAULT, ...pickIndustrialRental(v),
   spaceType:t, allowedActivities:selected(shedActivitiesFor(t),v.allowedActivities),
   otherActivity:asText(v.otherActivity).slice(0,160), power:isOption(INDUSTRIAL_POWER,v.power)?v.power:"",
   powerCapacityKw:v.powerCapacityKw==null?"":String(v.powerCapacityKw),
   heightM:v.heightM==null?"":String(v.heightM),
   vehicleAccess:isOption(INDUSTRIAL_VEHICLES,v.vehicleAccess)?v.vehicleAccess:"",
   features:selected(industrialFeaturesFor(t),v.features),
   flooring:isOption(INDUSTRIAL_FLOORS,v.flooring)?v.flooring:"",
   craneCapacityTons:v.craneCapacityTons==null?"":String(v.craneCapacityTons),
   operationHours:isOption(INDUSTRIAL_HOURS,v.operationHours)?v.operationHours:"",
 };
}
export function validateIndustrialOffer(v={}) {
 const t=v.spaceType;
 if(!isOption(INDUSTRIAL_TYPES,t))return "نوع فضای موجود (سوله یا کارگاه) را مشخص کنید.";
 if(!selected(shedActivitiesFor(t),v.allowedActivities).length)return "حداقل یک فعالیت قابل انجام در فضا را انتخاب کنید.";
 if((v.allowedActivities||[]).includes("other") && asText(v.otherActivity).length<5)return "فعالیت دیگر را حداقل در ۵ حرف توضیح دهید.";
 if(!isOption(INDUSTRIAL_POWER,v.power))return "وضعیت واقعی برق مجموعه را مشخص کنید.";
 if(numText(v.heightM) && numeric(v.heightM,1,40)===null)return "ارتفاع مفید باید بین ۱ تا ۴۰ متر باشد.";
 if(["three","both"].includes(v.power) && numText(v.powerCapacityKw) && numeric(v.powerCapacityKw,1,20000)===null)return "توان برق باید بین ۱ تا ۲۰۰۰۰ کیلووات باشد.";
 if(numText(v.craneCapacityTons) && numeric(v.craneCapacityTons,0.1,500)===null)return "ظرفیت جرثقیل باید بین ۰٫۱ تا ۵۰۰ تن باشد.";
 if(numText(v.craneCapacityTons) && !selected(industrialFeaturesFor(t),v.features).includes("crane"))return "برای ثبت ظرفیت جرثقیل، وجود جرثقیل سقفی را نیز انتخاب کنید.";
 return "";
}
export function makeIndustrialAttributes(v={}) {
 const t=isOption(INDUSTRIAL_TYPES,v.spaceType)?v.spaceType:null;
 const activities=t?selected(shedActivitiesFor(t),v.allowedActivities):[];
 const features=t?selected(industrialFeaturesFor(t),v.features):[];
 const power=isOption(INDUSTRIAL_POWER,v.power)?v.power:null;
 return { schemaVersion:1,category:"warehouse",values:{
  ...pickIndustrialRental(v), spaceType:t,allowedActivities:activities,otherActivity:activities.includes("other")?asText(v.otherActivity).slice(0,160):"",
  power,powerCapacityKw:["three","both"].includes(power)?numeric(v.powerCapacityKw,1,20000):null,
  heightM:numeric(v.heightM,1,40),vehicleAccess:isOption(INDUSTRIAL_VEHICLES,v.vehicleAccess)?v.vehicleAccess:null,
  features,flooring:isOption(INDUSTRIAL_FLOORS,v.flooring)?v.flooring:null,
  craneCapacityTons:features.includes("crane")?numeric(v.craneCapacityTons,0.1,500):null,
  operationHours:isOption(INDUSTRIAL_HOURS,v.operationHours)?v.operationHours:null,
 }};
}
