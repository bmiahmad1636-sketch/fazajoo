import { emptyResidentialDetails } from "./residentialDetails";
import ClimateFields from "./ClimateFields";

const TYPES = [
  ["apartment","آپارتمان"],["house","خانه"],["villa","خانه ویلایی"],
  ["suite","سوئیت"],["penthouse","پنت‌هاوس"],["other","سایر مسکونی"],
];
const money = (v) => {
  const d=String(v??"").replace(/\D/g,"");
  return d ? Number(d).toLocaleString("en-US") : "";
};
export default function ResidentialFields({value={},onChange,disabled=false}) {
 const f={...emptyResidentialDetails,...value};
 const set=(name,val)=>onChange({...f,[name]:val});
 const changePropertyType = (propertyType) => {
   const next = {...f, propertyType};
   // Remove only fields that are inapplicable to the newly selected property type.
   if (propertyType !== "apartment") {
     next.floor = "";
     next.unitsPerFloor = "";
   }
   if (!["apartment", "penthouse", "house", "villa"].includes(propertyType)) next.totalFloors = "";
   if (!["apartment", "penthouse"].includes(propertyType)) next.elevator = false;
   if (!["apartment", "penthouse", "house"].includes(propertyType)) next.balcony = false;
   if (propertyType !== "penthouse") next.roofGarden = false;
   if (propertyType !== "villa") next.buildingUse = "";
   onChange(next);
 };
 const showFloor = f.propertyType === "apartment";
 const showUnitsPerFloor = f.propertyType === "apartment";
 const showTotalFloors = ["apartment", "penthouse", "house", "villa"].includes(f.propertyType);
 const amenityOptions = [
   ["elevator", "آسانسور", ["apartment", "penthouse"].includes(f.propertyType)],
   ["parking", "پارکینگ", true],
   ["storage", "انباری", true],
   ["furnished", "مبله", true],
   ["balcony", "بالکن", ["apartment", "penthouse", "house"].includes(f.propertyType)],
   ["roofGarden", "روف‌گاردن / تراس اختصاصی", f.propertyType === "penthouse"],
   ["renovated", "بازسازی‌شده", true],
   ["convertible", "قابل تبدیل", true],
 ];
 const apartmentLike = ["apartment", "penthouse"].includes(f.propertyType);
 const multiStorey = apartmentLike || f.propertyType === "house";
 return <section className="residential-fields">
   <div className="residential-fields__head"><span>🏠</span><div><strong>مشخصات ملک مسکونی</strong><small>اطلاعات دقیق‌تر، تطبیق بهتر با متقاضی</small></div></div>
   <div className="residential-fields__grid">
    <label>نوع ملک<select disabled={disabled} value={f.propertyType} onChange={e=>changePropertyType(e.target.value)}>{TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>رهن / ودیعه (ریال)<input disabled={disabled} inputMode="numeric" value={money(f.deposit)} onChange={e=>set("deposit",e.target.value.replace(/\D/g,""))} placeholder="مثلاً 5,000,000,000"/></label>
    <label>اجاره ماهانه (ریال)<input disabled={disabled} inputMode="numeric" value={money(f.monthlyRent)} onChange={e=>set("monthlyRent",e.target.value.replace(/\D/g,""))} placeholder="مثلاً 120,000,000"/></label>
    <label>تعداد اتاق<input disabled={disabled} inputMode="numeric" value={f.bedrooms} onChange={e=>set("bedrooms",e.target.value.replace(/\D/g,"").slice(0,2))} placeholder="مثلاً 2"/></label>
    {showFloor && <label>طبقه<input disabled={disabled} value={f.floor} onChange={e=>set("floor",e.target.value)} placeholder="مثلاً 3 یا همکف"/></label>}
    {showTotalFloors && <label>تعداد طبقات ساختمان<input disabled={disabled} inputMode="numeric" value={f.totalFloors} onChange={e=>set("totalFloors",e.target.value.replace(/\D/g,"").slice(0,3))} placeholder="مثلاً 5"/></label>}
    {showUnitsPerFloor && <label>تعداد واحد در هر طبقه<input disabled={disabled} inputMode="numeric" value={f.unitsPerFloor} onChange={e=>set("unitsPerFloor",e.target.value.replace(/\D/g,"").slice(0,2))} placeholder="مثلاً 2"/></label>}
    {f.propertyType === "villa" && <label>نوع استفاده از ساختمان<select disabled={disabled} value={f.buildingUse} onChange={e=>set("buildingUse",e.target.value)}><option value="">انتخاب کنید</option><option value="single">مستقل و یکپارچه</option><option value="multiple">دارای واحدهای مستقل</option></select></label>}
    <label>سال ساخت<input disabled={disabled} inputMode="numeric" value={f.buildYear} onChange={e=>set("buildYear",e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="مثلاً 1402"/></label>
   </div>
   <div className="residential-fields__amenities">
    {amenityOptions.filter(([, , visible]) => visible).map(([k,l])=><label key={k}><input disabled={disabled} type="checkbox" checked={!!f[k]} onChange={e=>set(k,e.target.checked)}/><span>✓</span>{l}</label>)}
   </div>
   <ClimateFields value={f} onChange={onChange} disabled={disabled} />
 </section>;
}