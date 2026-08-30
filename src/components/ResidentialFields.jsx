const TYPES = [
  ["apartment","آپارتمان"],["house","خانه"],["villa","خانه ویلایی"],
  ["suite","سوئیت"],["penthouse","پنت‌هاوس"],["other","سایر مسکونی"],
];
const money = (v) => {
  const d=String(v??"").replace(/\D/g,"");
  return d ? Number(d).toLocaleString("en-US") : "";
};
export const emptyResidentialDetails = {
  propertyType:"apartment",deposit:"",monthlyRent:"",bedrooms:"",
  floor:"",totalFloors:"",unitsPerFloor:"",buildYear:"",elevator:false,parking:false,storage:false,furnished:false,balcony:false,renovated:false,convertible:false,
};
export const residentialTypeLabel=(v)=>Object.fromEntries(TYPES)[v]||"مسکونی";
export default function ResidentialFields({value={},onChange,disabled=false}) {
 const f={...emptyResidentialDetails,...value};
 const set=(name,val)=>onChange({...f,[name]:val});
 return <section className="residential-fields">
   <div className="residential-fields__head"><span>🏠</span><div><strong>مشخصات ملک مسکونی</strong><small>اطلاعات دقیق‌تر، تطبیق بهتر با متقاضی</small></div></div>
   <div className="residential-fields__grid">
    <label>نوع ملک<select disabled={disabled} value={f.propertyType} onChange={e=>set("propertyType",e.target.value)}>{TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>رهن / ودیعه (ریال)<input disabled={disabled} inputMode="numeric" value={money(f.deposit)} onChange={e=>set("deposit",e.target.value.replace(/\D/g,""))} placeholder="مثلاً 5,000,000,000"/></label>
    <label>اجاره ماهانه (ریال)<input disabled={disabled} inputMode="numeric" value={money(f.monthlyRent)} onChange={e=>set("monthlyRent",e.target.value.replace(/\D/g,""))} placeholder="مثلاً 120,000,000"/></label>
    <label>تعداد اتاق<input disabled={disabled} inputMode="numeric" value={f.bedrooms} onChange={e=>set("bedrooms",e.target.value.replace(/\D/g,"").slice(0,2))} placeholder="مثلاً 2"/></label>
    <label>طبقه<input disabled={disabled} value={f.floor} onChange={e=>set("floor",e.target.value)} placeholder="مثلاً 3 یا همکف"/></label>
    <label>تعداد طبقات ساختمان<input disabled={disabled} inputMode="numeric" value={f.totalFloors} onChange={e=>set("totalFloors",e.target.value.replace(/\D/g,"").slice(0,3))} placeholder="مثلاً 5"/></label>
    <label>تعداد واحد در هر طبقه<input disabled={disabled} inputMode="numeric" value={f.unitsPerFloor} onChange={e=>set("unitsPerFloor",e.target.value.replace(/\D/g,"").slice(0,2))} placeholder="مثلاً 2"/></label>
    <label>سال ساخت<input disabled={disabled} inputMode="numeric" value={f.buildYear} onChange={e=>set("buildYear",e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="مثلاً 1402"/></label>
   </div>
   <div className="residential-fields__amenities">
    {[["elevator","آسانسور"],["parking","پارکینگ"],["storage","انباری"],["furnished","مبله"],["balcony","بالکن"],["renovated","بازسازی‌شده"],["convertible","قابل تبدیل رهن و اجاره"]].map(([k,l])=><label key={k}><input disabled={disabled} type="checkbox" checked={!!f[k]} onChange={e=>set(k,e.target.checked)}/><span>✓</span>{l}</label>)}
   </div>
 </section>;
}