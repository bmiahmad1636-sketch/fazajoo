"use strict";
// Server-side whitelist; never trust client-supplied derived features.
const {cleanIndustrialFinance}=require("./industrialRentalFinance");
const TYPES=["shed","workshop"];
const SHED_ACTIVITY=["production","heavy","logistics","packaging","storage","other"];
const WORK_ACTIVITY=["wood","metal","repair","light","craft","packaging","other"];
const SHARED_FEATURES=["water","gas","security","ventilation","office","wc","loading","floor","fire_safety"];
const SHED_FEATURES=["crane","truck_yard"];
const WORK_FEATURES=["soundproof","workbench"];
const POWER=["none","single","three","both"];
const VEHICLES=["none","van","truck","trailer"];
const FLOORING=["concrete","reinforced","tile","earth","other"];
const HOURS=["24h","day","scheduled","restricted"];
const only=(choices,value)=>choices.includes(value)?value:null;
const list=(choices,value)=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==="string"&&choices.includes(v)))]:[];
function number(raw,min,max){
 if(raw===null||raw===undefined||raw==="")return null;
 const str=String(raw).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/٫/g,".");
 if(!/^\d+(?:\.\d{1,2})?$/.test(str))return null;
 const n=Number(str);return Number.isFinite(n)&&n>=min&&n<=max?n:null;
}
function cleanIndustrialSpaceAttributes(raw,category,side){
 if(category!=="warehouse"||side!=="offer"||!raw||typeof raw!=="object"||Array.isArray(raw)||raw.schemaVersion!==1||raw.category!=="warehouse"||!raw.values||typeof raw.values!=="object"||Array.isArray(raw.values))return {};
 const v=raw.values, type=only(TYPES,v.spaceType),activities=type==="shed"?SHED_ACTIVITY:type==="workshop"?WORK_ACTIVITY:[];
 const features=type==="shed"?[...SHARED_FEATURES,...SHED_FEATURES]:type==="workshop"?[...SHARED_FEATURES,...WORK_FEATURES]:[];
 const power=only(POWER,v.power);
 const safeFeatures=list(features,v.features);
 const safeActivities=list(activities,v.allowedActivities);
 return {schemaVersion:1,category:"warehouse",values:{
  ...cleanIndustrialFinance(v,false),spaceType:type,allowedActivities:safeActivities,otherActivity:safeActivities.includes("other")?String(v.otherActivity||"").trim().slice(0,160):"",
  power,powerCapacityKw:["three","both"].includes(power)?number(v.powerCapacityKw,1,20000):null,
  heightM:number(v.heightM,1,40),vehicleAccess:only(VEHICLES,v.vehicleAccess),features:safeFeatures,
  flooring:only(FLOORING,v.flooring),craneCapacityTons:safeFeatures.includes("crane")?number(v.craneCapacityTons,0.1,500):null,
  operationHours:only(HOURS,v.operationHours),
 }};
}
module.exports={cleanIndustrialSpaceAttributes};
