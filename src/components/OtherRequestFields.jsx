import {EMPTY_OTHER_REQUEST,OTHER_REQUEST_PERIODS,OTHER_REQUEST_LONG_MODES,OTHER_REQUEST_FEATURES,otherDigits} from "../utils/otherRequest";
import "./OtherSpaceFields.css";
export default function OtherRequestFields({value=EMPTY_OTHER_REQUEST,onChange,disabled=false,error=""}){
 const d={...EMPTY_OTHER_REQUEST,...value,features:Array.isArray(value?.features)?value.features:[]};
 const change=(key,next)=>onChange({...d,[key]:next});
 const cash=(title,key,placeholder)=><label className="fj-other-field"><span>{title}</span><input inputMode="numeric" type="text" disabled={disabled}
  placeholder={placeholder} value={otherDigits(d[key]).replace(/\B(?=(\d{3})+(?!\d))/g,",")}
  onChange={e=>change(key,otherDigits(e.target.value))}/></label>;
 return <section className="fj-other" dir="rtl">
  <header className="fj-other__intro"><strong>✨ فضای موردنیازت را حرفه‌ای و ساده معرفی کن</strong>
   <p>اگر فضایت در دسته‌های دیگر نیست، مثل استودیو، سالن تمرین، فضای کار اشتراکی یا پشت‌بام، توضیح بده تا عرضه‌کننده دقیق بداند چه می‌خواهی.</p></header>
  <label className="fj-other-field"><span>چه فضایی می‌خواهی و برای چه کاری؟ <b>*</b></span>
   <textarea rows={3} maxLength={700} disabled={disabled} value={d.requestText} placeholder="مثلاً فضای عایق صدا برای ضبط پادکست با دسترسی عصرها می‌خواهم..." onChange={e=>change("requestText",e.target.value)}/>
   <small className="fj-other__note">{String(d.requestText||"").length} / ۷۰۰ نویسه — حداقل ۲۰ نویسه</small></label>
  <div className="fj-other__panel"><strong>برای چه مدتی نیاز داری؟ <b>*</b></strong>
   <div className="fj-other__terms">
    {[["short","کوتاه‌مدت / مقطعی","روزانه، هفتگی یا ماهانه موقت"],["long","بلندمدت","قرارداد و بودجه رهن و اجاره"]].map(([id,name,hint])=><label className={`fj-other__term ${d.rentalTerm===id?"fj-other__term--active":""}`} key={id}>
     <input type="radio" name="fj-other-request-term" checked={d.rentalTerm===id} disabled={disabled} onChange={()=>change("rentalTerm",id)}/><span><strong>{name}</strong><small>{hint}</small></span>
    </label>)}
   </div>
   {d.rentalTerm==="short"&&<div className="fj-other__grid"><label className="fj-other-field"><span>دوره بودجه کوتاه‌مدت</span>
    <select disabled={disabled} value={d.pricePeriod} onChange={e=>change("pricePeriod",e.target.value)}>
     {OTHER_REQUEST_PERIODS.map(([id,text])=><option key={id} value={id}>{text}</option>)}
    </select></label>
    {d.pricePeriod!=="negotiable"&&cash("حداکثر اجاره (ریال)","maxBudget","مثلاً ۵۰,۰۰۰,۰۰۰")}
    <small className="fj-other__note">دوره بودجه با مدت قرارداد فرق دارد؛ مبلغ روزانه را به‌جای اجاره ماهانه مقایسه نمی‌کنیم.</small></div>}
   {d.rentalTerm==="long"&&<div className="fj-other__grid"><label className="fj-other-field"><span>نوع بودجه / قرارداد</span>
    <select disabled={disabled} value={d.financialMode} onChange={e=>change("financialMode",e.target.value)}>
     {OTHER_REQUEST_LONG_MODES.map(([id,text])=><option key={id} value={id}>{text}</option>)}
    </select></label>
    {["full_deposit","deposit_rent"].includes(d.financialMode)&&cash("حداکثر ودیعه قابل پرداخت (ریال)","maxDepositRial","اگر می‌دانی وارد کن")}
    {["rent_only","deposit_rent"].includes(d.financialMode)&&cash("حداکثر اجاره ماهانه (ریال)","maxMonthlyRentRial","اگر می‌دانی وارد کن")}
    <small className="fj-other__note">این ارقام سقف بودجه متقاضی هستند، نه قیمت قطعی مالک.</small></div>}
  </div>
  <details className="fj-other__extras"><summary>↔ متراژ موردنیاز (اختیاری)</summary>
   <div className="fj-other__grid">{cash("حداقل مساحت (مترمربع)","minArea","مثلاً ۵۰")}{cash("حداکثر مساحت (مترمربع)","maxArea","مثلاً ۱۵۰")}</div>
  </details>
  <details className="fj-other__extras"><summary>✨ امکانات و شرایط تکمیلی (اختیاری)</summary>
   <div className="fj-other__features">{OTHER_REQUEST_FEATURES.map(([id,name])=><label key={id}>
     <input type="checkbox" checked={d.features.includes(id)} disabled={disabled}
      onChange={e=>change("features",e.target.checked?[...new Set([...d.features,id])]:d.features.filter(x=>x!==id))}/>{name}</label>)}
   </div><label className="fj-other-field"><span>شرایط یا محدودیت‌های ضروری</span><textarea rows={2} maxLength={300} disabled={disabled} value={d.requirements} onChange={e=>change("requirements",e.target.value)} placeholder="مثلاً دسترسی شبانه، عدم مزاحمت صوتی یا نیاز به مجوز خاص"/></label>
  </details>
  {error&&<p className="fj-other__error" role="alert">{error}</p>}
 </section>;
}
