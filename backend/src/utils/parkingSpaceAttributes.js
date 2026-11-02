"use strict";
const CATS = ["car","motorcycle","both","other"];
const COVER = ["covered","open"];
const ACCESS = ["anytime","daytime","scheduled"];
const STYLE = ["independent","tandem","shared"];
const SECURITY = ["camera","guard","gated","lighting"];
function cleanParkingSpaceAttributes(raw, category, side) {
  if (category !== "parking" || side !== "offer" || !raw || typeof raw !== "object" || Array.isArray(raw) || raw.schemaVersion !== 1 || raw.category !== "parking" || !raw.values || typeof raw.values !== "object" || Array.isArray(raw.values)) return {};
  const x=raw.values;
  const safe=(list,v)=>list.includes(v)?v:null;
  const height=Number(x.entranceHeightCm);
  return {schemaVersion:1,category:"parking",values:{
    vehicleUsage:safe(CATS,x.vehicleUsage), cover:safe(COVER,x.cover), access:safe(ACCESS,x.access),
    parkingStyle:safe(STYLE,x.parkingStyle),
    entranceHeightCm:x.cover === "covered" && x.entranceHeightCm !== null && x.entranceHeightCm !== undefined && x.entranceHeightCm !== "" && Number.isInteger(height) && height>=100 && height<=500 ? height : null,
    securityFeatures:Array.isArray(x.securityFeatures)?[...new Set(x.securityFeatures.filter(v=>SECURITY.includes(v)))]:[],
    usageNotes:x.vehicleUsage==="other"?String(x.usageNotes||"").trim().slice(0,160):"",
  }};
}
module.exports={cleanParkingSpaceAttributes};
