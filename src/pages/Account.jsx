import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  changePassword,
} from "../services/authService";

import {
  getBlockedUsers,
  getMyModerationNotices,
  unblockUser,
} from "../services/trustSafetyService";

import { getSmartNotifications } from "../services/smartSearchService";

import "./Account.css";

function Account({
  user = null,
  userProfile = null,
}) {
  const [form, setForm] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notices, setNotices] = useState([]);
  const [smartNotifications, setSmartNotifications] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState("");
  const [blockMessage, setBlockMessage] = useState("");

  const displayName =
    user?.displayName ||
    user?.fullName ||
    "کاربر فضاجو";

  const accountLabel = useMemo(() => {
    if (userProfile?.systemRole === "admin") {
      return "مدیر فضاجو";
    }

    if (
      userProfile?.accountType === "agent" &&
      userProfile?.agencyStatus === "approved"
    ) {
      return "مشاور املاک تأییدشده";
    }

    return "حساب کاربری عادی";
  }, [userProfile]);

  useEffect(() => {
    let alive = true;
    getMyModerationNotices()
      .then((items) => { if (alive) setNotices(items); })
      .catch(() => {});
    getSmartNotifications()
      .then((data) => { if (alive) setSmartNotifications(data?.notifications || []); })
      .catch(() => {});
    getBlockedUsers()
      .then((items) => { if (alive) setBlockedUsers(items); })
      .catch(() => {})
      .finally(() => { if (alive) setBlockedUsersLoading(false); });
    return () => { alive = false; };
  }, []);

  async function handleUnblock(userId) {
    if (!userId || unblockingUserId) return;
    const accepted = window.confirm("مسدودسازی این کاربر برداشته شود؟");
    if (!accepted) return;
    try {
      setUnblockingUserId(userId);
      setBlockMessage("");
      const result = await unblockUser(userId);
      setBlockedUsers((current) => current.filter((item) => item.userId !== userId));
      setBlockMessage(result?.message || "مسدودسازی کاربر برداشته شد.");
      window.dispatchEvent(new CustomEvent("fazajoo:block-status-changed", { detail: { userId } }));
    } catch (e) {
      setBlockMessage(e?.message || "رفع مسدودسازی انجام نشد.");
    } finally {
      setUnblockingUserId("");
    }
  }

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("تکرار رمز عبور جدید با رمز جدید یکسان نیست.");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError("رمز عبور جدید باید با رمز فعلی متفاوت باشد.");
      return;
    }

    try {
      setBusy(true);
      const result = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage(result.message);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (submitError) {
      setError(submitError?.message || "تغییر رمز عبور انجام نشد.");
    } finally {
      setBusy(false);
    }
  };



  return (
    <main className="account-page">
      <section className="account-page__hero">
        <div className="account-page__hero-copy">
          <span className="account-page__eyebrow">حساب و امنیت</span>
          <h1>حساب کاربری من</h1>
          <p>اطلاعات حساب و تنظیمات امنیتی فضاجو را از اینجا مدیریت کنید.</p>
        </div>

        <div className="account-page__identity">
          <span className="account-page__avatar">{displayName.slice(0, 1)}</span>
          <div>
            <strong>{displayName}</strong>
            <span>{accountLabel}</span>
          </div>
        </div>
      </section>





      <div className="account-page__grid">
        <section className="account-card account-card--profile">
          <div className="account-card__title">
            <span className="account-card__icon">👤</span>
            <div>
              <h2>اطلاعات حساب</h2>
              <p>مشخصات اصلی حساب فعلی</p>
            </div>
          </div>

          <dl className="account-info">
            <div><dt>نام نمایشی</dt><dd>{displayName}</dd></div>
            <div><dt>شماره موبایل</dt><dd dir="ltr">{user?.phone || "—"}</dd></div>
            <div><dt>نوع حساب</dt><dd>{accountLabel}</dd></div>
          </dl>

          <div className="account-card__quick-links">
            <Link to="/my-parkings">آگهی‌های من</Link>
            <Link to="/favorites">علاقه‌مندی‌ها</Link>
          </div>
        </section>

        <section className="account-card account-card--security">
          <div className="account-card__title">
            <span className="account-card__icon">🔐</span>
            <div>
              <h2>تغییر رمز عبور</h2>
              <p>پس از تغییر رمز، نشست‌های قدیمی حساب باطل می‌شوند.</p>
            </div>
          </div>

          <div className="account-security-note">
            <strong>محافظت چندلایه فعال است</strong>
            <span>تغییر رمز، نسخه امنیتی حساب را عوض می‌کند؛ بنابراین توکن‌های قبلی دیگر معتبر نخواهند بود.</span>
          </div>

          <form className="account-password-form" onSubmit={submitPassword}>
            <label>
              <span>رمز عبور فعلی</span>
              <input name="currentPassword" type={showPasswords ? "text" : "password"} value={form.currentPassword} onChange={updateField} autoComplete="current-password" required minLength={8} maxLength={72} />
            </label>

            <label>
              <span>رمز عبور جدید</span>
              <input name="newPassword" type={showPasswords ? "text" : "password"} value={form.newPassword} onChange={updateField} autoComplete="new-password" required minLength={8} maxLength={72} />
            </label>

            <label>
              <span>تکرار رمز عبور جدید</span>
              <input name="confirmPassword" type={showPasswords ? "text" : "password"} value={form.confirmPassword} onChange={updateField} autoComplete="new-password" required minLength={8} maxLength={72} />
            </label>

            <label className="account-password-form__show">
              <input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} />
              <span>نمایش رمزها</span>
            </label>

            {error && <div className="account-message account-message--error" role="alert">{error}</div>}
            {message && <div className="account-message account-message--success" role="status">{message}</div>}

            <button type="submit" className="account-password-form__submit" disabled={busy}>
              {busy ? "در حال تغییر رمز..." : "تغییر امن رمز عبور"}
            </button>
          </form>
        </section>
      </div>

      <section className="account-blocked-users">
        <div className="account-blocked-users__title">
          <span>🚫</span>
          <div>
            <h2>کاربران مسدودشده</h2>
            <p>افرادی که خودتان مسدود کرده‌اید را می‌توانید از اینجا رفع مسدودی کنید.</p>
          </div>
        </div>

        {blockMessage && <div className="account-blocked-users__message" role="status">{blockMessage}</div>}

        {blockedUsersLoading ? (
          <div className="account-blocked-users__empty">در حال دریافت فهرست...</div>
        ) : blockedUsers.length === 0 ? (
          <div className="account-blocked-users__empty">در حال حاضر هیچ کاربری را مسدود نکرده‌اید.</div>
        ) : (
          <div className="account-blocked-users__list">
            {blockedUsers.map((item) => (
              <article key={item.userId}>
                <div className="account-blocked-users__identity">
                  <span className="account-blocked-users__avatar">{(item.fullName || "ف").slice(0, 1)}</span>
                  <div>
                    <strong>{item.fullName || "کاربر فضاجو"}</strong>
                    {item.maskedPhone && <small dir="ltr">{item.maskedPhone}</small>}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={Boolean(unblockingUserId)}
                  onClick={() => handleUnblock(item.userId)}
                >
                  {unblockingUserId === item.userId ? "در حال رفع..." : "رفع مسدودی"}
                </button>
              </article>
            ))}
          </div>
        )}
        <p className="account-blocked-users__hint">رفع مسدودی شخصی، محدودیت‌های مدیریتی یا حقوقی فضاجو را لغو نمی‌کند.</p>
      </section>

      <section className="account-notification-summary">
        <div className="account-notification-summary__icon">🔔</div>
        <div className="account-notification-summary__copy">
          <h2>اعلان‌های شما</h2>
          <p>{(() => {
            const count = notices.filter((item) => !item.readAt).length + smartNotifications.filter((item) => !item.isRead).length;
            return count > 0 ? `${count.toLocaleString("fa-IR")} اعلان خوانده‌نشده دارید.` : "همه اعلان‌های شما خوانده شده‌اند.";
          })()}</p>
        </div>
        <Link className="account-notification-summary__link" to="/notifications">مشاهده اعلان‌ها</Link>
      </section>


    </main>
  );
}

export default Account;
