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
      <span aria-hidden="true">🔔</span>
      {count > 0 && <b>{count > 99 ? "99+" : count.toLocaleString("fa-IR")}</b>}
    </Link>
  );
}

export default NotificationBell;
