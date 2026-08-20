import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentSessionUser, subscribeToAuth } from "../services/authService";
import { getUnreadCount, subscribeInboxChanged } from "../services/chatService";
import "./MessageBadge.css";

function MessageBadge({ onNavigate }) {
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeToAuth((nextUser) => setUser(nextUser)), []);

  useEffect(() => {
    let active = true;
    let unsubscribeRealtime = () => {};
    const load = async () => {
      if (!user) { if (active) { setUnreadCount(0); setLoading(false); } return; }
      try { const count = await getUnreadCount(); if (active) setUnreadCount(count); }
      catch (error) { console.error("Unread badge error:", error); if (active) setUnreadCount(0); }
      finally { if (active) setLoading(false); }
    };
    load();
    if (user) unsubscribeRealtime = subscribeInboxChanged(load);
    return () => { active = false; unsubscribeRealtime(); };
  }, [user]);

  if (!user) return null;
  return (
    <Link to="/inbox" className="message-badge" onClick={onNavigate} aria-label={unreadCount > 0 ? `${unreadCount.toLocaleString("fa-IR")} پیام خوانده‌نشده` : "گفتگوهای من"} title="گفتگوهای من">
      <span className="message-badge__icon" aria-hidden="true">💬</span>
      <span className="message-badge__text">گفتگوهای من</span>
      {!loading && unreadCount > 0 && <span className="message-badge__count">{unreadCount > 99 ? "+۹۹" : unreadCount.toLocaleString("fa-IR")}</span>}
    </Link>
  );
}
export default MessageBadge;
