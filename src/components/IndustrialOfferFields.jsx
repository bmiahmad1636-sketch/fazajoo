import { useState } from "react";
import {
  INDUSTRIAL_TYPES, INDUSTRIAL_POWER, INDUSTRIAL_VEHICLES, INDUSTRIAL_FLOORS,
  INDUSTRIAL_HOURS, industrialFeaturesFor,
} from "../utils/industrialOffer";
import { shedActivitiesFor } from "../utils/shedRequest";
import "./ParkingOfferFields.css";
import "./IndustrialOfferFields.css";

function Choices({ title, choices, selected, onSelect, disabled }) {
  return <div className="fj-io-group"><strong>{title} <span className="fj-io-required">*</span></strong>
    <div className="fj-io-options" role="group" aria-label={title}>
      {choices.map(([id, label]) => <button type="button" key={id}
        className={`fj-io-choice${selected === id ? " is-selected" : ""}`}
        aria-pressed={selected === id} disabled={disabled} onClick={() => onSelect(id)}>
        {selected === id ? "✓ " : ""}{label}
      </button>)}
    </div>
  </div>;
}
export default function IndustrialOfferFields({ value = {}, onChange, note = "", onNoteChange, disabled = false, error = "" }) {
  const [expanded, setExpanded] = useState(false);
  const chosenActivities = Array.isArray(value.allowedActivities) ? value.allowedActivities : [];
  const chosenFeatures = Array.isArray(value.features) ? value.features : [];
  const change = (key, next) => onChange({ ...value, [key]: next });
  const swap = (key, id, current, checked) => change(key, checked ? [...current, id] : current.filter(x => x !== id));
  const setSpaceType = (spaceType) => onChange({
    ...value, spaceType, allowedActivities: [], otherActivity: "", features: [],
    craneCapacityTons: "",
  });
  const setPower = (power) => onChange({ ...value, power, powerCapacityKw: ["three", "both"].includes(power) ? value.powerCapacityKw : "" });
  const allFeatures = industrialFeaturesFor(value.spaceType);
  return <section className="fj-po fj-io" aria-label="مشخصات واقعی سوله و کارگاه">
    <header className="fj-po-header"><span aria-hidden="true">🏭</span><div><h3>مشخصات سوله یا کارگاه شما</h3><p>چند انتخاب اصلی؛ جزئیات فنی تکمیلی فقط در صورت تمایل.</p></div></header>
    <Choices title="نوع فضای موجود" selected={value.spaceType} choices={INDUSTRIAL_TYPES} onSelect={setSpaceType} disabled={disabled}/>
    {error.startsWith("نوع فضای موجود") && <p role="alert" className="fj-po-error">{error}</p>}
    {value.spaceType && <>
      <div className="fj-io-group"><strong>چه فعالیت‌هایی در این فضا قابل انجام است؟ <span className="fj-io-required">*</span></strong>
        <div className="fj-io-options" role="group" aria-label="فعالیت‌های قابل انجام">
          {shedActivitiesFor(value.spaceType).map(([id,label]) => <label className="fj-io-check" key={id}>
            <input type="checkbox" disabled={disabled} checked={chosenActivities.includes(id)}
              onChange={e => swap("allowedActivities", id, chosenActivities, e.target.checked)}/>{label}
          </label>)}
        </div>
        {chosenActivities.includes("other") && <label className="fj-po-field fj-io-other">
          <span>نوع فعالیت دیگر <span className="fj-io-required">*</span></span>
          <input maxLength={160} disabled={disabled} value={value.otherActivity || ""} onChange={e => change("otherActivity", e.target.value)} placeholder="مثلاً مونتاژ قطعات خاص"/>
        </label>}
        {error.startsWith("حداقل یک فعالیت") && <p role="alert" className="fj-po-error">{error}</p>}
        <small className="fj-io-help">فقط فعالیت‌هایی را انتخاب کنید که امکان واقعی انجام آن‌ها وجود دارد؛ مجوزهای قانونی جداگانه بررسی می‌شوند.</small>
      </div>
      <Choices title="وضعیت برق مجموعه" selected={value.power} choices={INDUSTRIAL_POWER} onSelect={setPower} disabled={disabled}/>
      {error.startsWith("وضعیت واقعی برق") && <p role="alert" className="fj-po-error">{error}</p>}
      <button type="button" className="fj-po-more" disabled={disabled} aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>
        <span>＋ جزئیات تکمیلی (اختیاری)</span><span>{expanded ? "⌃" : "⌄"}</span>
      </button>
      {expanded && <div className="fj-io-extra">
        <div className="fj-io-row">
          <label className="fj-po-field fj-io-field"><span>ارتفاع مفید داخلی (متر)</span>
            <input type="text" inputMode="decimal" disabled={disabled} value={value.heightM ?? ""} onChange={e=>change("heightM",e.target.value)} placeholder="مثلاً ۶٫۵"/>
            <small>ارتفاع قابل استفاده، نه ارتفاع بیرونی سقف</small>
          </label>
          <label className="fj-po-field fj-io-field"><span>بزرگ‌ترین خودروی قابل ورود</span>
            <select value={value.vehicleAccess || ""} disabled={disabled} onChange={e=>change("vehicleAccess",e.target.value)}>
              <option value="">مشخص نشده</option>{INDUSTRIAL_VEHICLES.map(([id,label])=><option key={id} value={id}>{label}</option>)}
            </select>
            <small>ورود واقعی خودرو تا مسیر بارگیری</small>
          </label>
        </div>
        <div className="fj-io-row">
          <label className="fj-po-field fj-io-field"><span>نوع کف مجموعه</span>
            <select disabled={disabled} value={value.flooring || ""} onChange={e=>change("flooring",e.target.value)}>
              <option value="">مشخص نشده</option>{INDUSTRIAL_FLOORS.map(([id,label])=><option key={id} value={id}>{label}</option>)}
            </select>
            <small>جنس واقعی کف، نه ظرفیت باربری تخمینی</small>
          </label>
          <label className="fj-po-field fj-io-field"><span>زمان مجاز استفاده از فضا</span>
            <select disabled={disabled} value={value.operationHours || ""} onChange={e=>change("operationHours",e.target.value)}>
              <option value="">مشخص نشده</option>{INDUSTRIAL_HOURS.map(([id,label])=><option key={id} value={id}>{label}</option>)}
            </select>
            <small>با توجه به شرایط واقعی و توافق مالک</small>
          </label>
        </div>
        {["three", "both"].includes(value.power) && <label className="fj-po-field fj-io-full">
          <span>توان برق سه‌فاز (کیلووات، اختیاری)</span>
          <input type="text" inputMode="decimal" disabled={disabled} value={value.powerCapacityKw ?? ""} onChange={e=>change("powerCapacityKw",e.target.value)} placeholder="مثلاً ۱۰۰"/>
          <small>تنها اگر توان قابل واگذاری را با اطمینان می‌دانید وارد کنید.</small>
        </label>}
        <div className="fj-io-group fj-io-full"><strong>امکانات واقعی موجود</strong>
          <div className="fj-io-options">
            {allFeatures.map(([id,label])=><label key={id} className="fj-io-check">
              <input type="checkbox" disabled={disabled} checked={chosenFeatures.includes(id)}
                onChange={e=>onChange({...value,features:e.target.checked?[...chosenFeatures,id]:chosenFeatures.filter(x=>x!==id),craneCapacityTons:id==="crane"&&!e.target.checked?"":value.craneCapacityTons})}/>{label}
            </label>)}
          </div>
          <small className="fj-io-help">گزینه انتخاب‌نشده به معنای «ندارد» نیست؛ فقط امکانات تأییدشده را تیک بزنید.</small>
        </div>
        {chosenFeatures.includes("crane") && <label className="fj-po-field fj-io-full">
          <span>ظرفیت جرثقیل سقفی (تن، اختیاری)</span>
          <input type="text" inputMode="decimal" disabled={disabled} value={value.craneCapacityTons ?? ""} onChange={e=>change("craneCapacityTons",e.target.value)} placeholder="مثلاً ۵"/>
        </label>}
        <label className="fj-po-field fj-io-full" htmlFor="industrial-offer-note">
          <span>نکات خاص سوله یا کارگاه (اختیاری)</span>
          <textarea id="industrial-offer-note" disabled={disabled} rows={3} maxLength={800} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="مثلاً محدودیت فعالیت شبانه، نصب تجهیزات یا شرایط بارگیری..."/>
          <small>اگر نکته خاصی نیست خالی بگذارید. {String(note).length.toLocaleString("fa-IR")}/۸۰۰</small>
        </label>
      </div>}
    </>}
    {error && !["نوع فضای موجود","حداقل یک فعالیت","وضعیت واقعی برق"].some(x=>error.startsWith(x)) && <p role="alert" className="fj-po-error">{error}</p>}
    <p className="fj-po-note">متراژ واقعی را در بخش مشخصات آگهی وارد کنید؛ اطلاعات این قسمت در صفحه جزئیات نمایش داده می‌شود.</p>
  </section>;
}
