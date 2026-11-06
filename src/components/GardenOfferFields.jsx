import { useEffect, useState } from "react";
import GardenFields from "./GardenFields";
import {
 GARDEN_OFFER_TYPES,GARDEN_OFFER_PURPOSES,GARDEN_OFFER_ROADS,GARDEN_OFFER_DURATIONS,
 GARDEN_OFFER_PRIVACY,GARDEN_OFFER_FEATURES,GARDEN_FINANCIAL_MODES,gardenMoneyInputDigits,formatGardenMoneyInput
} from "../utils/gardenOffer";
import "./ParkingOfferFields.css";
import "./GardenOfferFields.css";
export default function GardenOfferFields({value={},onChange,details={},onDetailsChange,note="",onNoteChange,disabled=false,error=""}) {
 const [expanded,setExpanded]=useState(false);
 const uses=Array.isArray(value.allowedPurposes)?value.allowedPurposes:[];
 const features=Array.isArray(value.features)?value.features:[];
 const errorTarget=error.startsWith("شیوه دریافت")||error.startsWith("مبلغ ودیعه")?"finance":error.startsWith("نوع باغ")?"type":error.startsWith("حداقل یک کاربرد")||error.startsWith("کاربرد دیگر")?"purposes":error.startsWith("نوع راه دسترسی")?"road":"extra";
 useEffect(()=>{
  if(!error)return undefined;
  if(errorTarget==="extra"&&!expanded){setExpanded(true);return undefined;}
  const frame=requestAnimationFrame(()=>document.getElementById(`garden-offer-${errorTarget}`)?.scrollIntoView({behavior:"smooth",block:"center"}));
  return ()=>cancelAnimationFrame(frame);
 },[error,errorTarget,expanded]);
 const update=(key,v)=>onChange({...value,[key]:v});
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
   <strong>شرایط مالی واگذاری باغ <b>*</b></strong>
   <div className="fj-go-choices" role="group" aria-label="نوع رهن و اجاره باغ">
    {GARDEN_FINANCIAL_MODES.map(([id,label])=><button type="button" key={id} disabled={disabled} className={`fj-go-choice${value.financialMode===id?" is-selected":""}`} aria-pressed={value.financialMode===id} onClick={()=>onChange({...value,financialMode:id,depositRial:id==="rent_only"?"":value.depositRial})}>{value.financialMode===id?"✓ ":""}{label}</button>)}
   </div>
   {value.financialMode!=="rent_only" && ["full_deposit","deposit_rent"].includes(value.financialMode) && <label className="fj-go-field" style={{maxWidth:460}}><span>{value.financialMode==="full_deposit"?"مبلغ رهن کامل (ریال)":"مبلغ ودیعه / پول پیش (ریال)"} <b>*</b></span><input disabled={disabled} inputMode="numeric" type="text" dir="ltr" value={formatGardenMoneyInput(value.depositRial)} onChange={e=>{
      const input=e.currentTarget;const cursor=input.selectionStart??input.value.length;
      const digitsBefore=gardenMoneyInputDigits(input.value.slice(0,cursor)).length;
      const clean=gardenMoneyInputDigits(input.value);update("depositRial",clean);
      requestAnimationFrame(()=>{
       if(!input.isConnected||document.activeElement!==input)return;
       const formatted=formatGardenMoneyInput(clean);let pos=0,count=0;
       while(pos<formatted.length&&count<digitsBefore){if(/[0-9]/.test(formatted[pos]))count++;pos++;}
       if(digitsBefore>=clean.length)pos=formatted.length;input.setSelectionRange(pos,pos);
      });
   }} placeholder="مثلاً 1,000,000,000"/><small>{value.financialMode==="full_deposit"?"در رهن کامل مبلغ اجاره‌ای در مرحله آخر مطالبه نمی‌شود.":"مبلغ اجاره دوره‌ای را در مرحله آخر وارد کنید."}</small></label>}
   <small>در حالت «فقط اجاره» ودیعه‌ای ثبت نمی‌شود؛ مبالغ اجاره در مرحله نهایی تکمیل می‌شوند.</small>
   {error&&errorTarget==="finance"&&<p role="alert" className="fj-go-error">{error}</p>}
  </div>
  <button type="button" className="fj-po-more" aria-expanded={expanded} disabled={disabled} onClick={()=>setExpanded(v=>!v)}><span>＋ جزئیات تکمیلی (اختیاری)</span><span>{expanded?"⌃":"⌄"}</span></button>
  {expanded&&<div className="fj-go-extra" id="garden-offer-extra">
   <div className="fj-go-row">
    {select("مدت قابل واگذاری","rentalDuration",GARDEN_OFFER_DURATIONS,"مدت واقعی مورد توافق؛ قیمت دوره‌ای را در مرحله آخر تعیین کنید.")}
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
  <p className="fj-po-note">متراژ واقعی باغ را در ادامه وارد کنید؛ اجاره دوره‌ای نیز در مرحله آخر مشخص می‌شود. امکانات و کاربردها، اظهار مالک هستند و جای تأیید مجوز را نمی‌گیرند.</p>
 </section>;
}
