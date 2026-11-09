import {gardenRentalBadges} from "../utils/gardenOffer";
import "./VillaRentalBadges.css";
export default function GardenRentalBadges({attributes,compact=false}){
 const badges=gardenRentalBadges(attributes);
 if(!badges.length)return null;
 return <div className={`fj-vr-badges${compact?" fj-vr-badges--compact":""}`} dir="rtl" aria-label="مدت واگذاری باغ">
 {badges.map(({term,label,state})=><span key={term} className={`fj-vr-badge fj-vr-badge--${state}`} title={state==="primary"?"مدت اصلی ثبت‌شده":state==="possible"?"فقط با مذاکره و توافق مالک":"این شیوه تأیید نشده است"}>
  <span className="fj-vr-badge__dot" aria-hidden="true"/><span>{label}</span>
  {state==="primary"&&<span className="fj-vr-badge__ticks" aria-label="مدت اصلی">✓✓</span>}
  {state==="possible"&&<span className="fj-vr-badge__ticks" aria-label="امکان مذاکره">✓</span>}
 </span>)}
 {badges.some(x=>x.state==="possible")&&<small className="fj-vr-badges__hint">شرایط نوع جایگزین هنوز تعیین نشده و فقط قابل مذاکره است</small>}
 </div>;
}
