import { useEffect } from "react";
import {
 LAND_TERMS, LAND_MODES, LAND_CONTRACT_UNITS, landMoneyInput, landMoneyDisplay,
 changeLandTerm, changeLandMode, changeLandUnit,
} from "../utils/landContract.js";
import "./LandContractFields.css";

/** A single controlled contract component for supply and demand, powered by RT-00. */
export default function LandContractFields({ value={},onChange,wanted=false,disabled=false,error="",allowCropShare=false }) {
 const v=value||{};
 const set=(key,next)=>onChange({...v,[key]:next});
 const crop=v.transactionKind==="crop_share";
 const target = !error ? "" : error.includes("مشارکت در محصول")?"crop"
  :error.includes("مدت اصلی")?"term":error.includes("دوره محاسبه")?"unit"
  :error.includes("نوع قرارداد")?"mode":error.includes("سقف رهن")||error.includes("مبلغ رهن")?"deposit"
  :error.includes("ضمانت")?"security":"rent";
 useEffect(()=>{
  if(!target)return undefined;
  const frame=requestAnimationFrame(()=>document.getElementById(`fj-land-finance-${target}`)?.scrollIntoView({behavior:"smooth",block:"center"}));
  return ()=>cancelAnimationFrame(frame);
 },[target,error]);
 const invalid=(id)=>target===id? <small className="fj-lc-error" role="alert">{error}</small>:null;
 const money=(label,key,required=false,id="rent",hint="")=><label className="fj-lc-field" id={`fj-land-finance-${id}`} key={key}>
  <span>{label}{required&&<b> *</b>}</span>
  <input type="text" dir="ltr" inputMode="numeric" value={landMoneyDisplay(v[key])} disabled={disabled}
    aria-invalid={target===id} onChange={e=>set(key,landMoneyInput(e.target.value))} placeholder="مبلغ به ریال"/>
  {invalid(id)}{hint&&<small className="fj-lc-hint">{hint}</small>}
 </label>;
 const units=(name,key,term)=> <label className="fj-lc-field" id="fj-land-finance-unit"><span>{name} <b>*</b></span>
   <select value={v[key]||""} disabled={disabled} onChange={e=>onChange(changeLandUnit(v,e.target.value,wanted))}>
   <option value="">انتخاب کنید</option>{LAND_CONTRACT_UNITS[term].map(([id,label])=><option value={id} key={id}>{label}</option>)}
   </select>{invalid("unit")}<small className="fj-lc-hint">دوره محاسبه مبلغ است، نه مدت قطعی قرارداد.</small></label>;
 return <section className="fj-lc" aria-label={wanted?"مدت و بودجه زمین موردنیاز":"مدت و شرایط مالی عرضه زمین"}>
  <header><h3>📅 {wanted?"مدت و بودجه زمین موردنیاز":"مدت و شرایط مالی واگذاری زمین"}</h3>
   <p>همه مبلغ‌ها به ریال‌اند. رهن بلندمدت با ضمانت خسارت کوتاه‌مدت فرق دارد.</p></header>
  {allowCropShare&&<div className="fj-lc-transaction" role="group" aria-label="نوع توافق زمین">
   <button type="button" disabled={disabled} className={!crop?"is-selected":""} aria-pressed={!crop} onClick={()=>onChange({...v,transactionKind:"lease"})}>اجاره زمین</button>
   <button type="button" disabled={disabled} className={crop?"is-selected":""} aria-pressed={crop} onClick={()=>onChange({...v,transactionKind:"crop_share",rentalTerm:""})}>مشارکت در محصول (مزارعه)</button>
  </div>}
  {crop ? <label className="fj-lc-field" id="fj-land-finance-crop"><span>شرایط مشارکت در محصول <b>*</b></span>
   <textarea rows={3} maxLength={800} disabled={disabled} value={v.cropShareNotes||""}
     onChange={e=>set("cropShareNotes",e.target.value)} placeholder="سهم طرفین، محصول، مدت همکاری و تعهدات اولیه را توضیح دهید"/>
   {invalid("crop")}<small className="fj-lc-hint">این توافق، اجاره مبلغ‌دار نیست و باید به‌صورت مستقل و با بررسی حقوقی پیگیری شود؛ تطبیق خودکار ندارد.</small>
  </label> : <>
   <div className="fj-lc-group" id="fj-land-finance-term"><strong>مدت اصلی قرارداد <b>*</b></strong>
    <div className="fj-lc-options" role="group" aria-label="مدت اصلی قرارداد زمین">
     {LAND_TERMS.map(([id,label])=><button type="button" key={id} disabled={disabled} aria-pressed={v.rentalTerm===id}
       className={v.rentalTerm===id?"is-selected":""} onClick={()=>onChange(changeLandTerm(v,id,wanted))}>{v.rentalTerm===id?"✓✓ ":""}{label}</button>)}
    </div>{invalid("term")}</div>
   {v.rentalTerm==="short" && <div className="fj-lc-grid">
    {units("دوره محاسبه اجاره کوتاه‌مدت","shortRateUnit","short")}
    {money(wanted?"حداکثر بودجه اجاره":"مبلغ اجاره کوتاه‌مدت",wanted?"maxBudgetRial":"shortRateRial",true)}
    {money(wanted?"حداکثر ضمانت خسارت / ودیعه (اختیاری)":"ضمانت خسارت / ودیعه (اختیاری)",wanted?"maxSecurityHoldRial":"securityHoldRial",false,"security")}
   </div>}
   {v.rentalTerm==="seasonal" && <div className="fj-lc-grid">
    {money(wanted?"سقف بودجه اجاره هر فصل":"اجاره هر فصل",wanted?"maxBudgetRial":"seasonalRateRial",true)}
    {money(wanted?"حداکثر ضمانت خسارت فصلی (اختیاری)":"ضمانت خسارت فصلی (اختیاری)",wanted?"maxSecurityHoldRial":"seasonalSecurityHoldRial",false,"security")}
    <small className="fj-lc-hint fj-lc-wide">فصل زراعی یا تاریخ شروع و پایان با توافق طرفین مشخص می‌شود؛ مبلغ مربوط به هر فصل است، نه ماه.</small>
   </div>}
   {v.rentalTerm==="long" && <>
    <div className="fj-lc-group" id="fj-land-finance-mode"><strong>نوع قرارداد بلندمدت <b>*</b></strong>
     <div className="fj-lc-options" role="group" aria-label="نوع قرارداد بلندمدت زمین">
      {LAND_MODES.map(([id,label])=><button type="button" key={id} disabled={disabled} className={v.financialMode===id?"is-selected":""}
        aria-pressed={v.financialMode===id} onClick={()=>onChange(changeLandMode(v,id,wanted))}>{v.financialMode===id?"✓ ":""}{label}</button>)}
     </div>{invalid("mode")}</div>
    <div className="fj-lc-grid">
     {v.financialMode!=="full_deposit"&&units("دوره محاسبه اجاره","longRateUnit","long")}
     {v.financialMode!=="rent_only"&&money(wanted?"سقف مبلغ رهن":"مبلغ رهن",wanted?"maxDepositRial":"longDepositRial",true,"deposit")}
     {v.financialMode!=="full_deposit"&&money(wanted?"سقف اجاره / "+(v.longRateUnit==="year"?"سالانه":"ماهانه"):"اجاره / "+(v.longRateUnit==="year"?"سالانه":"ماهانه"),wanted?"maxRentRial":v.longRateUnit==="year"?"longYearlyRentRial":"longMonthlyRentRial",true)}
    </div>
   </>}
   {!wanted&&["short","long"].includes(v.rentalTerm)&&<label className="fj-lc-consent"><input type="checkbox" disabled={disabled} checked={v.canNegotiateOtherTerm===true}
    onChange={e=>set("canNegotiateOtherTerm",e.target.checked)}/>
    <span>{v.rentalTerm==="short"?"اگر متقاضی اجاره بلندمدت بخواهد، مایلم شرایط آن را جداگانه بررسی کنم.":"اگر متقاضی اجاره کوتاه‌مدت بخواهد، مایلم شرایط آن را جداگانه بررسی کنم."}</span>
   </label>}
   {v.rentalTerm&&<p className="fj-lc-footer">مدت انتخاب‌شده مبنای آگهی است؛ تمایل به مذاکره درباره مدت دیگر به معنی تأیید قرارداد یا تطبیق قیمت آن نیست.</p>}
  </>}
 </section>;
}
