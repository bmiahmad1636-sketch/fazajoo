import { useEffect, useState } from "react";
import GardenFields from "./GardenFields";
import {
 GARDEN_OFFER_TYPES,GARDEN_OFFER_PURPOSES,GARDEN_OFFER_ROADS,
 GARDEN_OFFER_PRIVACY,GARDEN_OFFER_FEATURES,GARDEN_FINANCIAL_MODES,GARDEN_RENTAL_TERMS,GARDEN_SHORT_UNITS,gardenMoneyInputDigits,formatGardenMoneyInput
} from "../utils/gardenOffer";
import "./ParkingOfferFields.css";
import "./GardenOfferFields.css";
export default function GardenOfferFields({value={},onChange,details={},onDetailsChange,note="",onNoteChange,disabled=false,error=""}) {
 const [expanded,setExpanded]=useState(false);
 const uses=Array.isArray(value.allowedPurposes)?value.allowedPurposes:[];
 const features=Array.isArray(value.features)?value.features:[];
 const errorTarget=error.startsWith("مدت اصلی")||error.startsWith("اجاره ماهانه")||error.startsWith("اجاره کوتاه")||error.startsWith("مبلغ اجاره")||error.startsWith("دوره محاسبه")||error.startsWith("مبلغ رهن")||error.startsWith("مبلغ ودیعه")||error.startsWith("شیوه مالی")||error.startsWith("شیوه دریافت")?"finance":error.startsWith("نوع باغ")?"type":error.startsWith("حداقل یک کاربرد")||error.startsWith("کاربرد دیگر")?"purposes":error.startsWith("نوع راه دسترسی")?"road":"extra";
 useEffect(()=>{
  if(!error)return undefined;
  if(errorTarget==="extra"&&!expanded){setExpanded(true);return undefined;}
  const frame=requestAnimationFrame(()=>document.getElementById(`garden-offer-${errorTarget}`)?.scrollIntoView({behavior:"smooth",block:"center"}));
  return ()=>cancelAnimationFrame(frame);
 },[error,errorTarget,expanded]);
 const update=(key,v)=>onChange({...value,[key]:v});
 const moneyField=(title,key,required=false)=><label className="fj-go-field" key={key}><span>{title} {required&&<b>*</b>}</span><input disabled={disabled} inputMode="numeric" dir="ltr" value={formatGardenMoneyInput(value[key])} onChange={e=>update(key,gardenMoneyInputDigits(e.target.value))} placeholder="مبلغ به ریال"/><small>{required?"مبلغ قطعی این شیوه واگذاری را وارد کنید.":"این مبلغ در صورت دریافت، جداگانه نمایش داده می‌شود."}</small></label>;
 const choice=(field,key,title,options)=> <div id={`garden-offer-${field}`} className={`fj-go-group${error&&errorTarget===field?" fj-go-invalid":""}`}>
  <strong>{title} <b>*</b></strong><div className="fj-go-choices" role="group" aria-label={title}>
   {options.map(([id,label])=><button type="button" key={id} disabled={disabled} aria-pressed={value[key]===id} className={`fj-go-choice${value[key]===id?" is-selected":""}`} onClick={()=>update(key,id)}>{value[key]===id?"✓ ":""}{label}</button>)}
  </div>{error&&errorTarget===field&&<p role="alert" className="fj-go-error">{error}</p>}</div>;
 const select=(name,key,opts,hint="")=><label className="fj-go-field"><span>{name}</span><select disabled={disabled} value={value[key]||""} onChange={e=>update(key,e.target.value)}><option value="">مشخص نشده</option>{opts.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select><small>{hint||" "}</small></label>;
 return <section className="fj-po fj-go" aria-label="عرضه تخصصی باغ">
  <header className="fj-po-header"><span aria-hidden="true">🌳</span><div><h3>مشخصات واقعی باغ</h3><p>نوع باغ، کاربرد، دسترسی و شیوه مالی؛ جزئیات دیگر اختیاری‌اند.</p></div></header>
  {choice("type","gardenType","نوع باغ موجود",GARDEN_OFFER_TYPES)}
  <div id="garden-offer-purposes" className={`fj-go-group${error&&errorTarget==="purposes"?" fj-go-invalid":""}`}>
   <strong>باغ را برای چه استفاده‌هایی می‌توانید واگذار کنید؟ <b>*</b></strong>
   <div className="fj-go-choices" role="group" aria-label="کاربردهای قابل واگذاری باغ">{GARDEN_OFFER_PURPOSES.map(([id,label])=><label key={id} className="fj-go-check"><input disabled={disabled} type="checkbox" checked={uses.includes(id)} onChange={e=>{
    const next=e.target.checked?[...uses,id]:uses.filter(x=>x!==id);
    onChange({...value,allowedPurposes:next,...(!next.includes("event")?{eventCapacity:""}:{}),...(!next.includes("other")?{otherPurpose:""}:{})});
   }}/>{label}</label>)}</div>
   {uses.includes("other")&&<label className="fj-go-field"><span>کاربرد دیگر <b>*</b></span><input disabled={disabled} maxLength={160} placeholder="مثلاً نگهداری نهال‌های خاص" value={value.otherPurpose||""} onChange={e=>update("otherPurpose",e.target.value)}/></label>}
   {error&&errorTarget==="purposes"&&<p role="alert" className="fj-go-error">{error}</p>}
   <small>واگذاری برای یک استفاده، به معنی داشتن مجوز قانونی آن نیست؛ برگزاری مراسم باید جداگانه بررسی شود.</small>
  </div>
  {choice("road","accessRoad","نوع راه دسترسی تا باغ",GARDEN_OFFER_ROADS)}
  <div id="garden-offer-finance" className={`fj-go-group fj-go-finance${error&&errorTarget==="finance"?" fj-go-invalid":""}`}>
   <strong>مدت اصلی واگذاری باغ <b>*</b></strong>
   <div className="fj-go-choices" role="group" aria-label="مدت اصلی واگذاری باغ">
    {GARDEN_RENTAL_TERMS.map(([id,label])=><button type="button" key={id} disabled={disabled} aria-pressed={value.rentalTerm===id} className={`fj-go-choice${value.rentalTerm===id?" is-selected":""}`} onClick={()=>update("rentalTerm",id)}>{value.rentalTerm===id?"✓✓ ":""}{label}</button>)}
   </div>
   {value.rentalTerm==="short"&&<div className="fj-go-row">
    <label className="fj-go-field"><span>دوره محاسبه اجاره <b>*</b></span><select disabled={disabled} value={value.shortRateUnit||"daily"} onChange={e=>update("shortRateUnit",e.target.value)}>{GARDEN_SHORT_UNITS.map(([id,text])=><option key={id} value={id}>{text}</option>)}</select><small>دوره قیمت است، نه مدت قرارداد</small></label>
    {moneyField("مبلغ اجاره کوتاه‌مدت (ریال)","shortRateRial",true)}
    {moneyField("ودیعه / ضمانت خسارت (اختیاری)","securityHoldRial")}
   </div>}
   {value.rentalTerm==="seasonal"&&<div className="fj-go-row">
    {moneyField("مبلغ اجاره هر فصل (ریال)","seasonalRateRial",true)}
    {moneyField("ودیعه / ضمانت خسارت فصلی (اختیاری)","seasonalSecurityHoldRial")}
    <small className="fj-go-wide">فصل و تاریخ شروع و پایان با توافق طرفین تعیین می‌شود؛ این مبلغ برای هر فصل ثبت می‌شود، نه ماهانه.</small>
   </div>}
   {value.rentalTerm==="long"&&<>
    <strong>شیوه مالی اجاره بلندمدت <b>*</b></strong>
    <div className="fj-go-choices" role="group" aria-label="شیوه مالی بلندمدت باغ">
     {GARDEN_FINANCIAL_MODES.map(([id,label])=><button type="button" key={id} disabled={disabled} aria-pressed={value.financialMode===id} className={`fj-go-choice${value.financialMode===id?" is-selected":""}`} onClick={()=>onChange({...value,financialMode:id,depositRial:id==="rent_only"?"":value.depositRial})}>{value.financialMode===id?"✓ ":""}{label}</button>)}
    </div>
    <div className="fj-go-row">
     {value.financialMode!=="rent_only"&&["full_deposit","deposit_rent"].includes(value.financialMode)&&moneyField(value.financialMode==="full_deposit"?"مبلغ رهن کامل (ریال)":"مبلغ رهن / ودیعه (ریال)","depositRial",true)}
     {value.financialMode!=="full_deposit"&&moneyField("اجاره ماهانه بلندمدت (ریال)","longMonthlyRentRial",true)}
    </div>
   </>}
   {["short","long"].includes(value.rentalTerm)&&<label className="fj-go-check fj-go-convert"><input type="checkbox" disabled={disabled} checked={value.canNegotiateOtherTerm===true} onChange={e=>update("canNegotiateOtherTerm",e.target.checked)}/>{value.rentalTerm==="short"?"اگر متقاضی اجاره بلندمدت بخواهد، مایل هستم شرایط آن را هم بررسی و درباره‌اش مذاکره کنم.":"اگر متقاضی اجاره کوتاه‌مدت بخواهد، مایل هستم شرایط آن را هم بررسی و درباره‌اش مذاکره کنم."}</label>}
   <small>نوع اصلی قرارداد قطعی است؛ بررسی نوع دیگر فقط با رضایت شما و توافق جداگانه انجام می‌شود. ضمانت خسارت، رهن بلندمدت نیست.</small>
   {error&&errorTarget==="finance"&&<p role="alert" className="fj-go-error">{error}</p>}
  </div>
  <button type="button" className="fj-po-more" aria-expanded={expanded} disabled={disabled} onClick={()=>setExpanded(v=>!v)}><span>＋ جزئیات تکمیلی (اختیاری)</span><span>{expanded?"⌃":"⌄"}</span></button>
  {expanded&&<div className="fj-go-extra" id="garden-offer-extra">
   <div className="fj-go-row">
    {select("وضعیت حریم خصوصی","privacy",GARDEN_OFFER_PRIVACY,"اگر مطمئن نیستید، انتخاب را خالی بگذارید.")}
   </div>
   {uses.includes("event")&&<div className="fj-go-row"><label className="fj-go-field"><span>حداکثر ظرفیت قابل پذیرش مهمان (نفر)</span><input disabled={disabled} inputMode="numeric" type="text" value={value.eventCapacity??""} onChange={e=>update("eventCapacity",e.target.value)} placeholder="فقط اگر عدد واقعی را می‌دانید"/><small>این عدد مجوز برگزاری مراسم نیست.</small></label></div>}
   <div className="fj-go-group"><strong>امکانات اضافه واقعاً موجود</strong><div className="fj-go-choices">
    {GARDEN_OFFER_FEATURES.map(([id,label])=><label key={id} className="fj-go-check"><input disabled={disabled} type="checkbox" checked={features.includes(id)} onChange={e=>update("features",e.target.checked?[...features,id]:features.filter(x=>x!==id))}/>{label}</label>)}
   </div><small>گزینه تیک‌نخورده لزوماً به معنی نبودن آن امکان نیست.</small></div>
   <div className="fj-go-legacy"><strong>🌿 درختان، آب، آبیاری و ساختمان موجود</strong>
    <GardenFields value={details} disabled={disabled} onChange={onDetailsChange} hideAccessRoad/>
   </div>
   {error&&errorTarget==="extra"&&<p role="alert" className="fj-go-error">{error}</p>}
   <label className="fj-go-field" htmlFor="garden-offer-note"><span>نکات خاص باغ (اختیاری)</span><textarea id="garden-offer-note" maxLength={800} rows={3} disabled={disabled} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="مثلاً نحوه تحویل، محدودیت تردد یا شرایط قانونی مهم..."/><small>{String(note).length.toLocaleString("fa-IR")}/۸۰۰ نویسه</small></label>
  </div>}
  <p className="fj-po-note">متراژ واقعی باغ را در ادامه وارد کنید؛ مبلغ و مدت اصلی واگذاری همین‌جا ثبت می‌شوند. امکانات و کاربردها، اظهار مالک هستند و جای تأیید مجوز را نمی‌گیرند.</p>
 </section>;
}
