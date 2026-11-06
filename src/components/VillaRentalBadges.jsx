import {villaRentalBadges} from "../utils/villaOffer";
import "./VillaRentalBadges.css";

/** Primary: two green checks; negotiable alternative: one; inactive: muted.
 * Neither an alternative rental rate nor guaranteed acceptance is implied. */
export default function VillaRentalBadges({attributes, compact=false}){
 const badges=villaRentalBadges(attributes);
 if(!badges.length)return null;
 return <div dir="rtl" className={`fj-vr-badges${compact?" fj-vr-badges--compact":""}`} aria-label="روش‌های واگذاری ویلا">
  {badges.map(({term,label,state})=><span key={term} className={`fj-vr-badge fj-vr-badge--${state}`} title={state==='primary'?'روش اصلی و ثبت‌شده آگهی':state==='possible'?'امکان بررسی تبدیل، فقط با توافق مالک':'برای این روش موافقتی ثبت نشده است'}>
   <span className="fj-vr-badge__dot" aria-hidden="true"/>
   <span>{label}</span>
   {state==='primary'&&<span className="fj-vr-badge__ticks" aria-label="روش اصلی">✓✓</span>}
   {state==='possible'&&<span className="fj-vr-badge__ticks" aria-label="امکان مذاکره">✓</span>}
  </span>)}
  {badges.some(b=>b.state==='possible')&&<small className="fj-vr-badges__hint">تبدیل نوع اجاره با توافق طرفین قابل بررسی است</small>}
 </div>;
}
