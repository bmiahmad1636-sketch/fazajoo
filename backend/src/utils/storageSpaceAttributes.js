"use strict";
const TYPES=["indoor","container","outdoor"];
const PURPOSES=["personal","commercial","food","equipment","other"];
const ACCESS=["24h","office","scheduled"];
const VEHICLES=["none","van","truck","trailer"];
const LOADING=["ground","ramp","lift","stairs"];
const FEATURES=["security","guard","power","water","loading","dry","temperature","truck","ground"];
const only=(a,x)=>a.includes(x)?x:null;
const list=(a,x)=>Array.isArray(x)?[...new Set(x.filter(y=>typeof y==="string" && a.includes(y)))]:[];
function cleanStorageSpaceAttributes(raw,category,side){
 if(category!=="storage"||side!=="offer"||!raw||typeof raw!=="object"||Array.isArray(raw)||raw.schemaVersion!==1||raw.category!=="storage"||!raw.values||typeof raw.values!=="object"||Array.isArray(raw.values))return {};
 const v=raw.values;
 const spaceType=only(TYPES,v.spaceType);
 const vehicleAccess=only(VEHICLES,v.vehicleAccess);
 const loadingMethod=only(LOADING,v.loadingMethod);
 const purposes=list(PURPOSES,v.allowedPurposes);
 const height=Number(String(v.heightM??"").replace(/[۰-۹]/g,x=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(x))).replace(/[٠-٩]/g,x=>String("٠١٢٣٤٥٦٧٨٩".indexOf(x))).replace(/٫/g,"."));
 const features=list(FEATURES.filter(f=>f!=="truck"&&f!=="ground"),v.features);
 if(["van","truck","trailer"].includes(vehicleAccess))features.push("truck");
 if(["ground","lift"].includes(loadingMethod))features.push("ground");
 return {schemaVersion:1,category:"storage",values:{
  spaceType,allowedPurposes:purposes,
  otherPurpose:purposes.includes("other")?String(v.otherPurpose||"").trim().slice(0,160):"",
  access:only(ACCESS,v.access),
  heightM:spaceType!=="outdoor"&&v.heightM!==""&&v.heightM!=null&&Number.isFinite(height)&&height>=1&&height<=20?Number(height.toFixed(2)):null,
  vehicleAccess,loadingMethod,features,
 }};
}
module.exports={cleanStorageSpaceAttributes};
