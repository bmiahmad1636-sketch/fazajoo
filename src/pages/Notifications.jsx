import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getSmartNotifications,
  markAllSmartNotificationsRead,
  markSmartNotificationRead,
} from "../services/smartSearchService";
import {
  getMyModerationNotices,
  markModerationNoticeRead,
} from "../services/trustSafetyService";
import "./Notifications.css";

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function Notifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [smartItems, setSmartItems] = useState([]);
  const [notices, setNotices] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [smart, moderation] = await Promise.all([
        getSmartNotifications(),
        getMyModerationNotices(),
      ]);
      setSmartItems(smart?.notifications || []);
      setNotices(moderation || []);
    } catch (e) {
      setError(e?.message || "دریافت اعلان‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const moderation = notices.map((item) => ({
      id: `moderation-${item.id}`,
      rawId: item.id,
      type: "moderation",
      unread: !item.readAt,
      createdAt: item.createdAt,
      title: item.type === "warning"
        ? "اخطار مدیریت فضاجو"
        : item.type === "listing_disabled"
          ? "توقف نمایش عمومی آگهی"
          : item.type === "listing_enabled"
            ? "فعال‌شدن دوباره آگهی"
            : "پیام اعتماد و ایمنی",
      text: item.message,
      href: ["listing_disabled", "listing_enabled"].includes(item.type) ? "/my-parkings" : "/notifications",
      cta: ["listing_disabled", "listing_enabled"].includes(item.type) ? "مشاهده آگهی‌های من" : "مشاهده اعلان",
    }));

    const smart = smartItems.map((item) => ({
      id: `smart-${item.id}`,
      rawId: item.id,
      type: "smart",
      unread: !item.isRead,
      createdAt: item.createdAt,
      title: "فضاجو یک گزینه مناسب پیدا کرد",
      text: item.space?.title
        ? `${item.space.title} — تطابق ${Number(item.matchScore || 0).toLocaleString("fa-IR")}٪`
        : `یک نتیجه جدید با تطابق ${Number(item.matchScore || 0).toLocaleString("fa-IR")}٪ پیدا شد.`,
      href: item.space?.id ? `/parking/${item.space.id}` : "/find-for-me",
      cta: "مشاهده نتیجه",
    }));

    return [...moderation, ...smart].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [notices, smartItems]);

  const unreadCount = items.filter((item) => item.unread).length;

  const markOneRead = async (item) => {
    try {
      if (!item.unread) return;
      if (item.type === "moderation") {
        await markModerationNoticeRead(item.rawId);
      } else {
        await markSmartNotificationRead(item.rawId);
      }
      await load();
    } catch (e) {
      setError(e?.message || "ثبت مشاهده اعلان انجام نشد.");
    }
  };

  const markAllRead = async () => {
    try {
      const unreadNotices = notices.filter((item) => !item.readAt);
      await Promise.all([
        markAllSmartNotificationsRead(),
        ...unreadNotices.map((item) => markModerationNoticeRead(item.id)),
      ]);
      window.dispatchEvent(new Event("fazajoo:notifications-changed"));
      await load();
    } catch (e) {
      setError(e?.message || "ثبت مشاهده اعلان‌ها انجام نشد.");
    }
  };

  return (
    <main className="fazajoo-notifications" dir="rtl">
      <section className="fazajoo-notifications__card">
        <div className="fazajoo-notifications__head">
          <div>
            <h1>اعلان‌های فضاجو</h1>
            <p>پیام‌های مهم، نتایج «خبرم کن» و اعلان‌های حساب شما در اینجا جمع می‌شوند.</p>
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead}>خواندن همه</button>
          )}
        </div>

        {error && <div className="fazajoo-notifications__error">{error}</div>}
        {loading ? (
          <div className="fazajoo-notifications__empty">در حال دریافت اعلان‌ها...</div>
        ) : items.length === 0 ? (
          <div className="fazajoo-notifications__empty">فعلاً اعلان جدیدی نداری.</div>
        ) : (
          <div className="fazajoo-notifications__list">
            {items.map((item) => (
              <article
                key={item.id}
                className={`fazajoo-notification ${item.unread ? "fazajoo-notification--unread" : ""}`}
              >
                <div className="fazajoo-notification__icon" aria-hidden="true">
                  {item.type === "moderation" ? "🛡️" : "✨"}
                </div>
                <div className="fazajoo-notification__body">
                  <div className="fazajoo-notification__title-row">
                    <h2>{item.title}</h2>
                    {item.unread && <span>جدید</span>}
                  </div>
                  <p>{item.text}</p>
                  <small>{formatDate(item.createdAt)}</small>
                  <div className="fazajoo-notification__actions">
                    <Link to={item.href} onClick={() => markOneRead(item)}>{item.cta}</Link>
                    {item.unread && (
                      <button type="button" onClick={() => markOneRead(item)}>خوانده شد</button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Notifications;
