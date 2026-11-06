import { useEffect } from "react";
import VillaFields from "./VillaFields";
import { VILLA_OFFER_TYPES, VILLA_OFFER_STAYS, VILLA_OFFER_PRIVACY, VILLA_RENTAL_TERMS,
 VILLA_LONG_MODES, villaMoneyInput, villaDigits } from "../utils/villaOffer";
import "./VillaOfferFields.css";

export default function VillaOfferFields({value={},details={},onChange,onDetailsChange,note="",onNoteChange,disabled=false,error=""}) {
 const term=value.rentalTerm||"short";
 const stays=Array.isArray(value.availableStays)?value.availableStays:[];
 const extras=Array.isArray(value.extraFeatures)?value.extraFeatures:[];
 const update=(key,next)=>onChange({...value,[key]:next});
 const toggle=(key,list,id,checked)=>update(key,checked?[...new Set([...list,id])]:list.filter(x=>x!==id));
 const target=error.includes("نوع اقامتگاه")?"type":error.includes("شیوه اقامت")?"stays":error.includes("حریم خصوصی")?"privacy":error.includes("نوع قرارداد")?"contract":error.includes("رهن")||error.includes("اجاره ماهانه")||error.includes("ودیعه")?(term==="long"?"contract":"finance"):"details";
 useEffect(()=>{if(!error)return; const raf=requestAnimationFrame(()=>{
   const node=document.getElementById(`fj-villa-${target}`);
   node?.closest("details")?.setAttribute("open","");node?.scrollIntoView({behavior:"smooth",block:"center"});
 });return ()=>cancelAnimationFrame(raf);},[error,target]);
 const moneyField=(id,label,key,description)=> <label id={id} className="fj-vo__money"><b>{label}</b><input disabled={disabled} inputMode="numeric" value={villaMoneyInput(value[key])} onChange={e=>update(key,villaDigits(e.target.value).slice(0,15))} placeholder="مبلغ به ریال"/><small>{description}</small></label>;
 return <div className="fj-vo-wrap" dir="rtl">
  <section className="fj-vo">
   <header className="fj-vo__header"><span aria-hidden="true">🏡</span><div><strong>مشخصات و شرایط واگذاری اقامتگاه</strong><p>نوع قرارداد را مشخص کن تا فقط سؤال‌های مرتبط نمایش داده شوند.</p></div></header>
   <div className="fj-vo__term" role="group" aria-label="نوع واگذاری ویلا">{VILLA_RENTAL_TERMS.map(([id,label])=><button type="button" key={id} disabled={disabled} className={term===id?"active":""} aria-pressed={term===id} onClick={()=>onChange({...value,rentalTerm:id,canNegotiateOtherTerm:false})}>{label}</button>)}</div>
   <div className="fj-vo__conversion">
     <label className="fj-vo__conversion-check">
       <input type="checkbox" disabled={disabled} checked={value.canNegotiateOtherTerm===true} onChange={e=>update("canNegotiateOtherTerm",e.target.checked)}/>
       <span>در صورت درخواست متقاضی، <strong>امکان بررسی تبدیل به اجاره {term==="short"?"بلندمدت":"کوتاه‌مدت"}</strong> را هم دارم.</span>
     </label>
     <small>این گزینه فقط اعلام آمادگی برای مذاکره است؛ قیمت و شرایط روش دوم باید جداگانه توافق شود و به‌معنای رزرو یا پذیرش قطعی نیست.</small>
   </div>
   <div className="fj-vo__grid">
    <label id="fj-villa-type"><b>نوع اقامتگاه <em>*</em></b><select disabled={disabled} value={value.accommodationType||""} onChange={e=>update("accommodationType",e.target.value)}><option value="">انتخاب کن</option>{VILLA_OFFER_TYPES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label id="fj-villa-privacy"><b>حریم خصوصی <em>*</em></b><select disabled={disabled} value={value.privacy||""} onChange={e=>update("privacy",e.target.value)}><option value="">انتخاب کن</option>{VILLA_OFFER_PRIVACY.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   </div>
   <small>«کاملاً اختصاصی» را فقط در صورت اطمینان انتخاب کن.</small>
   {value.accommodationType==="other"&&<label><b>نام دقیق اقامتگاه دیگر <em>*</em></b><input disabled={disabled} maxLength={80} value={value.otherType||""} onChange={e=>update("otherType",e.target.value)} placeholder="حداقل ۵ حرف"/></label>}
   {term==="short"&&<div id="fj-villa-stays" className="fj-vo__group"><strong>شیوه‌های اقامت قابل ارائه <em>*</em></strong><div className="fj-vo__checks">{VILLA_OFFER_STAYS.map(([id,label])=><label key={id} className={stays.includes(id)?"is-selected":""}><input type="checkbox" disabled={disabled} checked={stays.includes(id)} onChange={e=>toggle("availableStays",stays,id,e.target.checked)}/>{label}</label>)}</div><small>قیمت هر دوره در مرحله آخر مشخص می‌شود؛ این گزینه‌ها فقط نوع اقامت قابل پذیرش‌اند.</small></div>}
   {term==="long"&&<div className="fj-vo__group fj-vo__finance" id="fj-villa-contract"><strong>قرارداد بلندمدت <em>*</em></strong><div className="fj-vo__checks">{VILLA_LONG_MODES.map(([id,label])=><label key={id} className={value.financialMode===id?"is-selected":""}><input type="radio" name="fj-villa-long-mode" disabled={disabled} checked={value.financialMode===id} onChange={()=>update("financialMode",id)}/>{label}</label>)}</div>{value.financialMode&&<div className="fj-vo__grid">{value.financialMode!=="rent_only"&&moneyField("fj-villa-finance","مبلغ رهن (ریال)","longDepositRial","وجه رهن قرارداد بلندمدت؛ با ضمانت خسارت اقامت کوتاه‌مدت تفاوت دارد.")}{value.financialMode!=="full_deposit"&&moneyField("fj-villa-finance-rent","اجاره ماهانه (ریال)","longMonthlyRentRial","مبلغ ماهانه، جدا از رهن وارد شود.")}</div>}<small>در قرارداد رهن کامل اجاره ماهانه نداریم. در فقط اجاره، مبلغ رهن ثبت نمی‌شود.</small></div>}
   {term==="short"&&<div className="fj-vo__finance" id="fj-villa-finance">{moneyField("fj-villa-deposit","ودیعه یا ضمانت خسارت (اختیاری، ریال)","depositRial","این مبلغ جدا از هزینه اقامت است. اگر دریافت نمی‌کنی خالی بگذار؛ به معنی رهن بلندمدت نیست.")}</div>}
   <div id="fj-villa-details" className="fj-vo__villa-fields"><VillaFields value={details} onChange={onDetailsChange} rentalTerm={term} extraFeatures={extras} onExtraChange={(id,checked)=>toggle("extraFeatures",extras,id,checked)} disabled={disabled}/></div>
   {error&&<p className="fj-vo__error" role="alert">{error}</p>}
  </section>
  <section className="fj-vo fj-vo__notes"><header className="fj-vo__header"><span>📝</span><div><strong>جزئیات تکمیلی آگهی (اختیاری)</strong><p>فقط مواردی را بنویس که در سؤال‌های قبلی نیامده است.</p></div></header><textarea disabled={disabled} rows={3} maxLength={2000} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="مثلاً قوانین ویژه، دسترسی، موقعیت و شرایط خاص ملک"/></section>
 </div>;
}
