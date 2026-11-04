/** Server whitelist for actual shop offers; never trust user-supplied derived matches. */
const TYPES = new Set(["street","mall","complex","booth","large","other"]);
const ACTIVITIES = new Set(["clothing","food","mobile","jewelry","beauty","services","restaurant","other"]);
const TRANSFERS = new Set(["rent","full_deposit","key_money"]);
const FLOORS = new Set(["ground","basement","upper","first"]);
const LOCATIONS = new Set(["entrance","escalator","main","street","corner"]);
const FEATURES = new Set(["showcase","storage","parking","elevator","ventilation","night"]);
const RIGHTS = new Set(["key_money","business_right","unsure"]);
const option=(v,allowed)=>allowed.has(v)?v:null;
const many=(v,allowed)=>Array.isArray(v)?[...new Set(v.filter(x=>allowed.has(x)))]:[];
const numeric=(v,max,decimal=false)=>{
 if(v===null||v===undefined||v==="")return null;
 const s=String(v).trim().replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"").replace(/٫/g,".");
 if(!(decimal?/^\d+(?:\.\d{1,2})?$/:/^\d+$/).test(s))return null;
 const n=Number(s);return Number.isFinite(n)&&n>0&&n<=max&&(decimal||Number.isSafeInteger(n))?n:null;
};
function cleanShopSpaceAttributes(raw,category,side){
 if(category!=="shop"||side!=="offer"||!raw||typeof raw!=="object"||Array.isArray(raw)||raw.schemaVersion!==1||raw.category!=="shop"||!raw.values||typeof raw.values!=="object"||Array.isArray(raw.values))return {};
 const v=raw.values,transfer=option(v.transferType,TRANSFERS),activities=many(v.allowedActivities,ACTIVITIES);
 return {schemaVersion:1,category:"shop",values:{
  spaceType:option(v.spaceType,TYPES),otherSpaceType:v.spaceType==="other"?String(v.otherSpaceType||"").trim().slice(0,160):"",allowedActivities:activities,
  otherActivity:activities.includes("other")?String(v.otherActivity||"").trim().slice(0,160):"",
  transferType:transfer,floor:option(v.floor,FLOORS),locationPreference:option(v.locationPreference,LOCATIONS),
  frontageM:["mall","complex","booth"].includes(v.spaceType)?null:numeric(v.frontageM,1000,true),features:many(v.features,FEATURES).filter(x=>["mall","complex"].includes(v.spaceType)||x!=="elevator"),
  rightsType:transfer==="key_money"?option(v.rightsType,RIGHTS):null,
  depositRial:["rent","full_deposit"].includes(transfer)?numeric(v.depositRial,1000000000000000):null,
  monthlyRentRial:transfer==="rent"?numeric(v.monthlyRentRial,1000000000000000):null,
  keyMoneyRial:transfer==="key_money"?numeric(v.keyMoneyRial,1000000000000000):null
 }};
}
module.exports={cleanShopSpaceAttributes};
