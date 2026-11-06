/** Phase08: strict whitelist for supplied villa attributes; no inference for demand/legacy. */
const TYPES=["villa","garden_villa","cottage","rural","suite","other"];
const STAYS=["daily","weekend","weekly","monthly","flexible"];
const PRIVACY=["private","shared","unknown"];
const LONG_MODES=["full_deposit","rent_only","deposit_rent"];
// Derived amenities must come from the real villaDetails flags, not from an untrusted features list.
const EXTRA_FEATURES=["indoor_pool","gazebo"];
const SOURCE_FLAGS={pool:"pool",heatedPool:"heated_pool",yard:"private_yard",furnished:"furnished",
 parking:"parking",barbecue:"barbecue",wifi:"wifi",petFriendly:"pet_friendly"};
const unique=(arr,allowed)=>Array.isArray(arr)?[...new Set(arr.filter(x=>typeof x==="string"&&allowed.includes(x)))].slice(0,allowed.length):[];
const digits=value=>String(value??"").replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
 .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"");
function cleanDeposit(value){const s=digits(value);if(!/^\d{1,15}$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)&&n>0?n:null;}
function cleanVillaSpaceAttributes(attrs,category,side,villaDetails={}){
 if(category!=="villa"||side!=="offer"||!attrs||attrs.schemaVersion!==1||attrs.category!=="villa"||
   !attrs.values||typeof attrs.values!=="object"||Array.isArray(attrs.values))return {};
 const v=attrs.values;
 const type=TYPES.includes(v.accommodationType)?v.accommodationType:null;
 const d=villaDetails && typeof villaDetails==="object" && !Array.isArray(villaDetails) ? villaDetails : {};
 const features=unique(v.features,EXTRA_FEATURES);
 for (const [flag,name] of Object.entries(SOURCE_FLAGS)) {
   if(d[flag]===true && (flag!=="heatedPool" || d.pool===true))features.push(name);
 }
 if((Array.isArray(d.heatingSystems) && d.heatingSystems.length) || d.heating===true)features.push("heating");
 if((Array.isArray(d.coolingSystems) && d.coolingSystems.length) || d.airConditioning===true)features.push("air_conditioning");
 return {schemaVersion:1,category:"villa",values:{
  accommodationType:type,otherType:type==="other"?String(v.otherType||"").trim().slice(0,80):"",
  rentalTerm:v.rentalTerm==="long"?"long":"short",
  canNegotiateOtherTerm:v.canNegotiateOtherTerm===true,
  availableStays:v.rentalTerm==="long"?[]:unique(v.availableStays,STAYS),
  privacy:PRIVACY.includes(v.privacy)?v.privacy:null,features:[...new Set(features)],
  depositRial:v.rentalTerm==="long"?null:cleanDeposit(v.depositRial),
  financialMode:v.rentalTerm==="long"&&LONG_MODES.includes(v.financialMode)?v.financialMode:null,
  longDepositRial:v.rentalTerm==="long"&&v.financialMode!=="rent_only"?cleanDeposit(v.longDepositRial):null,
  longMonthlyRentRial:v.rentalTerm==="long"&&v.financialMode!=="full_deposit"?cleanDeposit(v.longMonthlyRentRial):null,
 }};
}
module.exports={cleanVillaSpaceAttributes};
