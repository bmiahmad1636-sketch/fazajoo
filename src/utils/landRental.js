// Structured land-rental preferences, backward compatible with the existing description column.
export const LAND_PURPOSES = [
  ["agriculture","کشاورزی و کشت‌وزرع"],["parking","پارکینگ و توقفگاه"],["depot","دپو و نگهداری روباز"],
  ["livestock","دامداری و چرای دام"],["construction","تجهیز کارگاه و فعالیت عمرانی"],
  ["event","رویداد، بازارچه و نمایشگاه موقت"],["logistics","حمل‌ونقل، بارانداز و لجستیک"],
  ["tourism","گردشگری، کمپینگ و تفریح"],["commerce","فعالیت تجاری روباز"],
  ["infrastructure","تجهیزات و زیرساخت"],["personal","باغچه و استفاده شخصی"],["other","سایر موارد"]
];
export const LAND_LEGAL = [["agricultural","زراعی / کشاورزی"],["garden","باغی"],["residential","مسکونی"],["commercial","تجاری"],["industrial","صنعتی"],["other","سایر / نامشخص"]];
export const LAND_LOCATION = [["urban","داخل محدوده شهری"],["suburb","حومه شهر"],["rural","روستایی"],["industrial","شهرک صنعتی"],["outside","خارج از بافت"]];
export const LAND_DURATION = [["daily","روزانه"],["monthly","ماهانه"],["seasonal","فصلی / فصل زراعی"],["yearly","سالانه"],["multi_year","چندساله"],["flexible","توافقی"]];
export const LAND_CROPS = [["wheat","گندم"],["barley","جو"],["corn","ذرت"],["vegetables","صیفی‌جات و سبزیجات"],["saffron","زعفران"],["medicinal","گیاهان دارویی"],["orchard","باغداری و درختان میوه"],["nursery","نهالستان"],["greenhouse","گلخانه"],["other","سایر محصولات"]];
export const LAND_WATER = [["well","چاه"],["qanat","قنات"],["river","رودخانه / نهر"],["network","شبکه آبیاری"],["water_right","حقابه"],["reservoir","استخر / مخزن"],["none","بدون آب"]];
export const LAND_IRRIGATION = [["flood","غرقابی / سنتی"],["drip","قطره‌ای"],["sprinkler","بارانی"],["rainfed","دیم"],["other","سایر"]];
export const LAND_FEATURES = [["fence","محصور / دیوارکشی"],["road","راه دسترسی مناسب"],["truck","ورود کامیون"],["tractor","ورود تراکتور"],["electricity","برق"],["three_phase","برق سه‌فاز"],["gas","گاز"],["water","آب"],["level","زمین هموار"],["office","کانکس / اتاقک"],["restroom","سرویس بهداشتی"],["loading","محوطه بارگیری"]];
export const LAND_PAYMENT = [["rent","اجاره"],["deposit","رهن کامل"],["both","پول پیش و اجاره"],["crop_share","مشارکت در محصول (مزارعه)"]];
export const EMPTY_LAND_RENTAL = { purposes:[],primaryPurpose:"",otherPurpose:"",purposeDetails:{},legalUse:"",legalNotes:"",locationType:"",minArea:"",maxArea:"",areaUnit:"sqm",partialAllowed:false,landShape:"",frontage:"",features:[],duration:"",paymentType:"both",deposit:"",rent:"",rentPeriod:"monthly",cropShareNotes:"",crops:[],agricultureType:"",waterSources:[],waterRight:"",irrigation:"",season:"",soilNotes:"",agriFacilities:[],requirements:"",openToOtherUses:false };
const MARK = /^\[FAZAJOO_LAND_RENTAL:([^\]\n]+)\]\n?/;
export function readLandRental(description="") { const text=String(description||""); const match=text.match(MARK); let parsed={}; if(match){try{parsed=JSON.parse(decodeURIComponent(match[1]))}catch{parsed={}}}const data={...EMPTY_LAND_RENTAL,...parsed};
  // Backward compatibility: old form used placeholders as property keys.
  if ((data.minArea === "" || data.minArea == null) && parsed["مثلاً ۱۰۰۰"] != null) data.minArea = parsed["مثلاً ۱۰۰۰"];
  if ((data.maxArea === "" || data.maxArea == null) && parsed["مثلاً ۵۰۰۰"] != null) data.maxArea = parsed["مثلاً ۵۰۰۰"];
  for(const k of ["purposes","features","crops","waterSources","agriFacilities"])data[k]=Array.isArray(parsed[k])?parsed[k]:[];return {data,description:match?text.slice(match[0].length).trim():text.trim(),hasMetadata:Boolean(match)}; }
export function writeLandRental(data,description="") {const safe={...EMPTY_LAND_RENTAL,...data};return `[FAZAJOO_LAND_RENTAL:${encodeURIComponent(JSON.stringify(safe))}]${description?`\n${String(description).trim()}`:""}`;}
export function landLabel(options,id){return options.find(([key])=>key===id)?.[1]||id||"تعیین نشده";}
export function landRentalValidation(d={},wanted=false){if(!d.primaryPurpose)return "هدف اصلی اجاره زمین را مشخص کنید.";if(d.primaryPurpose==="other"&&String(d.otherPurpose||"").trim().length<15)return "برای گزینه سایر، هدف اجاره را حداقل در ۱۵ نویسه توضیح دهید.";if(!wanted&&!d.legalUse)return "کاربری قانونی زمین را مشخص کنید.";const min=Number(d.minArea||0),max=Number(d.maxArea||0);if(min<0||max<0||(min&&max&&min>max))return "محدوده مساحت معتبر نیست.";if(!d.duration)return "مدت اجاره را مشخص کنید.";for(const k of ["deposit","rent"]){const v=String(d[k]||"").replace(/,/g,"");if(v&&!/^\d+$/.test(v))return "مبلغ باید عددی باشد.";}if(d.paymentType==="crop_share"&&d.primaryPurpose!=="agriculture")return "مشارکت در محصول فقط برای کاربری کشاورزی است.";return "";}
