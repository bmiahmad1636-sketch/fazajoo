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
  getNoticeCenter,
  unblockUser,
} from "../services/trustSafetyService";


import "./Account.css";


const ACCOUNT_ICONS = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11zM9 12l2 2 4-4",
  block: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 6l12 12",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 20h4",
  list: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
  heart: "M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 0 9 8 15 8-6 12-11 8-15z",
  chat: "M20 11a8 8 0 0 1-8 8 10 10 0 0 1-4-1l-5 2 2-5a8 8 0 1 1 15-4zM8 11h8",
  wallet: "M20 7H4V4h14M4 7v13h16V7M20 11h-6v5h6M16 13.5h1",
  arrow: "M15 5l-7 7 7 7",
  logout: "M11 4H5v16h6M11 12h10M17 8l4 4-4 4",
};
function AccountIcon({ name }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={ACCOUNT_ICONS[name]} /></svg>;
}

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
  const [unread, setUnread] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(true);
  const [blockedError, setBlockedError] = useState(false);
  const [noticeStatus, setNoticeStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  const [panel, setPanel] = useState("overview");
  const [unblockingUserId, setUnblockingUserId] = useState("");
  const [blockMessage, setBlockMessage] = useState("");
  const [blockMessageError, setBlockMessageError] = useState(false);

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
    setNoticeStatus("loading");
    setBlockedUsersLoading(true);
    setBlockedError(false);
    getNoticeCenter("all",1,true)
      .then((data) => {
        if (!alive) return;
        setUnread(Number(data.counts.unread || 0));
        setNoticeStatus("ready");
      })
      .catch(() => { if (alive) setNoticeStatus("error"); });
    getBlockedUsers()
      .then((items) => { if (alive) setBlockedUsers(items); })
      .catch(() => { if (alive) setBlockedError(true); })
      .finally(() => { if (alive) setBlockedUsersLoading(false); });
    return () => { alive = false; };
  }, [retry]);

  async function handleUnblock(userId) {
    if (!userId || unblockingUserId) return;
    const accepted = window.confirm("مسدودسازی این کاربر برداشته شود؟");
    if (!accepted) return;
    try {
      setUnblockingUserId(userId);
      setBlockMessage("");
      setBlockMessageError(false);
      const result = await unblockUser(userId);
      setBlockedUsers((current) => current.filter((item) => item.userId !== userId));
      setBlockMessage(result?.message || "مسدودسازی کاربر برداشته شد.");
      window.dispatchEvent(new CustomEvent("fazajoo:block-status-changed", { detail: { userId } }));
    } catch (e) {
      setBlockMessageError(true);
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



  const noticeText = noticeStatus === "loading" ? "در حال دریافت اعلان‌ها" : noticeStatus === "error" ? "وضعیت اعلان‌ها در دسترس نیست" : unread ? `${unread.toLocaleString("fa-IR")} اعلان خوانده‌نشده` : "اعلان خوانده‌نشده ندارید";
  const blockText = blockedUsersLoading ? "در حال دریافت فهرست" : blockedError ? "دریافت فهرست انجام نشد" : `${blockedUsers.length.toLocaleString("fa-IR")} کاربر مسدودشده`;
  const selectPanel = (next) => {
    setShowPasswords(false);
    setPanel(next);
  };
  const navigation = [
    { id: "overview", label: "نمای کلی", icon: "grid" },
    { id: "security", label: "امنیت حساب", icon: "shield" },
    { id: "blocked", label: "کاربران مسدودشده", icon: "block" },
  ];
  const shortcuts = [
    { to: "/my-parkings", label: "آگهی‌های من", description: "مدیریت عرضه و تقاضا", icon: "list" },
    { to: "/favorites", label: "علاقه‌مندی‌ها", description: "فضاهای نشان‌شده", icon: "heart" },
    { to: "/inbox", label: "گفتگوهای من", description: "پیام‌ها و ارتباطات", icon: "chat" },
    { to: "/wallet", label: "کیف پول من", description: "موجودی و گردش حساب", icon: "wallet" },
  ];

  return (
    <main className="fz-account" dir="rtl">
      <header className="fz-account__heading">
        <div><span className="fz-account__kicker">فضاجو / پنل شخصی</span><h1>حساب کاربری من</h1></div>
        <Link className="fz-account__back" to="/">بازگشت به خانه <AccountIcon name="arrow" /></Link>
      </header>
      <div className="fz-account__workspace">
        <aside className="fz-account__rail">
          <section className="fz-account__profile" aria-label="اطلاعات حساب">
            <div className="fz-account__identity">
              <span className="fz-account__avatar">{displayName.slice(0, 1)}</span>
              <div><h2>{displayName}</h2><p>{accountLabel}</p></div>
            </div>
            <dl className="fz-account__info">
              <div><dt>شماره موبایل</dt><dd dir="ltr">{user?.phone || "—"}</dd></div>
            </dl>
          </section>
          <nav className="fz-account__nav" aria-label="بخش‌های حساب کاربری">
            <span className="fz-account__nav-label">مدیریت حساب</span>
            {navigation.map((item) => (
              <button key={item.id} type="button" aria-pressed={panel === item.id} onClick={() => selectPanel(item.id)}>
                <AccountIcon name={item.icon} /><span>{item.label}</span><AccountIcon name="arrow" />
              </button>
            ))}
            <Link to="/notifications"><AccountIcon name="bell" /><span>اعلان‌ها</span><AccountIcon name="arrow" /></Link>
          </nav>
        </aside>
        <div className="fz-account__main">
          {panel === "overview" && <>
            <section className="fz-account__surface" aria-labelledby="ac01-access">
              <div className="fz-account__section-head"><div><span className="fz-account__kicker">فضای شخصی شما</span><h2 id="ac01-access">دسترسی سریع</h2></div><span className="fz-account__section-note">همه امکانات در یک نگاه</span></div>
              <div className="fz-account__shortcuts">
                {shortcuts.map((item) => <Link to={item.to} key={item.to} className="fz-account__shortcut"><span className="fz-account__glyph"><AccountIcon name={item.icon} /></span><span className="fz-account__tile-copy"><strong>{item.label}</strong><small>{item.description}</small></span><AccountIcon name="arrow" /></Link>)}
              </div>
            </section>
            <section className="fz-account__surface" aria-labelledby="ac01-manage">
              <div className="fz-account__section-head"><div><span className="fz-account__kicker">کنترل حساب</span><h2 id="ac01-manage">امنیت و ارتباطات</h2></div></div>
              <div className="fz-account__management">
                <button type="button" onClick={() => selectPanel("security")} className="fz-account__manage-row"><span className="fz-account__glyph"><AccountIcon name="shield" /></span><span className="fz-account__tile-copy"><strong>امنیت حساب</strong><small>تغییر رمز عبور و راهنمای خروج از نشست‌ها</small></span><AccountIcon name="arrow" /></button>
                <button type="button" onClick={() => selectPanel("blocked")} className="fz-account__manage-row"><span className="fz-account__glyph"><AccountIcon name="block" /></span><span className="fz-account__tile-copy"><strong>کاربران مسدودشده</strong><small aria-live="polite">{blockText}</small></span><AccountIcon name="arrow" /></button>
                <Link to="/notifications" className="fz-account__manage-row"><span className="fz-account__glyph fz-account__glyph--warm"><AccountIcon name="bell" /></span><span className="fz-account__tile-copy"><strong>اعلان‌های شما</strong><small aria-live="polite">{noticeText}</small></span><AccountIcon name="arrow" /></Link>
              </div>
              {noticeStatus === "error" && <button type="button" className="fz-account__retry" disabled={Boolean(unblockingUserId) || blockedUsersLoading} onClick={() => setRetry((n) => n + 1)}>تلاش مجدد برای دریافت اعلان‌ها</button>}
            </section>
          </>}
          <section className="fz-account__surface fz-account__security" hidden={panel !== "security"} aria-labelledby="ac01-security">
            <div className="fz-account__section-head"><div><span className="fz-account__kicker">حریم خصوصی</span><h2 id="ac01-security">امنیت حساب</h2></div><span className="fz-account__glyph"><AccountIcon name="shield" /></span></div>
            <div className="fz-account__security-note"><AccountIcon name="shield" /><div><strong>تغییر رمز عبور</strong><p>پس از تغییر رمز، نشست‌های قدیمی حساب باطل می‌شوند.</p></div></div>
            <form className="fz-account__form" onSubmit={submitPassword}>
              <label className="fz-account__current"><span>رمز عبور فعلی</span><input name="currentPassword" type={showPasswords ? "text" : "password"} value={form.currentPassword} onChange={updateField} autoComplete="current-password" required minLength={8} maxLength={72} /></label>
              <label><span>رمز عبور جدید</span><input name="newPassword" type={showPasswords ? "text" : "password"} value={form.newPassword} onChange={updateField} autoComplete="new-password" required minLength={8} maxLength={72} /></label>
              <label><span>تکرار رمز عبور جدید</span><input name="confirmPassword" type={showPasswords ? "text" : "password"} value={form.confirmPassword} onChange={updateField} autoComplete="new-password" required minLength={8} maxLength={72} /></label>
              {error && <div className="fz-account__message fz-account__message--error" role="alert">{error}</div>}
              {message && <div className="fz-account__message" role="status">{message}</div>}
              <div className="fz-account__form-footer"><label className="fz-account__show"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /><span>نمایش رمزها</span></label><button type="submit" disabled={busy}>{busy ? "در حال تغییر رمز..." : "تغییر امن رمز عبور"}</button></div>
            </form>
            <div className="fz-account__session-note"><AccountIcon name="logout" /><div><strong>مدیریت نشست‌ها</strong><p>از دکمه «خروج» در نوار بالای سایت می‌توانید از همین مرورگر یا همه دستگاه‌ها خارج شوید.</p></div></div>
          </section>
          <section className="fz-account__surface" hidden={panel !== "blocked"} aria-labelledby="ac01-blocked">
            <div className="fz-account__section-head"><div><span className="fz-account__kicker">حریم ارتباطات</span><h2 id="ac01-blocked">کاربران مسدودشده</h2></div><span className="fz-account__section-note">{blockText}</span></div>
            <p className="fz-account__explain">افرادی که خودتان مسدود کرده‌اید را می‌توانید از اینجا رفع مسدودی کنید.</p>
            {blockMessage && <div className={`fz-account__message${blockMessageError ? " fz-account__message--error" : ""}`} role={blockMessageError ? "alert" : "status"}>{blockMessage}</div>}
            {blockedUsersLoading ? <div className="fz-account__empty" role="status">در حال دریافت فهرست...</div> : blockedError ? <div className="fz-account__empty" role="alert">دریافت فهرست انجام نشد. <button type="button" className="fz-account__retry" disabled={Boolean(unblockingUserId) || blockedUsersLoading} onClick={() => setRetry((n) => n + 1)}>تلاش مجدد</button></div> : blockedUsers.length === 0 ? <div className="fz-account__empty"><AccountIcon name="block" /><strong>فهرست شما خالی است</strong><span>در حال حاضر هیچ کاربری را مسدود نکرده‌اید.</span></div> : <div className="fz-account__blocked-list">{blockedUsers.map((item) => <article key={item.userId}><span className="fz-account__blocked-avatar">{(item.fullName || "ف").slice(0, 1)}</span><div><strong>{item.fullName || "کاربر فضاجو"}</strong>{item.maskedPhone && <small dir="ltr">{item.maskedPhone}</small>}</div><button type="button" disabled={Boolean(unblockingUserId)} onClick={() => handleUnblock(item.userId)}>{unblockingUserId === item.userId ? "در حال رفع..." : "رفع مسدودی"}</button></article>)}</div>}
            <p className="fz-account__hint">رفع مسدودی شخصی، محدودیت‌های مدیریتی یا حقوقی فضاجو را لغو نمی‌کند.</p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Account;
