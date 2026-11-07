import {otherRentalBadges} from "../utils/otherOffer";
import "./VillaRentalBadges.css";
/** A negotiable alternative is never a second confirmed price or contract. */
export default function OtherRentalBadges({attributes,compact=false}){
 const badges=otherRentalBadges(attributes);
 if(!badges.length)return null;
 return <div dir="rtl" className={`fj-vr-badges${compact?" fj-vr-badges--compact":""}`} aria-label="مدت واگذاری سایر فضاها">
  {badges.map(({term,label,state})=><span key={term} className={`fj-vr-badge fj-vr-badge--${state}`}
   title={state==="primary"?"مدت اصلی آگهی":state==="possible"?"فقط با بررسی و توافق":"موافقتی ثبت نشده"}>
    <span className="fj-vr-badge__dot" aria-hidden="true"/><span>{label}</span>
    {state==="primary"&&<span className="fj-vr-badge__ticks" aria-label="مدت اصلی">✓✓</span>}
    {state==="possible"&&<span className="fj-vr-badge__ticks" aria-label="فقط مذاکره">✓</span>}
   </span>)}
  {badges.some(x=>x.state==="possible")&&<small className="fj-vr-badges__hint">نوع جایگزین فقط با مذاکره و توافق طرفین قابل بررسی است</small>}
 </div>;
}
