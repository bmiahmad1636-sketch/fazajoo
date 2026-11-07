/** Wanted other spaces: human-described need plus explicit, distinct contract/budget fields. */
export const OTHER_REQUEST_PERIODS = [["negotiable","توافقی / هنوز مشخص نیست"],["daily","روزانه"],["weekly","هفتگی"],["monthly","ماهانه (موقت)"]];
export const OTHER_REQUEST_DURATIONS = [["flexible","فرقی ندارد / توافقی"],["short","چند ساعت یا یک روز"],["days","چند روز"],["months","چند ماه"],["long","بلندمدت"]];
export const OTHER_REQUEST_FEATURES = [["covered","فضای سرپوشیده"],["open","فضای روباز"],["water","آب"],["electricity","برق"],["restroom","سرویس بهداشتی"],["parking","پارکینگ"],["loading","دسترسی بارگیری"],["private","حریم خصوصی"]];
export const OTHER_REQUEST_LONG_MODES=[["flexible","شرایط مالی توافقی"],["deposit_rent","رهن و اجاره"],["full_deposit","رهن کامل"],["rent_only","فقط اجاره"]];
export const EMPTY_OTHER_REQUEST = {requestText:"",minArea:"",maxArea:"",pricePeriod:"negotiable",maxBudget:"",duration:"flexible",rentalTerm:"",financialMode:"flexible",maxDepositRial:"",maxMonthlyRentRial:"",features:[],requirements:""};
const MARK=/^\[FAZAJOO_OTHER_WANTED:([^\]\n]+)\]\n?/;
export const otherDigits=value=>String(value??"").replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9]/g,"");
const num=value=>Number(otherDigits(value)||0);const pretty=value=>num(value).toLocaleString("fa-IR");
export const otherRequestLabel=(list,value)=>list.find(([id])=>id===value)?.[1]||"";
const valid=(arr,key)=>arr.some(([id])=>id===key);
export function readOtherRequest(description="",legacyArea=0,legacyPrice="",legacyPeriod="negotiable"){
 const original=String(description||"");const match=original.match(MARK);
 if(match){try{
  const parsed=JSON.parse(decodeURIComponent(match[1]));
  if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){
   // A historic "months" request does NOT prove a long-term contract.
   const inferredTerm=parsed.duration==="long"?"long":["short","days"].includes(parsed.duration)?"short":"";
   const rentalTerm=["short","long"].includes(parsed.rentalTerm)?parsed.rentalTerm:inferredTerm;
   const oldLongBudget=!Object.hasOwn(parsed,"financialMode")&&rentalTerm==="long"&&parsed.pricePeriod==="monthly";
   return {data:{...EMPTY_OTHER_REQUEST,...parsed,rentalTerm,
    financialMode:valid(OTHER_REQUEST_LONG_MODES,parsed.financialMode)?parsed.financialMode:"flexible",
    maxMonthlyRentRial:parsed.maxMonthlyRentRial??(oldLongBudget?parsed.maxBudget:""),
    features:Array.isArray(parsed.features)?parsed.features.filter(x=>valid(OTHER_REQUEST_FEATURES,x)):[]},
    description:original.slice(match[0].length).trim(),hasMetadata:true};
  }
 }catch{/* keep legacy body visible */}}
 return {data:{...EMPTY_OTHER_REQUEST,requestText:original.trim(),minArea:num(legacyArea)?otherDigits(legacyArea):"",
  pricePeriod:valid(OTHER_REQUEST_PERIODS,legacyPeriod)?legacyPeriod:"negotiable",maxBudget:otherDigits(legacyPrice)},
  description:"",hasMetadata:false};
}
export function writeOtherRequest(input={},trailingNotes=""){
 const d={...EMPTY_OTHER_REQUEST,...input,
  requestText:String(input.requestText||"").trim().slice(0,700),minArea:otherDigits(input.minArea),maxArea:otherDigits(input.maxArea),
  rentalTerm:["short","long"].includes(input.rentalTerm)?input.rentalTerm:"",
  pricePeriod:valid(OTHER_REQUEST_PERIODS,input.pricePeriod)?input.pricePeriod:"negotiable",
  maxBudget:input.rentalTerm==="short"&&input.pricePeriod!=="negotiable"?otherDigits(input.maxBudget):"",
  financialMode:input.rentalTerm==="long"&&valid(OTHER_REQUEST_LONG_MODES,input.financialMode)?input.financialMode:"flexible",
  maxDepositRial:input.rentalTerm==="long"&&["deposit_rent","full_deposit"].includes(input.financialMode)?otherDigits(input.maxDepositRial):"",
  maxMonthlyRentRial:input.rentalTerm==="long"&&["deposit_rent","rent_only"].includes(input.financialMode)?otherDigits(input.maxMonthlyRentRial):"",
  duration:"flexible",features:Array.isArray(input.features)?OTHER_REQUEST_FEATURES.filter(([key])=>input.features.includes(key)).map(([id])=>id):[],
  requirements:String(input.requirements||"").trim().slice(0,300)};
 const tail=String(trailingNotes||"").trim();return `[FAZAJOO_OTHER_WANTED:${encodeURIComponent(JSON.stringify(d))}]${tail?`\n${tail}`:""}`;
}
export function validateOtherRequest(d={}){
 const text=String(d.requestText||"").trim();if(text.length<20)return "نیازت را حداقل با ۲۰ نویسه توضیح بده.";
 if(text.length>700)return "توضیح نیاز حداکثر ۷۰۰ نویسه باشد.";
 const min=num(d.minArea),max=num(d.maxArea);
 if(min>10000000||max>10000000||(min&&max&&min>max))return "محدوده متراژ معتبر نیست.";
 if(!["short","long"].includes(d.rentalTerm))return "نوع مدت موردنیاز را انتخاب کنید.";
 if(d.rentalTerm==="short"){
  if(!valid(OTHER_REQUEST_PERIODS,d.pricePeriod))return "دوره بودجه کوتاه‌مدت را انتخاب کنید.";
  if(d.pricePeriod!=="negotiable"&&!num(d.maxBudget))return "سقف بودجه کوتاه‌مدت را وارد کنید یا توافقی را انتخاب کنید.";
  if(otherDigits(d.maxBudget).length>15)return "سقف بودجه بیش از حد مجاز است.";
 }
 if(d.rentalTerm==="long"){
  if(!valid(OTHER_REQUEST_LONG_MODES,d.financialMode))return "روش مالی موردنظر را انتخاب کنید.";
  if(otherDigits(d.maxDepositRial).length>15||otherDigits(d.maxMonthlyRentRial).length>15)return "بودجه بیش از حد مجاز است.";
 }
 if(String(d.requirements||"").length>300)return "شرایط تکمیلی حداکثر ۳۰۰ نویسه باشد.";
 if(writeOtherRequest(d).length>4900)return "مجموع توضیحات درخواست طولانی است؛ متن را کوتاه‌تر کن.";
 return "";
}
export function otherRequestAreaText(d={}){
 const min=num(d.minArea),max=num(d.maxArea);
 if(min&&max)return min===max?`${pretty(min)} مترمربع`:`${pretty(min)} تا ${pretty(max)} مترمربع`;
 return min?`از ${pretty(min)} مترمربع`:max?`تا ${pretty(max)} مترمربع`:"";
}
export function otherRequestBudgetText(d={}){
 if(d.rentalTerm==="long"){
  if(d.financialMode==="flexible")return "شرایط مالی توافقی";
  const parts=[];
  if(["full_deposit","deposit_rent"].includes(d.financialMode)&&num(d.maxDepositRial))parts.push(`${d.financialMode==="full_deposit"?"رهن کامل":"ودیعه"} تا ${pretty(d.maxDepositRial)} ریال`);
  if(["deposit_rent","rent_only"].includes(d.financialMode)&&num(d.maxMonthlyRentRial))parts.push(`اجاره ماهانه تا ${pretty(d.maxMonthlyRentRial)} ریال`);
  return parts.join(" • ")||"بودجه بلندمدت توافقی";
 }
 if(!["short","long"].includes(d.rentalTerm))return "مدت اجاره هنوز مشخص نشده";
 if(d.pricePeriod==="negotiable")return "بودجه توافقی";
 return num(d.maxBudget)?`اجاره تا ${pretty(d.maxBudget)} ریال / ${otherRequestLabel(OTHER_REQUEST_PERIODS,d.pricePeriod)||"دوره مشخص"}`:"";
}
/**
 * Display-only financial rows for a wanted OTHER space.
 * Unlike offer rows, these are *maximum budgets*, never the owner's rent.
 * Unknown legacy terms remain unknown: no inferred lease or invented price.
 */
export function otherRequestBudgetRows(d={}) {
 const maximum = value => num(value) > 0 ? `${pretty(value)} ریال` : "سقف اعلام نشده";
 if (d.rentalTerm === "short") {
  if (d.pricePeriod === "negotiable") return [{label:"بودجه کوتاه‌مدت",amount:"توافقی"}];
  if (!valid(OTHER_REQUEST_PERIODS,d.pricePeriod)) return [];
  const period=otherRequestLabel(OTHER_REQUEST_PERIODS,d.pricePeriod);
  return [{label:`حداکثر اجاره ${period}`,amount:maximum(d.maxBudget)}];
 }
 if (d.rentalTerm === "long") {
  if (d.financialMode === "flexible") return [{label:"شرایط مالی بلندمدت",amount:"توافقی"}];
  if (!valid(OTHER_REQUEST_LONG_MODES,d.financialMode)) return [];
  return [
   ...(["full_deposit","deposit_rent"].includes(d.financialMode)
    ? [{label:d.financialMode==="full_deposit"?"حداکثر رهن کامل":"حداکثر ودیعه",amount:maximum(d.maxDepositRial)}]
    : []),
   ...(["rent_only","deposit_rent"].includes(d.financialMode)
    ? [{label:"حداکثر اجاره ماهانه",amount:maximum(d.maxMonthlyRentRial)}]
    : []),
  ];
 }
 return [];
}
/** A wanted ceiling never becomes owner rent, and a lease deposit never becomes generic price. */
export function otherWantedListingPrice(d={}){
 if(d.rentalTerm==="short"&&d.pricePeriod!=="negotiable"&&valid(OTHER_REQUEST_PERIODS,d.pricePeriod)&&num(d.maxBudget))
  return {price:String(num(d.maxBudget)),priceType:d.pricePeriod};
 if(d.rentalTerm==="long"&&["deposit_rent","rent_only"].includes(d.financialMode)&&num(d.maxMonthlyRentRial))
  return {price:String(num(d.maxMonthlyRentRial)),priceType:"monthly"};
 return {price:"",priceType:"negotiable"};
}
