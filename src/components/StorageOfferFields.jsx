import { useState } from "react";
import { STORAGE_TYPES, STORAGE_PURPOSES, STORAGE_ACCESS, STORAGE_VEHICLES, STORAGE_LOADING, STORAGE_FEATURES } from "../utils/storageOffer";
import "./ParkingOfferFields.css";
import "./StorageOfferFields.css";
const ChoiceGroup = ({ title, value, options, choose, disabled }) => <div className="fj-po-group">
  <strong>{title} <span aria-hidden="true">*</span></strong>
  <div className="fj-po-choices" role="group" aria-label={title}>
    {options.map(([id,label])=><button type="button" key={id} className={`fj-po-choice${value===id?" is-selected":""}`} aria-pressed={value===id} disabled={disabled} onClick={()=>choose(id)}>{value===id?"✓ ": ""}{label}</button>)}
  </div>
</div>;
export default function StorageOfferFields({ value, onChange, note="", onNoteChange, disabled=false, error="" }) {
  const [expanded,setExpanded] = useState(false);
  const change = (key,v) => onChange({ ...value, [key]:v });
  const purposes=Array.isArray(value.allowedPurposes)?value.allowedPurposes:[];
  const features=Array.isArray(value.features)?value.features:[];
  return <section className="fj-po fj-so" aria-label="مشخصات واقعی انبار">
    <header className="fj-po-header"><span aria-hidden="true">📦</span><div><h3>مشخصات انبار شما</h3><p>سه پاسخ اصلی؛ جزئیات فنی فقط در صورت نیاز.</p></div></header>
    <div className="fj-po-primary">
      <ChoiceGroup title="نوع فضای موجود" value={value.spaceType} options={STORAGE_TYPES} choose={v=>onChange({...value,spaceType:v,heightM:v==="outdoor"?"":value.heightM})} disabled={disabled}/>
      <div className="fj-po-group"><strong>چه نوع کالایی می‌توان در آن نگهداری کرد؟ <span aria-hidden="true">*</span></strong>
        <div className="fj-po-choices" role="group" aria-label="کالاهای مجاز برای نگهداری">
          {STORAGE_PURPOSES.map(([id,label])=><label className="fj-po-check" key={id}><input type="checkbox" disabled={disabled} checked={purposes.includes(id)} onChange={e=>change("allowedPurposes",e.target.checked?[...purposes,id]:purposes.filter(x=>x!==id))}/>{label}</label>)}
        </div>
        {purposes.includes("other") && <label className="fj-po-field">نوع کالای دیگر <span>*</span><input disabled={disabled} maxLength={160} value={value.otherPurpose||""} onChange={e=>change("otherPurpose",e.target.value)} placeholder="مثلاً محصولات نمایشگاهی" /></label>}
        <small className="fj-so-hint">فقط مواردی را انتخاب کنید که واقعاً امکان نگهداری‌شان وجود دارد.</small>
      </div>
      <ChoiceGroup title="ساعت دسترسی به انبار" value={value.access} options={STORAGE_ACCESS} choose={v=>change("access",v)} disabled={disabled}/>
    </div>
    <button type="button" className="fj-po-more" aria-expanded={expanded} disabled={disabled} onClick={()=>setExpanded(s=>!s)}><span>＋ جزئیات تکمیلی (اختیاری)</span><span>{expanded?"⌃":"⌄"}</span></button>
    {expanded && <div className="fj-po-extra">
      {value.spaceType!=="outdoor" && <label className="fj-po-field">ارتفاع مفید داخلی (متر)
        <input type="text" inputMode="decimal" disabled={disabled} value={value.heightM??""} onChange={e=>change("heightM",e.target.value)} placeholder="مثلاً ۳٫۵" /><small>فقط اگر ارتفاع دقیق را می‌دانید بنویسید.</small>
      </label>}
      <div className="fj-so-pair fj-po-wide">
        <label className="fj-po-field fj-so-select-field"><span className="fj-so-field-label">بزرگ‌ترین وسیله‌ای که امکان ورود دارد</span>
          <select disabled={disabled} value={value.vehicleAccess||""} onChange={e=>change("vehicleAccess",e.target.value)}><option value="">مشخص نشده</option>{STORAGE_VEHICLES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
          <small className="fj-so-field-help">«ورود» به معنی دسترسی واقعی وسیله تا محل بارگیری است.</small>
        </label>
        <label className="fj-po-field fj-so-select-field"><span className="fj-so-field-label">نحوه جابه‌جایی بار</span>
          <select disabled={disabled} value={value.loadingMethod||""} onChange={e=>change("loadingMethod",e.target.value)}><option value="">مشخص نشده</option>{STORAGE_LOADING.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
          <small className="fj-so-field-help fj-so-field-help--ghost" aria-hidden="true">{"\u00A0"}</small>
        </label>
      </div>
      <div className="fj-po-field fj-po-wide"><strong>امکانات واقعی موجود</strong><div className="fj-po-choices">
        {STORAGE_FEATURES.map(([id,label])=><label className="fj-po-check" key={id}><input type="checkbox" disabled={disabled} checked={features.includes(id)} onChange={e=>change("features",e.target.checked?[...features,id]:features.filter(x=>x!==id))}/>{label}</label>)}
      </div><small>گزینه انتخاب‌نشده یعنی اطلاعاتی تأیید نشده؛ لازم نیست همه امکانات را داشته باشید.</small></div>
      <label className="fj-po-field fj-po-wide" htmlFor="storage-offer-note">نکات خاص انبار (اختیاری)
        <textarea id="storage-offer-note" rows={3} maxLength={800} disabled={disabled} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="مثلاً محدودیت ساعت ورود، شرایط نگهداری خاص، یا نحوه تحویل کلید..." />
        <small>اگر نکته‌ای ندارید، خالی بگذارید. {note.length.toLocaleString("fa-IR")}/۸۰۰</small>
      </label>
    </div>}
    {error && <p role="alert" className="fj-po-error">{error}</p>}
    <p className="fj-po-note">اطلاعات واقعی انتخاب‌شده در صفحه آگهی نمایش داده می‌شود.</p>
  </section>;
}
