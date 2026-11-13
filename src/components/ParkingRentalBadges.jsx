import { parkingRentalBadges } from "../utils/parkingRental.js";
import "./VillaRentalBadges.css";
/** Reuses established Fazajoo badges; a negotiable alternative is NOT a confirmed contract. */
export default function ParkingRentalBadges({ values, wanted = false, compact = false, category = "parking" }) {
  const badges = parkingRentalBadges(values, wanted);
  if (!badges.length) return null;
  return <div dir="rtl" className={`fj-vr-badges${compact ? " fj-vr-badges--compact" : ""}`}
    aria-label={wanted ? `مدت درخواست ${category === "warehouse" ? "سوله یا کارگاه" : category === "storage" ? "انبار" : category==="shop" ? "مغازه یا فضای تجاری" : "پارکینگ"}` : `مدت واگذاری ${category === "warehouse" ? "سوله یا کارگاه" : category === "storage" ? "انبار" : category==="shop" ? "مغازه یا فضای تجاری" : "پارکینگ"}`}>
    {badges.map(({ term, label, state }) => <span key={term}
      className={`fj-vr-badge fj-vr-badge--${state === "requested" ? "primary" : state}`}
      title={state === "primary" ? "مدت اصلی ثبت‌شده" : state === "possible" ? "مدت جایگزین، صرفاً با توافق طرفین" : "مدت موردنیاز متقاضی"}>
      <span className="fj-vr-badge__dot" aria-hidden="true" />
      <span>{label}</span>
      {!wanted && <span className="fj-vr-badge__ticks" aria-label={state === "primary" ? "مدت اصلی" : "قابل مذاکره"}>
        {state === "primary" ? "✓✓" : "✓"}
      </span>}
    </span>)}
    {badges.some(b => b.state === "possible") && <small className="fj-vr-badges__hint">
      اجاره با مدت جایگزین، فقط با توافق طرفین قابل بررسی است.
    </small>}
  </div>;
}
