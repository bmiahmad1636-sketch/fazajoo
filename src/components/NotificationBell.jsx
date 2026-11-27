import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNoticeCenter } from "../services/trustSafetyService";

function NotificationBell({ onNavigate }) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try { const result=await getNoticeCenter("all",1,true); setCount(Number(result.counts.unread || 0)); }
    catch { /* keep last successful count */ }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 45000);
    window.addEventListener("fazajoo:smart-notifications-changed", load);
    window.addEventListener("fazajoo:notifications-changed", load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("fazajoo:smart-notifications-changed", load);
      window.removeEventListener("fazajoo:notifications-changed", load);
    };
  }, [load]);


  return (
    <Link
      to="/notifications"
      className={`fazajoo-header__smart-bell ${count > 0 ? "has-unread" : ""}`}
      onClick={onNavigate}
      title="اعلان‌های فضاجو"
      aria-label={count ? `${count} اعلان خوانده‌نشده` : "اعلان‌های فضاجو"}
    >
      <span aria-hidden="true"><svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></span>
      {count > 0 && <b>{count > 99 ? "99+" : count.toLocaleString("fa-IR")}</b>}
    </Link>
  );
}

export default NotificationBell;
