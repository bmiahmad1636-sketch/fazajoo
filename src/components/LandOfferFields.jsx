import { useEffect, useState } from "react";
import {LAND_OFFER_TYPES,LAND_OFFER_PURPOSES,LAND_OFFER_ROADS,LAND_OFFER_LEGAL,LAND_OFFER_LOCATION,LAND_OFFER_SLOPES,LAND_OFFER_VEHICLES,LAND_OFFER_WATER,LAND_OFFER_FEATURES,LAND_OFFER_CROPS,LAND_OFFER_IRRIGATION} from "../utils/landOffer";
import "./ParkingOfferFields.css";
import "./LandOfferFields.css";

export default function LandOfferFields({value={},onChange,note="",onNoteChange,disabled=false,error=""}) {
  const [expanded,setExpanded]=useState(false);
  const errorTarget = !error ? "" : error.startsWith("وضعیت واقعی زمین") ? "type"
    : error.startsWith("حداقل یک کاربرد") || error.startsWith("کاربرد دیگر") ? "purposes"
    : error.startsWith("وضعیت راه دسترسی") ? "road" : "extra";
  // Put the validation message beside the actual question and bring it into view.
  useEffect(() => {
    if (!errorTarget) return undefined;
    if (errorTarget === "extra" && !expanded) {
      setExpanded(true);
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(`land-offer-${errorTarget}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [errorTarget, error, expanded]);
  const purposes=Array.isArray(value.allowedPurposes)?value.allowedPurposes:[];
  const features=Array.isArray(value.features)?value.features:[];
  const waters=Array.isArray(value.waterSources)?value.waterSources:[];
  const crops=Array.isArray(value.crops)?value.crops:[];
  const change=(key,next)=>onChange({...value,[key]:next});
  const select=(name,key,options,hint="")=><label className="fj-po-field fj-lo-field">
    <span>{name}</span>
    <select disabled={disabled} value={value[key]||""} onChange={e=>change(key,e.target.value)}>
      <option value="">مشخص نشده</option>{options.map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select><small>{hint || "\u00a0"}</small>
  </label>;
  const checkGroup=(name,options,values,key)=><div className="fj-lo-group fj-lo-wide">
    <strong>{name}</strong><div className="fj-lo-choices">{options.map(([id,label])=><label key={id} className="fj-lo-check">
      <input disabled={disabled} type="checkbox" checked={values.includes(id)} onChange={e=>{
        if(key==="waterSources" && id==="none" && e.target.checked) onChange({...value,waterSources:["none"],features:features.filter(x=>x!=="water")});
        else if(key==="waterSources") change(key,e.target.checked?[...values.filter(x=>x!=="none"),id]:values.filter(x=>x!==id));
        else if(key==="features" && id==="water" && e.target.checked) onChange({...value,features:[...values,id],waterSources:waters.filter(x=>x!=="none")});
        else change(key,e.target.checked?[...values,id]:values.filter(x=>x!==id));
      }}/>{label}</label>)}</div>
  </div>;
  return <section className="fj-po fj-lo" aria-label="مشخصات واقعی زمین">
    <header className="fj-po-header"><span aria-hidden="true">🌱</span><div>
      <h3>مشخصات زمین شما</h3><p>سه انتخاب اصلی و متراژ واقعی؛ بقیه موارد اختیاری‌اند.</p>
    </div></header>
    <div id="land-offer-type" className={`fj-lo-group${errorTarget === "type" ? " fj-lo-group--invalid" : ""}`}><strong>وضعیت واقعی زمین <b>*</b></strong><div className="fj-lo-choices" role="group" aria-label="وضعیت واقعی زمین">
      {LAND_OFFER_TYPES.map(([id,label])=><button type="button" key={id} disabled={disabled} aria-pressed={value.landType===id} className={`fj-lo-choice${value.landType===id?" is-selected":""}`} onClick={()=>onChange({...value,landType:id,...(id!=="agricultural"&&!purposes.includes("agriculture")?{crops:[],irrigation:""}:{})})}>{value.landType===id?"✓ ":""}{label}</button>)}
    </div>{errorTarget === "type" && <p role="alert" className="fj-lo-inline-error">{error}</p>}</div>
    <div id="land-offer-purposes" className={`fj-lo-group${errorTarget === "purposes" ? " fj-lo-group--invalid" : ""}`}><strong>زمین را برای چه کارهایی می‌توانید واگذار کنید؟ <b>*</b></strong><div className="fj-lo-choices" role="group" aria-label="کاربردهای قابل ارائه">
      {LAND_OFFER_PURPOSES.map(([id,label])=><label key={id} className="fj-lo-check"><input type="checkbox" disabled={disabled} checked={purposes.includes(id)} onChange={e=>{const next=e.target.checked?[...purposes,id]:purposes.filter(x=>x!==id);onChange({...value,allowedPurposes:next,...(value.landType!=="agricultural"&&!next.includes("agriculture")?{crops:[],irrigation:""}:{})});}}/>{label}</label>)}
    </div>{purposes.includes("other")&&<label className="fj-po-field fj-lo-other"><span>کاربرد دیگر <b>*</b></span><input maxLength={160} disabled={disabled} value={value.otherPurpose||""} onChange={e=>change("otherPurpose",e.target.value)} placeholder="مثلاً فضای آزمایش تجهیزات"/></label>}
      {errorTarget === "purposes" && <p role="alert" className="fj-lo-inline-error">{error}</p>}
      <small className="fj-lo-hint">این موارد فقط اعلام آمادگی مالک هستند، نه تأیید مجوز یا کاربری قانونی.</small>
    </div>
    <div id="land-offer-road" className={`fj-lo-group${errorTarget === "road" ? " fj-lo-group--invalid" : ""}`}><strong>وضعیت راه دسترسی <b>*</b></strong><div className="fj-lo-choices" role="group" aria-label="راه دسترسی">
      {LAND_OFFER_ROADS.map(([id,label])=><button key={id} type="button" disabled={disabled} aria-pressed={value.accessRoad===id} className={`fj-lo-choice${value.accessRoad===id?" is-selected":""}`} onClick={()=>change("accessRoad",id)}>{value.accessRoad===id?"✓ ":""}{label}</button>)}
    </div>{errorTarget === "road" && <p role="alert" className="fj-lo-inline-error">{error}</p>}</div>
    <button type="button" className="fj-po-more" aria-expanded={expanded} disabled={disabled} onClick={()=>setExpanded(s=>!s)}><span>＋ جزئیات تکمیلی (اختیاری)</span><span>{expanded?"⌃":"⌄"}</span></button>
    {expanded&&<div id="land-offer-extra" className="fj-lo-extra">
      <div className="fj-lo-row">
        {select("کاربری درج‌شده در مدارک","legalUse",LAND_OFFER_LEGAL,"فقط مطابق اطلاعاتی که از مدارک دارید؛ نبود اطلاعات اشکالی ندارد.")}
        {select("موقعیت بافت زمین","locationType",LAND_OFFER_LOCATION,"موقعیت کلی، نه نقطه دقیق روی نقشه.")}
      </div>
      <div className="fj-lo-row">
        {select("وضعیت شیب زمین","slope",LAND_OFFER_SLOPES,"ویژگی واقعی سطح زمین.")}
        {select("بزرگ‌ترین وسیله قابل ورود","vehicleAccess",LAND_OFFER_VEHICLES,"ورود واقعی تا محوطه، نه فقط جاده اطراف.")}
      </div>
      <div className="fj-lo-row">
        <label className="fj-po-field fj-lo-field"><span>بر زمین (متر، اختیاری)</span><input disabled={disabled} type="text" inputMode="decimal" value={value.frontageM??""} placeholder="مثلاً ۲۰" onChange={e=>change("frontageM",e.target.value)}/><small>طول بَرِ واقعی ملک؛ فقط اگر دقیق می‌دانید.</small></label>
        <label className="fj-po-field fj-lo-field"><span>مبلغ پول پیش (ریال، اختیاری)</span><input disabled={disabled} type="text" inputMode="numeric" value={value.depositRial??""} placeholder="در صورت وجود رهن یا ودیعه" onChange={e=>change("depositRial",e.target.value)}/><small>اجاره دوره‌ای را در مرحله آخر وارد کنید؛ مبالغ جدا می‌مانند.</small></label>
      </div>
      {checkGroup("منابع آب تأییدشده",LAND_OFFER_WATER,waters,"waterSources")}
      {(value.landType==="agricultural" || purposes.includes("agriculture")) && <div className="fj-lo-agriculture fj-lo-wide">
        <strong>🌾 ویژگی‌های زراعی (اختیاری)</strong>
        {select("روش آبیاری موجود","irrigation",LAND_OFFER_IRRIGATION,"فقط روشی را اعلام کنید که واقعاً موجود است.")}
        {checkGroup("محصولات قابل کشت یا کشت‌شده",LAND_OFFER_CROPS,crops,"crops")}
      </div>}
      {checkGroup("امکانات واقعاً موجود",LAND_OFFER_FEATURES,features,"features")}
      {errorTarget === "extra" && <p role="alert" className="fj-lo-inline-error fj-lo-wide">{error}</p>}
      <label className="fj-po-field fj-lo-wide" htmlFor="land-offer-note"><span>نکات خاص زمین (اختیاری)</span>
        <textarea id="land-offer-note" disabled={disabled} rows={3} maxLength={800} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="مثلاً محدودیت تردد، شرایط واگذاری، محدودیت قانونی یا نحوه دسترسی..."/>
        <small>اگر نکته‌ای ندارید، خالی بگذارید. {String(note).length.toLocaleString("fa-IR")}/۸۰۰</small>
      </label>
    </div>}
    <p className="fj-po-note">اطلاعات ثبت‌شده اظهار مالک است؛ مجوزها و کاربری قانونی جداگانه باید بررسی شوند.</p>
  </section>;
}
