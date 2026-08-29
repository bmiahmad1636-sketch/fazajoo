import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSmartNotifications } from "../services/smartSearchService";

function SmartSearchBadge({ onNavigate }) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await getSmartNotifications();
      setCount(Number(data?.unreadCount || 0));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener("fazajoo:smart-notifications-changed", load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("fazajoo:smart-notifications-changed", load);
    };
  }, [load]);

  return (
    <Link
      to="/find-for-me"
      className="fazajoo-header__smart-bell"
      onClick={onNavigate}
      title="اعلان‌های جستجوی هوشمند"
      aria-label={count ? `${count} اعلان جستجوی هوشمند` : "جستجوی هوشمند"}
    >
      <span aria-hidden="true">🔔</span>
      {count > 0 && <b>{count > 99 ? "99+" : count.toLocaleString("fa-IR")}</b>}
    </Link>
  );
}

export default SmartSearchBadge;
