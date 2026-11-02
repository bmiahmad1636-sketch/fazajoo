import { useState } from "react";
import { PARKING_OFFER_USAGE, PARKING_OFFER_COVER, PARKING_OFFER_ACCESS, PARKING_OFFER_STYLE, PARKING_OFFER_SECURITY } from "../utils/parkingOffer";
import "./ParkingOfferFields.css";

const Group = ({ title, choices, selected, onChange, disabled }) => (
  <div className="fj-po-group">
    <strong>{title} <span aria-hidden="true">*</span></strong>
    <div className="fj-po-choices">
      {choices.map(([id,label])=><button type="button" key={id} aria-pressed={selected===id} disabled={disabled} className={`fj-po-choice${selected===id ? " is-selected" : ""}`} onClick={()=>onChange(id)}>{selected===id ? "✓ " : ""}{label}</button>)}
    </div>
  </div>
);
export default function ParkingOfferFields({ value, onChange, note="", onNoteChange, disabled=false, error="" }) {
  const [expanded, setExpanded] = useState(false);
  const update = (key, next) => onChange({...value, [key]:next});
  const features = Array.isArray(value.securityFeatures) ? value.securityFeatures : [];
  return <section className="fj-po" aria-label="مشخصات واقعی پارکینگ">
    <header className="fj-po-header"><span aria-hidden="true">🚘</span><div><h3>مشخصات پارکینگ شما</h3><p>فقط سه انتخاب ضروری؛ جزئیات بیشتر اختیاری است.</p></div></header>
    <div className="fj-po-primary">
      <Group title="مناسب چه وسیله‌ای است؟" choices={PARKING_OFFER_USAGE} selected={value.vehicleUsage} onChange={v=>update("vehicleUsage",v)} disabled={disabled}/>
      {value.vehicleUsage === "other" && <label className="fj-po-field">نوع کاربری <span>*</span><input disabled={disabled} maxLength={160} value={value.usageNotes || ""} onChange={e=>update("usageNotes",e.target.value)} placeholder="مثلاً جای پارک دوچرخه"/></label>}
      <Group title="نوع پارکینگ" choices={PARKING_OFFER_COVER} selected={value.cover} onChange={v=>onChange({...value,cover:v,entranceHeightCm:v==="covered"?value.entranceHeightCm:""})} disabled={disabled}/>
      <Group title="زمان دسترسی" choices={PARKING_OFFER_ACCESS} selected={value.access} onChange={v=>update("access",v)} disabled={disabled}/>
    </div>
    <button type="button" aria-expanded={expanded} className="fj-po-more" disabled={disabled} onClick={()=>setExpanded(v=>!v)}><span>＋ جزئیات تکمیلی (اختیاری)</span><span>{expanded ? "⌃" : "⌄"}</span></button>
    {expanded && <div className="fj-po-extra">
      <label className="fj-po-field">نحوه پارک کردن<select disabled={disabled} value={value.parkingStyle || ""} onChange={e=>update("parkingStyle",e.target.value)}><option value="">مشخص نشده</option>{PARKING_OFFER_STYLE.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select><small>«مزاحم» یعنی ممکن است برای خروج خودرو، جابه‌جایی وسیله دیگری لازم باشد.</small></label>
      {value.cover === "covered" && <label className="fj-po-field">ارتفاع مفید ورودی (سانتی‌متر)<input disabled={disabled} type="number" inputMode="numeric" min="100" max="500" value={value.entranceHeightCm || ""} onChange={e=>update("entranceHeightCm",e.target.value)} placeholder="مثلاً ۲۱۰"/><small>فقط اگر ارتفاع دقیق را می‌دانید وارد کنید.</small></label>}
      <div className="fj-po-field fj-po-wide"><strong>امکانات موجود</strong><div className="fj-po-choices">{PARKING_OFFER_SECURITY.map(([id,label])=><label className="fj-po-check" key={id}><input disabled={disabled} type="checkbox" checked={features.includes(id)} onChange={e=>update("securityFeatures",e.target.checked?[...features,id]:features.filter(x=>x!==id))}/>{label}</label>)}</div></div>
      <label className="fj-po-field fj-po-wide" htmlFor="parking-offer-extra-note">نکات خاص پارکینگ (اختیاری)
        <textarea id="parking-offer-extra-note" disabled={disabled} rows={3} maxLength={800} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="مثلاً محدودیت تردد، شرایط تحویل کلید یا نکته‌ای که در گزینه‌های بالا نیست..." />
        <small>فقط موارد مهمی را بنویسید که در گزینه‌های بالا نیامده؛ می‌توانید خالی بگذارید. {note.length.toLocaleString("fa-IR")} / ۸۰۰</small>
      </label>
    </div>}
    {error && <p role="alert" className="fj-po-error">{error}</p>}
    <p className="fj-po-note">متراژ، شهر و موقعیت را در ادامه همین مرحله وارد کنید. لازم نیست برای موارد نامشخص حدس بزنید.</p>
  </section>;
}
