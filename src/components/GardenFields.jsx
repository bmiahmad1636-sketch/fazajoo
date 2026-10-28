import { emptyGardenDetails } from "./gardenDetails";
import ClimateFields from "./ClimateFields";
import "./ResidentialFields.css";

export default function GardenFields({ value = {}, onChange, disabled = false }) {
  const f = { ...emptyGardenDetails, ...value };
  const set = (key, val) => onChange({ ...f, [key]: val, ...(key === "building" && !val ? { heatingSystems: [], coolingSystems: [], furnished: false } : {}) });
  return <section className="residential-fields" dir="rtl">
    <div className="residential-fields__head"><span>🌳</span><div><strong>مشخصات باغ</strong><small>ویژگی‌های اختصاصی باغ؛ مساحت را در اطلاعات اصلی آگهی وارد کنید</small></div></div>
    <div className="residential-fields__grid">
      <label>نوع درختان و پوشش گیاهی<input disabled={disabled} value={f.trees} maxLength={160} onChange={e => set("trees", e.target.value)} placeholder="مثلاً سیب، گردو، انگور" /></label>
      <label>منبع آب<select disabled={disabled} value={f.waterSource} onChange={e => set("waterSource", e.target.value)}><option value="">انتخاب کنید</option><option value="well">چاه</option><option value="canal">قنات / کانال</option><option value="network">آب شبکه</option><option value="share">حقابه</option><option value="none">فاقد منبع مشخص</option></select></label>
      <label>روش آبیاری<select disabled={disabled} value={f.irrigation} onChange={e => set("irrigation", e.target.value)}><option value="">انتخاب کنید</option><option value="drip">قطره‌ای</option><option value="flood">غرقابی</option><option value="sprinkler">بارانی</option><option value="other">سایر</option></select></label>
      <label>وضعیت راه دسترسی<input disabled={disabled} value={f.accessRoad} maxLength={120} onChange={e => set("accessRoad", e.target.value)} placeholder="مثلاً آسفالت تا درِ باغ" /></label>
    </div>
    <div className="residential-fields__amenities">
      {[["water", "آب در دسترس"], ["electricity", "برق"], ["fenced", "حصارکشی"], ["building", "ساختمان / اتاقک"], ["cityGas", "گاز شهری"], ["landline", "تلفن ثابت"], ...(f.building ? [["furnished", "مبله"]] : [])].map(([key, label]) => <label key={key}><input disabled={disabled} type="checkbox" checked={!!f[key]} onChange={e => set(key, e.target.checked)} /><span>✓</span>{label}</label>)}
    </div>
    {f.building && <ClimateFields value={f} onChange={onChange} disabled={disabled} compact />}
  </section>;
}
