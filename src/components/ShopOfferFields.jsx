import { useEffect, useState } from "react";
import ShopFields from "./ShopFields";
import {SHOP_OFFER_TYPES,SHOP_OFFER_ACTIVITIES,SHOP_OFFER_TRANSFERS,SHOP_OFFER_FLOORS,SHOP_OFFER_LOCATIONS,SHOP_OFFER_FEATURES,SHOP_RIGHTS,shopMoneyInputDigits,formatShopMoneyInput} from "../utils/shopOffer";
import "./ParkingOfferFields.css";
import "./ShopOfferFields.css";
export default function ShopOfferFields({value={},onChange,details={},onDetailsChange,note="",onNoteChange,disabled=false,error=""}){
 const [expanded,setExpanded]=useState(false);
 const activities=Array.isArray(value.allowedActivities)?value.allowedActivities:[];
 const features=Array.isArray(value.features)?value.features:[];
 const change=(key,v)=>onChange({...value,[key]:v});
 const errorTarget=/نوع فضای تجاری/.test(error)?"type":/فعالیت/.test(error)?"activities":/نوع واگذاری/.test(error)?"transfer":/نوع حق/.test(error)?"rights":"extra";
 useEffect(()=>{
  if(!error)return;
  if(errorTarget==="extra"&&!expanded){setExpanded(true);return;}
  const frame=requestAnimationFrame(()=>document.getElementById(`shop-offer-${errorTarget}`)?.scrollIntoView({behavior:"smooth",block:"center"}));
  return ()=>cancelAnimationFrame(frame);
 },[error,errorTarget,expanded]);
 const choice=(id,key,options,title)=> <div id={`shop-offer-${id}`} className="fj-sh-group"><strong>{title} <b>*</b></strong><div className="fj-sh-choices">{options.map(([valueId,label])=><button key={valueId} type="button" aria-pressed={value[key]===valueId} disabled={disabled} className={`fj-sh-choice${value[key]===valueId?" is-selected":""}`} onClick={()=>onChange({...value,[key]:valueId,...(key==="spaceType"?{otherSpaceType:valueId==="other"?value.otherSpaceType||"":"",frontageM:["mall","complex","booth"].includes(valueId)?"":value.frontageM,features:["mall","complex"].includes(valueId)?features:features.filter(x=>x!=="elevator")}: {})})}>{value[key]===valueId?"✓ ":""}{label}</button>)}</div>{error&&errorTarget===id&&<p role="alert" className="fj-sh-error">{error}</p>}</div>;
 const select=(label,key,options,hint="")=><label className="fj-po-field fj-sh-field"><span>{label}</span><select disabled={disabled} value={value[key]||""} onChange={e=>change(key,e.target.value)}><option value="">مشخص نشده</option>{options.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select><small>{hint||" "}</small></label>;
 const amount=(label,key,hint="")=><label className="fj-po-field fj-sh-field"><span>{label}</span><input type="text" inputMode="numeric" dir="ltr" className="fj-sh-money-input" disabled={disabled} value={formatShopMoneyInput(value[key])} onChange={e=>{
   const input=e.currentTarget;
   const cursor=input.selectionStart??input.value.length;
   const digitsBeforeCursor=shopMoneyInputDigits(input.value.slice(0,cursor)).length;
   const digits=shopMoneyInputDigits(input.value);
   change(key,digits);
   requestAnimationFrame(()=>{
    if(!input.isConnected||document.activeElement!==input)return;
    const display=formatShopMoneyInput(digits);
    let pos=0,count=0;
    while(pos<display.length&&count<digitsBeforeCursor){if(/[0-9]/.test(display[pos]))count++;pos++;}
    if(digitsBeforeCursor>=digits.length)pos=display.length;
    input.setSelectionRange(pos,pos);
   });
  }} placeholder="مثلاً 1,000,000,000"/><small>{hint||"اگر مشخص نیست، خالی بگذارید."}</small></label>;
 return <section className="fj-po fj-sh" aria-label="مشخصات واقعی مغازه">
  <header className="fj-po-header"><span aria-hidden="true">🏪</span><div><h3>مشخصات واقعی فضای تجاری</h3><p>سه پاسخ اصلی؛ سایر ویژگی‌ها فقط در صورت نیاز.</p></div></header>
  {choice("type","spaceType",SHOP_OFFER_TYPES,"نوع فضای تجاری موجود")}
  {value.spaceType==="other"&&<label className="fj-po-field"><span>نوع فضای تجاری دیگر <b>*</b></span><input disabled={disabled} maxLength={160} value={value.otherSpaceType||""} onChange={e=>change("otherSpaceType",e.target.value)} placeholder="مثلاً پیشخوان داخل سالن"/></label>}
  <div id="shop-offer-activities" className="fj-sh-group"><strong>چه فعالیت‌هایی در این فضا قابل ارائه است؟ <b>*</b></strong><div className="fj-sh-choices">{SHOP_OFFER_ACTIVITIES.map(([id,label])=><label key={id} className="fj-sh-check"><input type="checkbox" disabled={disabled} checked={activities.includes(id)} onChange={e=>change("allowedActivities",e.target.checked?[...activities,id]:activities.filter(x=>x!==id))}/>{label}</label>)}</div>
    {activities.includes("other")&&<label className="fj-po-field"><span>فعالیت دیگر <b>*</b></span><input disabled={disabled} maxLength={160} value={value.otherActivity||""} onChange={e=>change("otherActivity",e.target.value)}/></label>}
    {error&&errorTarget==="activities"&&<p role="alert" className="fj-sh-error">{error}</p>}
    <small>این‌ها صرفاً کاربردهای اعلام‌شده توسط مالک هستند و مجوز صنفی را اثبات نمی‌کنند.</small>
  </div>
  {choice("transfer","transferType",SHOP_OFFER_TRANSFERS,"نوع واگذاری واقعی")}
  {value.transferType==="key_money"&&<div id="shop-offer-rights" className="fj-sh-group"><strong>عنوان حق مورد واگذاری <b>*</b></strong><div className="fj-sh-choices">{SHOP_RIGHTS.map(([id,label])=><button key={id} type="button" className={`fj-sh-choice${value.rightsType===id?" is-selected":""}`} aria-pressed={value.rightsType===id} disabled={disabled} onClick={()=>change("rightsType",id)}>{label}</button>)}</div>{error&&errorTarget==="rights"&&<p role="alert" className="fj-sh-error">{error}</p>}</div>}
  <button type="button" className="fj-po-more" aria-expanded={expanded} disabled={disabled} onClick={()=>setExpanded(x=>!x)}><span>＋ جزئیات تکمیلی (اختیاری)</span><span>{expanded?"⌃":"⌄"}</span></button>
  {expanded&&<div className="fj-sh-extra" id="shop-offer-extra">
   <div className="fj-sh-row">{select("طبقه واقعی واحد","floor",SHOP_OFFER_FLOORS)}{select("موقعیت واحد تجاری","locationPreference",SHOP_OFFER_LOCATIONS)}</div>
   {!(["mall","complex","booth"].includes(value.spaceType))&&<label className="fj-po-field"><span>برِ مغازه (متر، اختیاری)</span><input disabled={disabled} inputMode="decimal" value={value.frontageM??""} onChange={e=>change("frontageM",e.target.value)} placeholder="مثلاً ۴٫۵"/><small>فقط اگر اندازه دقیق را می‌دانید.</small></label>}
   <div className="fj-sh-group"><strong>امکانات موجود دیگر</strong><div className="fj-sh-choices">{SHOP_OFFER_FEATURES.filter(([id])=>["mall","complex"].includes(value.spaceType)||id!=="elevator").map(([id,label])=><label className="fj-sh-check" key={id}><input disabled={disabled} type="checkbox" checked={features.includes(id)} onChange={e=>change("features",e.target.checked?[...features,id]:features.filter(x=>x!==id))}/>{label}</label>)}</div><small>تیک نزدن به معنای نبودن قطعی امکان نیست.</small></div>
   <div className="fj-sh-finance"><strong>شرایط مالی (اختیاری) — همه مبالغ به ریال</strong><div className="fj-sh-row">
    {["rent","full_deposit"].includes(value.transferType)&&amount(value.transferType==="full_deposit"?"مبلغ رهن کامل":"مبلغ ودیعه / پول پیش","depositRial")}
    {value.transferType==="rent"&&amount("اجاره ماهانه","monthlyRentRial","این مبلغ فقط اجاره ماهانه است، نه پول پیش.")}
    {value.transferType==="key_money"&&amount("مبلغ پیشنهادی واگذاری حق","keyMoneyRial","با اجاره ماهانه یا ودیعه یکی نیست.")}
   </div><small>اگر مبلغی مشخص نشده باشد، در آگهی «توافقی» ثبت می‌شود. عنوان حق و اعتبار مدارک نیازمند بررسی مستقل است.</small></div>
   <div className="fj-sh-legacy"><strong>آب، برق، گاز و سرمایش/گرمایش</strong><ShopFields value={details} onChange={onDetailsChange} disabled={disabled}/></div>
   <label className="fj-po-field" htmlFor="shop-offer-notes"><span>نکات خاص مغازه (اختیاری)</span><textarea id="shop-offer-notes" disabled={disabled} rows={3} maxLength={800} value={note} onChange={e=>onNoteChange?.(e.target.value)} placeholder="مثلاً محدودیت صنفی، ساعات ورود یا شرایط خاص واگذاری"/><small>{String(note).length.toLocaleString("fa-IR")}/۸۰۰</small></label>
   {error&&errorTarget==="extra"&&<p role="alert" className="fj-sh-error">{error}</p>}
  </div>}
  <p className="fj-po-note">اطلاعات فعالیت و نوع حق، اظهار مالک است؛ مجوز صنفی و اصالت حقوق واگذاری را مستقلاً بررسی کنید.</p>
 </section>;
}
