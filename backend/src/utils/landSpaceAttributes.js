"use strict";
/** Server-side land supply whitelist. Fields never constitute a verified permit. */
const TYPES=new Set(["vacant","agricultural","prepared","trees"]);
const PURPOSES=new Set(["agriculture","parking","depot","livestock","construction","event","logistics","tourism","commerce","infrastructure","personal","other"]);
const ROADS=new Set(["asphalt","gravel","dirt","no_vehicle","unknown"]);
const LEGAL=new Set(["agricultural","garden","residential","commercial","industrial","other"]);
const LOCATION=new Set(["urban","suburb","rural","industrial","outside"]);
const SLOPES=new Set(["flat","gentle","steep"]);
const VEHICLES=new Set(["foot","car","van","truck","trailer"]);
const WATER=new Set(["well","qanat","river","network","water_right","reservoir","none"]);
const CROPS=new Set(["wheat","barley","corn","vegetables","saffron","medicinal","orchard","nursery","greenhouse","other"]);
const IRRIGATION=new Set(["flood","drip","sprinkler","rainfed","other"]);
const FEATURES=new Set(["fence","road","truck","tractor","electricity","three_phase","gas","water","level","office","restroom","loading"]);
const only=(set,v)=>set.has(v)?v:null;
const list=(set,v)=>Array.isArray(v)?[...new Set(v.filter(x=>set.has(x)))].slice(0,set.size):[];
const normalized=(value)=>String(value??"").trim().replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/٫/g,".").replace(/[٬,\s]/g,"");
function number(value,min,max,decimals=2){
 const s=normalized(value);
 if(!s || !(decimals === 0 ? /^\d+$/.test(s) : /^\d+(?:\.\d{1,2})?$/.test(s)))return null;
 const n=Number(s);return Number.isFinite(n)&&n>=min&&n<=max?n:null;
}
function cleanLandSpaceAttributes(raw, category, side){
 if(category!=="land" || side!=="offer" || !raw || Array.isArray(raw) || raw.schemaVersion!==1 || raw.category!=="land" || !raw.values || typeof raw.values!=="object" || Array.isArray(raw.values))return {};
 const v=raw.values;
 const purposes=list(PURPOSES,v.allowedPurposes),waters=list(WATER,v.waterSources);
 const isAgri = v.landType === "agricultural" || purposes.includes("agriculture");
 return {schemaVersion:1,category:"land",values:{
   landType:only(TYPES,v.landType), allowedPurposes:purposes,
   otherPurpose:purposes.includes("other")&&typeof v.otherPurpose==="string"?v.otherPurpose.trim().slice(0,160):"",
   accessRoad:only(ROADS,v.accessRoad), legalUse:only(LEGAL,v.legalUse),
   locationType:only(LOCATION,v.locationType), slope:only(SLOPES,v.slope),
   frontageM:number(v.frontageM,0.1,5000), vehicleAccess:only(VEHICLES,v.vehicleAccess),
   waterSources:waters.includes("none")?["none"]:waters,
   features:list(FEATURES,v.features).filter(x=>!(waters.includes("none")&&x==="water")), crops:isAgri?list(CROPS,v.crops):[], irrigation:isAgri?only(IRRIGATION,v.irrigation):null, depositRial:number(v.depositRial,1,999999999999999,0),
 }};
}
module.exports={cleanLandSpaceAttributes};
