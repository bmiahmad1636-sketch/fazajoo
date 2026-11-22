import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedLogo from "./AnimatedLogo";
import { getFeaturedCurrent } from "../services/featuredShowcaseService";

export default function FeaturedShowcaseHP03() {
  const [placement, setPlacement] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    let timeout;
    const load = async () => {
      try {
        const result = await getFeaturedCurrent();
        if (!mounted) return;
        const current = result.placement || null;
        setPlacement(current);
        // The server owns rotation and expiry; refresh near the next boundary.
        timeout = setTimeout(load, Math.max(1000,Math.min(60000,Number(result.refreshAfterMs) || 60000)));
      } catch {
        if (mounted) {
          setPlacement(null);
          timeout = setTimeout(load, 60000);
        }
      }
    };
    load();
    return () => { mounted = false; clearTimeout(timeout); };
  }, []);
  useEffect(() => {
    if (!placement?.expiresAt) return undefined;
    const time = new Date(placement.expiresAt).getTime() - Date.now();
    if (time <= 0) { setPlacement(null); return undefined; }
    const timer = setTimeout(() => setPlacement(null), time);
    return () => clearTimeout(timer);
  }, [placement?.bookingId, placement?.expiresAt]);

  useEffect(() => setImageFailed(false), [placement?.spaceId, placement?.imageUrl]);

  return (
    <div className="hp01-hero__art-window hp03-showcase-window">
      {placement ? (
        <Link className="hp03-showcase-featured" to={`/parking/${encodeURIComponent(placement.spaceId)}`}
          aria-label={`مشاهده آگهی ویژه ${placement.title}`}>
          {placement.imageUrl && !imageFailed ? <img src={placement.imageUrl} alt="" loading="eager" onError={() => setImageFailed(true)} /> : <div className="hp03-showcase-empty-art">فضاجو</div>}
          <span className="hp03-showcase-label">ویترین ویژه · آگهی تبلیغاتی</span>
          <span className="hp03-showcase-caption"><strong>{placement.title}</strong><small>{placement.city}</small><span>مشاهده آگهی ←</span></span>
        </Link>
      ) : (
        <div className="hp01-hero__architecture" aria-hidden="true">
          <svg viewBox="0 0 560 395" fill="none" preserveAspectRatio="xMidYMid meet">
            <path d="M70 345V125L206 57l129 68v220M118 345V148l88-44 86 44v197M162 345V173h88v172M347 345V91l83-48 81 48v254M372 345V112h114v233" stroke="currentColor" strokeWidth="2" opacity=".7" />
            <path d="M70 125h265M347 91h164M28 346h503M390 145h25v38h-25zM447 145h25v38h-25zM390 211h25v38h-25zM447 211h25v38h-25z" stroke="currentColor" opacity=".5" />
          </svg>
          <p className="hp03-showcase-available">ویترین ویژه فضاجو</p>
        </div>
      )}
      <div className="hp01-hero__art-seal hp03-showcase-seal"><AnimatedLogo size={82} compact /></div>
    </div>
  );
}
