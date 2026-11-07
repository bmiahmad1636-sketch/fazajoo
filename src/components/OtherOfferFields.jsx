import {
 OTHER_OFFER_DEFAULT, OTHER_LAYOUTS, OTHER_ACCESS, OTHER_FEATURES, OTHER_SHORT_UNITS, OTHER_LONG_MODES,
 otherOfferDigits,otherOfferMoney,otherOfferErrorField,
} from "../utils/otherOffer";
import "./OtherSpaceFields.css";

export default function OtherOfferFields({value=OTHER_OFFER_DEFAULT,onChange,onNoteChange,note="",disabled=false,error=""}){
 const d={...OTHER_OFFER_DEFAULT,...value,features:Array.isArray(value?.features)?value.features:[]};
 const change=(key,v)=>onChange({...d,[key]:v});
 const errorField=otherOfferErrorField(error);
 const inlineError=key=>errorField===key?<small className="fj-other__error-inline" role="alert">{error}</small>:null;
 const cash=(title,key,hint,required=false)=> <label className="fj-other-field" key={key}>
  <span>{title}{required&&<b> *</b>}</span><input inputMode="numeric" type="text" disabled={disabled} placeholder={hint}
   value={otherOfferMoney(d[key])} aria-invalid={errorField===key} onChange={e=>change(key,otherOfferDigits(e.target.value))}/>
  {inlineError(key)}
 </label>;
 const pick=(title,key,options,placeholder="انتخاب کنید")=><label className="fj-other-field"><span>{title}</span>
  <select value={d[key]} disabled={disabled} aria-invalid={errorField===key} onChange={e=>change(key,e.target.value)}>
   <option value="">{placeholder}</option>{options.map(([id,text])=><option key={id} value={id}>{text}</option>)}
  </select>{inlineError(key)}</label>;
 const toggleFeature=(id,checked)=>change("features",checked?[...new Set([...d.features,id])]:d.features.filter(x=>x!==id));
 return <section className="fj-other" dir="rtl">
  <header className="fj-other__intro"><strong>✨ مشخصات واقعی فضای متفاوت شما</strong>
   <p>کاربری، شرایط استفاده و نوع قرارداد اصلی را مشخص کنید. نام فضا در بخش اطلاعات پایه قابل ویرایش است.</p>
   {errorField==="general"&&<small className="fj-other__error-inline" role="alert">{error}</small>}</header>
  <div className="fj-other__grid">
   <label className="fj-other-field fj-other-field--wide"><span>این فضا را برای چه کارهایی واگذار می‌کنید؟ <b>*</b></span>
    <input maxLength={180} value={d.usage} disabled={disabled} aria-invalid={errorField==="usage"}
      onChange={e=>change("usage",e.target.value)} placeholder="مثلاً ضبط صدا، عکاسی محصول، تمرین یا رویداد خصوصی"/>
    {inlineError("usage")}</label>
   {pick("نوع فضا *","layout",OTHER_LAYOUTS)}{pick("دسترسی به فضا (اختیاری)","access",OTHER_ACCESS)}
  </div>
  <div className="fj-other__panel"><strong>مدت اصلی واگذاری <b>*</b></strong>
   <div className="fj-other__terms">
    {[["short","کوتاه‌مدت / مقطعی","روزانه، هفتگی یا ماهانه موقت"],["long","بلندمدت","قرارداد و مبالغ رهن و اجاره"]].map(([id,name,desc])=><label key={id} className={`fj-other__term ${d.rentalTerm===id?"fj-other__term--active":""}`}>
      <input type="radio" name="fj-other-offer-term" checked={d.rentalTerm===id} disabled={disabled} onChange={()=>change("rentalTerm",id)}/>
      <span><strong>{name}</strong><small>{desc}</small></span></label>)}
   </div>
   {inlineError("rentalTerm")}
   {d.rentalTerm==="short"&&<div className="fj-other__grid">
     {pick("دوره محاسبه اجاره *","shortRateUnit",OTHER_SHORT_UNITS)}
     {cash("مبلغ اجاره کوتاه‌مدت (ریال)","shortRateRial","مثلاً ۵۰,۰۰۰,۰۰۰",true)}
     {cash("ودیعه / ضمانت خسارت (اختیاری ـ ریال)","securityHoldRial","در صورت نیاز")}
     <small className="fj-other__note">ودیعه خسارت با رهن بلندمدت متفاوت است؛ بازپرداخت و شرایط آن باید با توافق مشخص شوند.</small>
    </div>}
   {d.rentalTerm==="long"&&<div className="fj-other__grid">
     {pick("روش مالی قرارداد *","financialMode",OTHER_LONG_MODES)}
     {d.financialMode&&d.financialMode!=="rent_only"&&cash(d.financialMode==="full_deposit"?"مبلغ رهن کامل (ریال)":"مبلغ ودیعه (ریال)","longDepositRial","مبلغ به ریال",true)}
     {d.financialMode&&d.financialMode!=="full_deposit"&&cash("اجاره ماهانه (ریال)","longMonthlyRentRial","مبلغ به ریال",true)}
     <small className="fj-other__note">رهن یک مبلغ قراردادی است و هرگز به‌عنوان اجاره ماهانه نمایش داده نمی‌شود.</small>
    </div>}
   <label className="fj-other__consent"><input type="checkbox" checked={d.canNegotiateOtherTerm===true} disabled={disabled}
    onChange={e=>change("canNegotiateOtherTerm",e.target.checked)}/>
    <span>{d.rentalTerm==="short"
      ? "اگر متقاضی اجاره بلندمدت بخواهد، مایل هستم شرایط آن را هم بررسی و درباره‌اش مذاکره کنم."
      : d.rentalTerm==="long"
        ? "اگر متقاضی اجاره کوتاه‌مدت بخواهد، مایل هستم شرایط آن را هم بررسی و درباره‌اش مذاکره کنم."
        : "در صورت درخواست متقاضی، مایل هستم امکان نوع دیگر اجاره را هم بررسی کنم."}</span></label>
   <small className="fj-other__note">این انتخاب فقط اعلام آمادگی است؛ قیمت، مدت و توافق دوم قطعی نیستند.</small>
  </div>
  <details className="fj-other__extras" open={errorField==="limitations" ? true : undefined}><summary>✨ امکانات و شرایط تکمیلی (اختیاری)</summary>
   <div className="fj-other__features">{OTHER_FEATURES.map(([id,name])=><label key={id}><input type="checkbox" disabled={disabled} checked={d.features.includes(id)} onChange={e=>toggleFeature(id,e.target.checked)}/>{name}</label>)}</div>
   <label className="fj-other-field"><span>محدودیت‌ها و نکات مهم</span>
    <textarea rows={2} maxLength={400} disabled={disabled} aria-invalid={errorField==="limitations"} value={d.limitations} onChange={e=>change("limitations",e.target.value)} placeholder="مثلاً ساعت مجاز، محدودیت صدا، نیاز به هماهنگی قبلی یا الزامات قانونی"/>{inlineError("limitations")}</label>
   <label className="fj-other-field"><span>توضیحات تکمیلی آگهی</span>
    <textarea rows={2} maxLength={1500} disabled={disabled} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="توضیحات اختیاری برای بازدیدکنندگان"/></label>
  </details>
 </section>;
}
