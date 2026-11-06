/** Phase08: typed actual villa supply. Do not treat missing legacy values as negatives. */
export const VILLA_OFFER_TYPES = [
 ["villa","ویلا"],["garden_villa","باغ‌ویلا"],["cottage","کلبه"],
 ["rural","اقامتگاه روستایی"],["suite","سوئیت تفریحی"],["other","سایر اقامتگاه‌ها"],
];
export const VILLA_OFFER_STAYS = [
 ["daily","شبانه"],["weekend","آخر هفته"],["weekly","هفتگی"],
 ["monthly","ماهانه"],["flexible","توافقی"],
];
export const VILLA_RENTAL_TERMS = [["short","کوتاه‌مدت / اقامت مسافری"],["long","بلندمدت / سکونت"]];
export const VILLA_LONG_MODES = [["full_deposit","رهن کامل"],["rent_only","فقط اجاره"],["deposit_rent","رهن و اجاره"]];
export const VILLA_OFFER_PRIVACY = [["private","کاملاً اختصاصی"],["shared","فضای مشترک"],["unknown","نامشخص"]];
export const VILLA_OFFER_EXTRAS = [["indoor_pool","استخر سرپوشیده"],["gazebo","آلاچیق"]];
export const VILLA_OFFER_DEFAULT = Object.freeze({
 accommodationType:"",otherType:"",rentalTerm:"short",availableStays:[],privacy:"",
 extraFeatures:[], canNegotiateOtherTerm:false, depositRial:"",financialMode:"",longDepositRial:"",longMonthlyRentRial:"",
});
const ids=(opts)=>new Set(opts.map(([id])=>id));
const choice=(opts,val)=>ids(opts).has(val)?val:"";
const choices=(opts,val)=>Array.isArray(val)? [...new Set(val.filter(x=>typeof x==="string"&&ids(opts).has(x)))].slice(0,opts.length):[];
export const villaDigits=(v)=>String(v??"").replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
 .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"").replace(/\D/g,"");
export const villaMoneyInput=(v)=>villaDigits(v).replace(/\B(?=(\d{3})+(?!\d))/g,",");
const money=(v,allowZero=false)=>{
 // Unlike the input formatter, validation must not silently turn -5 or 12abc into a positive amount.
 const text=String(v??"").replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
   .replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"");
 if(!/^\d{1,15}$/.test(text))return null;
 const n=Number(text);return Number.isSafeInteger(n)&&(n>0||(allowZero&&n===0))?n:null;
};
export const villaOfferLabel=(opts,id)=>opts.find(([key])=>key===id)?.[1]||"";
export function villaOfferFromAttributes(attrs={}) {
 const v=attrs?.schemaVersion===1&&attrs?.category==="villa"&&attrs.values&&typeof attrs.values==="object"&&!Array.isArray(attrs.values)?attrs.values:{};
 return {...VILLA_OFFER_DEFAULT,accommodationType:choice(VILLA_OFFER_TYPES,v.accommodationType),
  otherType:typeof v.otherType==="string"?v.otherType.slice(0,80):"",
  rentalTerm: v.rentalTerm==="long"?"long":"short",
  availableStays: v.accommodationType ? choices(VILLA_OFFER_STAYS,v.availableStays) : [],
  privacy:choice(VILLA_OFFER_PRIVACY,v.privacy),
  extraFeatures:choices(VILLA_OFFER_EXTRAS,v.features),
  canNegotiateOtherTerm:v.canNegotiateOtherTerm===true,
  depositRial:v.depositRial==null?"":String(v.depositRial),
  financialMode:choice(VILLA_LONG_MODES,v.financialMode),
  longDepositRial:v.longDepositRial==null?"":String(v.longDepositRial),
  longMonthlyRentRial:v.longMonthlyRentRial==null?"":String(v.longMonthlyRentRial),
 };
}
export function validateVillaOffer(v={},details={},area=0){
 if(!choice(VILLA_OFFER_TYPES,v.accommodationType))return "نوع اقامتگاه قابل عرضه را انتخاب کنید.";
 if(v.accommodationType==="other"&&String(v.otherType||"").trim().length<5)return "نوع اقامتگاه دیگر را با حداقل ۵ حرف توضیح دهید.";
 const term=v.rentalTerm||"short";
 if(!["short","long"].includes(term))return "نوع واگذاری اقامتگاه معتبر نیست.";
 if(term==="short"&&!choices(VILLA_OFFER_STAYS,v.availableStays).length)return "حداقل یک شیوه اقامت قابل ارائه را انتخاب کنید.";
 if(term==="long") {
  if(!choice(VILLA_LONG_MODES,v.financialMode))return "نوع قرارداد بلندمدت را انتخاب کنید.";
  if(v.financialMode!=="rent_only"&&money(v.longDepositRial)===null)return "مبلغ رهن بلندمدت را به ریال وارد کنید.";
  if(v.financialMode!=="full_deposit"&&money(v.longMonthlyRentRial)===null)return "مبلغ اجاره ماهانه بلندمدت را وارد کنید.";
 }
 if(!choice(VILLA_OFFER_PRIVACY,v.privacy))return "وضعیت حریم خصوصی اقامتگاه را مشخص کنید.";
 const capacity=money(details.capacity), bedrooms=details.bedrooms===""||details.bedrooms==null?0:money(details.bedrooms,true);
 if(term==="short"&&(capacity===null||capacity>100))return "ظرفیت واقعی اقامتگاه باید بین ۱ تا ۱۰۰ نفر باشد.";
 if(term==="long"&&details.capacity!==""&&details.capacity!=null&&(capacity===null||capacity>100))return "ظرفیت معتبر نیست.";
 if(bedrooms===null||bedrooms>30)return "تعداد اتاق‌خواب معتبر نیست.";
 if(details.heatedPool===true&&details.pool!==true)return "برای استخر آب‌گرم، گزینه استخر را نیز انتخاب کنید.";
 if(v.extraFeatures?.includes("indoor_pool")&&details.pool!==true)return "برای استخر سرپوشیده، گزینه استخر را نیز انتخاب کنید.";
 if(term==="short"&&v.depositRial!==""&&v.depositRial!=null&&money(v.depositRial)===null)return "مبلغ ودیعه احتمالی را به ریال و به‌صورت معتبر وارد کنید.";
 if(term==="short"&&details.extraGuestPrice!==""&&details.extraGuestPrice!=null&&money(details.extraGuestPrice,true)===null)return "هزینه نفر اضافه معتبر نیست.";
 if(!Number.isFinite(Number(area))||Number(area)<=0)return "متراژ واقعی اقامتگاه را وارد کنید.";
 return "";
}
const legacyFeatures={pool:"pool",heatedPool:"heated_pool",parking:"parking",yard:"private_yard",
 furnished:"furnished",barbecue:"barbecue",wifi:"wifi",petFriendly:"pet_friendly"};
export function villaListingPrice(v={},shortPrice="",shortPeriod="daily"){
 if(v.rentalTerm!=="long")return {price:shortPeriod==="negotiable"?"":villaDigits(shortPrice),priceType:shortPeriod};
 const mode=choice(VILLA_LONG_MODES,v.financialMode);
 const rent=mode==="full_deposit"?null:money(v.longMonthlyRentRial);
 return {price:rent?String(rent):"",priceType:rent?"monthly":"negotiable"};
}
export function makeVillaAttributes(v={},details={}){
 const term=v.rentalTerm==="long"?"long":"short";
 const features=choices(VILLA_OFFER_EXTRAS,v.extraFeatures);
 for(const [key,id] of Object.entries(legacyFeatures))if(details?.[key]===true)features.push(id);
 if(Array.isArray(details.heatingSystems)&&details.heatingSystems.length||details.heating===true)features.push("heating");
 if(Array.isArray(details.coolingSystems)&&details.coolingSystems.length||details.airConditioning===true)features.push("air_conditioning");
 return {schemaVersion:1,category:"villa",values:{
  accommodationType:choice(VILLA_OFFER_TYPES,v.accommodationType)||null,
  otherType:v.accommodationType==="other"?String(v.otherType||"").trim().slice(0,80):"",
  rentalTerm:term,
  canNegotiateOtherTerm:v.canNegotiateOtherTerm===true,
  availableStays:term==="short"?choices(VILLA_OFFER_STAYS,v.availableStays):[],
  privacy:choice(VILLA_OFFER_PRIVACY,v.privacy)||null,
  features:[...new Set(features)],
  depositRial:term==="short"?money(v.depositRial):null,
  financialMode:term==="long"?choice(VILLA_LONG_MODES,v.financialMode):null,
  longDepositRial:term==="long"&&v.financialMode!=="rent_only"?money(v.longDepositRial):null,
  longMonthlyRentRial:term==="long"&&v.financialMode!=="full_deposit"?money(v.longMonthlyRentRial):null,
 }};
}
/** Explicit deposit is not the generic rental rate; never convert between periods. */
export function villaFinancialRows(attrs,price="",priceType="daily"){
 if(attrs?.schemaVersion!==1||attrs?.category!=="villa"||!attrs.values?.accommodationType)return [];
 const v=attrs.values;
 if(v.rentalTerm==="long"){
  const mode=v.financialMode;
  const deposit=money(v.longDepositRial),rent=money(v.longMonthlyRentRial);
  const rows=[];
  if(mode!=="rent_only"&&deposit)rows.push({label:"رهن بلندمدت",amount:`${deposit.toLocaleString("fa-IR")} ریال`});
  if(mode!=="full_deposit"&&rent)rows.push({label:"اجاره ماهانه",amount:`${rent.toLocaleString("fa-IR")} ریال`});
  return rows;
 }
 const period={daily:"شبانه",weekly:"هفتگی",monthly:"ماهانه"}[priceType];
 const rent=money(price);const deposit=money(v.depositRial);
 const rows=[{label:period?`اقامت ${period}`:"هزینه اقامت",amount:rent?`${rent.toLocaleString("fa-IR")} ریال`:"توافقی"}];
 if(deposit)rows.push({label:"ودیعه / ضمانت خسارت کوتاه‌مدت",amount:`${deposit.toLocaleString("fa-IR")} ریال`});
 return rows;
}
export const villaFinancialHeadline=(attrs,price,period)=>villaFinancialRows(attrs,price,period).map(x=>`${x.label} ${x.amount}`).join(" • ");

/** Display status for owner's explicitly registered primary rental term.
 * An alternative means owner may NEGOTIATE; it has no published alternate price. */
export function villaRentalBadges(attrs){
 const v=attrs?.schemaVersion===1&&attrs?.category==='villa'?attrs.values:null;
 if(!v?.accommodationType || !['short','long'].includes(v.rentalTerm))return [];
 const other=v.rentalTerm==='short'?'long':'short';
 const labels={short:'کوتاه‌مدت',long:'بلندمدت'};
 return [v.rentalTerm,other].map(term=>({
  term,label:labels[term],
  state:term===v.rentalTerm?'primary':v.canNegotiateOtherTerm===true?'possible':'inactive',
 }));
}
