import { residentialRentalBadges } from "../utils/residentialOffer";
import "./VillaRentalBadges.css";

/** One active contract, optionally one negotiable alternative. No artificial second price. */
export default function ResidentialRentalBadges({attributes, compact = false}) {
  const badges = residentialRentalBadges(attributes);
  if (!badges.length) return null;
  return <div dir="rtl" className={`fj-vr-badges${compact ? " fj-vr-badges--compact" : ""}`} aria-label="مدت واگذاری مسکونی">
    {badges.map(({term,label,state}) => <span key={term} className={`fj-vr-badge fj-vr-badge--${state}`}
      title={state === "primary" ? "مدت اصلی آگهی" : state === "possible" ? "صرفاً قابل بررسی و توافق" : "برای این مدت موافقتی ثبت نشده است"}>
      <span className="fj-vr-badge__dot" aria-hidden="true" />
      <span>{label}</span>
      {state === "primary" && <span className="fj-vr-badge__ticks" aria-label="مدت اصلی">✓✓</span>}
      {state === "possible" && <span className="fj-vr-badge__ticks" aria-label="فقط مذاکره">✓</span>}
    </span>)}
    {badges.some(b=>b.state === "possible") && <small className="fj-vr-badges__hint">تبدیل مدت اجاره فقط با توافق طرفین قابل بررسی است</small>}
  </div>;
}
