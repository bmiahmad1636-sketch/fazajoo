import {landContractBadges} from "../utils/landContract.js";
import "./VillaRentalBadges.css";
export default function LandRentalBadges({values,wanted=false,compact=false}){
 const badges=landContractBadges(values,wanted);
 if(!badges.length)return null;
 return <div className={`fj-vr-badges${compact?" fj-vr-badges--compact":""}`} dir="rtl" aria-label={wanted?"مدت درخواست زمین":"مدت واگذاری زمین"}>
  {badges.map(({term,label,state})=><span key={term} className={`fj-vr-badge fj-vr-badge--${state==="requested"?"primary":state}`}
   title={state==="possible"?"فقط مذاکره و توافق جداگانه":wanted?"مدت موردنیاز متقاضی":"مدت اصلی قرارداد"}>
   <span className="fj-vr-badge__dot" aria-hidden="true"/><span>{label}</span>
   {!wanted&&<span className="fj-vr-badge__ticks" aria-label={state==="primary"?"مدت اصلی":"قابل مذاکره"}>{state==="primary"?"✓✓":"✓"}</span>}
  </span>)}
  {badges.some(b=>b.state==="possible")&&<small className="fj-vr-badges__hint">مدت دیگر فقط با توافق جداگانه قابل بررسی است.</small>}
 </div>;
}
