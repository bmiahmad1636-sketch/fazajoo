import { useEffect, useState } from "react";
import { getMyModerationNotices, markModerationNoticeRead } from "../services/trustSafetyService";
import "./ModerationNoticeModal.css";

function ModerationNoticeModal({ user }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setNotice(null);
      return () => { active = false; };
    }

    getMyModerationNotices()
      .then((items) => {
        if (!active) return;
        const unread = (items || []).find((item) => !item.readAt && !["listing_disabled", "listing_enabled"].includes(item.type));
        setNotice(unread || null);
      })
      .catch(() => {});

    return () => { active = false; };
  }, [user?.id, user?.uid]);

  const acknowledge = async () => {
    if (!notice || busy) return;
    setBusy(true);
    try {
      await markModerationNoticeRead(notice.id);
      window.dispatchEvent(new Event("fazajoo:notifications-changed"));
      const items = await getMyModerationNotices();
      setNotice((items || []).find((item) => !item.readAt && !["listing_disabled", "listing_enabled"].includes(item.type)) || null);
    } catch {
      // تا وقتی ثبت مشاهده موفق نشود، پیام بسته نمی‌شود.
    } finally {
      setBusy(false);
    }
  };

  if (!user || !notice) return null;

  return (
    <div className="moderation-notice-modal" role="dialog" aria-modal="true" aria-labelledby="moderation-notice-title">
      <div className="moderation-notice-modal__box" dir="rtl">
        <div className="moderation-notice-modal__shield" aria-hidden="true">🛡️</div>
        <h2 id="moderation-notice-title">پیام مهم از فضاجو</h2>
        <p>{notice.message}</p>
        <div className="moderation-notice-modal__note">
          این پیام از طرف بخش اعتماد و ایمنی فضاجو ثبت شده است و در مرکز اعلان‌ها و حساب کاربری شما نیز باقی می‌ماند.
        </div>
        <button type="button" onClick={acknowledge} disabled={busy}>
          {busy ? "در حال ثبت..." : "متوجه شدم"}
        </button>
      </div>
    </div>
  );
}

export default ModerationNoticeModal;
