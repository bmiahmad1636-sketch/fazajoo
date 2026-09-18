import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSmartNotifications } from "../services/smartSearchService";
import { getMyModerationNotices } from "../services/trustSafetyService";

function NotificationBell({ onNavigate }) {
  const [smartUnread, setSmartUnread] = useState(0);
  const [moderationUnread, setModerationUnread] = useState(0);

  const load = useCallback(async () => {
    const [smartResult, moderationResult] = await Promise.allSettled([
      getSmartNotifications(),
      getMyModerationNotices(),
    ]);

    if (smartResult.status === "fulfilled") {
      setSmartUnread(Number(smartResult.value?.unreadCount || 0));
    }

    if (moderationResult.status === "fulfilled") {
      const unread = (moderationResult.value || []).filter((item) => !item.readAt).length;
      setModerationUnread(unread);
    }
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

  const count = useMemo(() => smartUnread + moderationUnread, [smartUnread, moderationUnread]);

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
