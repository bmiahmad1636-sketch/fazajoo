import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentSessionUser, subscribeToAuth } from "../services/authService";
import { getUnreadCount, subscribeInboxChanged } from "../services/chatService";
import "./MessageBadge.css";

function MessageBadge({ onNavigate, isApprovedAgent = false }) {
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeToAuth((nextUser) => setUser(nextUser)), []);

  useEffect(() => {
    let active = true;
    let unsubscribeRealtime = () => {};
    const load = async () => {
      if (!user) { if (active) { setUnreadCount(0); setLoading(false); } return; }
      try { const count = await getUnreadCount(isApprovedAgent ? "agency" : "personal"); if (active) setUnreadCount(count); }
      catch (error) { console.error("Unread badge error:", error); if (active) setUnreadCount(0); }
      finally { if (active) setLoading(false); }
    };
    load();
    if (user) unsubscribeRealtime = subscribeInboxChanged(load);
    // Refresh immediately when this tab marks messages as read, even if Socket.IO misses an event.
    window.addEventListener("fazajoo:inbox-changed", load);
    // Reconcile stale counts when returning to the tab.
    const onVisibilityChange = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      unsubscribeRealtime();
      window.removeEventListener("fazajoo:inbox-changed", load);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, isApprovedAgent]);

  if (!user) return null;

  const destination = isApprovedAgent ? "/agency/inbox" : "/inbox";
  const label = isApprovedAgent ? "گفتگوهای کاری" : "گفتگوهای من";

  return (
    <Link
      to={destination}
      className="message-badge"
      onClick={onNavigate}
      aria-label={
        unreadCount > 0
          ? `${unreadCount.toLocaleString("fa-IR")} پیام خوانده‌نشده`
          : label
      }
      title={label}
    >
      <span className="message-badge__icon" aria-hidden="true">💬</span>
      <span className="message-badge__text">{label}</span>
      {!loading && unreadCount > 0 && (
        <span className="message-badge__count">
          {unreadCount > 99 ? "+۹۹" : unreadCount.toLocaleString("fa-IR")}
        </span>
      )}
    </Link>
  );
}
export default MessageBadge;
