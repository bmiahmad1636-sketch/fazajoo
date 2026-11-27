import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  applyAdminModerationAction,
  getAdminReportChat,
  getAdminReports,
  updateAdminReport,
} from "../services/trustSafetyService";
import { showInSiteAlert } from "../utils/inSiteDialog";
import { REPORT_LIMIT, REPORT_STATUSES, REPORT_TARGETS, filterReports, reportPage, countReportStatuses } from "../utils/moderationWorkspaceADM03";
import "./AdminModeration.css";

const reasonLabels = {
  fake: "آگهی یا هویت جعلی",
  wrong_info: "اطلاعات نادرست",
  harassment: "مزاحمت یا رفتار نامناسب",
  suspected_fraud: "کلاهبرداری احتمالی",
  spam: "محتوای تکراری",
  inappropriate: "محتوای نامناسب",
  other: "سایر موارد",
};
const statusLabels = { new: "جدید", reviewing: "در حال بررسی", resolved: "رسیدگی‌شده", dismissed: "ردشده" };
const targetLabels = { listing: "آگهی", user: "کاربر", chat: "گفتگو" };
const actionLabels = {
  warning: "اخطار به کاربر",
  chat_restrict: "محدودکردن این گفتگو",
  chat_restore: "رفع محدودیت این گفتگو",
  pair_block: "قطع ارتباط این دو کاربر",
  pair_unblock: "رفع قطع ارتباط دو کاربر",
  user_suspend: "تعلیق حساب کاربر",
  user_restore: "فعال‌سازی دوباره حساب",
  listing_disable: "غیرفعال‌کردن آگهی",
  listing_enable: "فعال‌کردن دوباره آگهی",
  video_disable: "توقف نمایش ویدئوی آگهی",
  video_enable: "فعال‌کردن دوباره ویدئو",
  refer_legal: "ارجاع داخلی به امور حقوقی",
};


function actionHelp(action) {
  const help = {
    warning: "یادداشت شما فقط برای مدیران ذخیره می‌شود؛ کاربر یک متن استاندارد و روشن از فضاجو می‌بیند.",
    chat_restrict: "فقط همین گفتگوی گزارش‌شده محدود می‌شود. گفتگو یا آگهی دیگر بین این دو کاربر تحت تأثیر این اقدام قرار نمی‌گیرد.",
    chat_restore: "فقط محدودیت مدیریتی همین گفتگو برداشته می‌شود.",
    pair_block: "ارتباط این دو حساب در همه گفتگوها و شروع گفتگوهای جدید محدود می‌شود.",
    pair_unblock: "محدودیت سراسری ارتباط بین این دو حساب برداشته می‌شود.",
    user_suspend: "کل حساب کاربر تعلیق می‌شود و نشست‌های قبلی او نیز باطل می‌شوند.",
    user_restore: "حساب کاربر دوباره فعال می‌شود.",
    listing_disable: "فقط آگهی گزارش‌شده غیرفعال می‌شود.",
    listing_enable: "آگهی گزارش‌شده دوباره فعال می‌شود.",
    video_disable: "فقط نمایش ویدئوی آگهی متوقف می‌شود و خود آگهی و تصاویر باقی می‌مانند. فایل برای سابقه و امور حقوقی حذف نمی‌شود.",
    video_enable: "نمایش ویدئوی آگهی دوباره فعال می‌شود.",
    refer_legal: "فقط ارجاع داخلی ثبت می‌شود و پرونده قضایی به‌صورت خودکار ساخته نمی‌شود.",
  };
  return help[action] || "";
}

function faDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function availableActions(report) {
  const items = [];
  if (report.reported_user_id) {
    items.push(["warning", "اخطار به کاربر"]);
    items.push(report.reported_is_active === false ? ["user_restore", "فعال‌سازی دوباره حساب"] : ["user_suspend", "تعلیق حساب کاربر"]);
  }
  if (report.target_type === "chat") {
    if (report.chat_exists) {
      items.push(report.chat_moderation_mode === "blocked" ? ["chat_restore", "رفع محدودیت این گفتگو"] : ["chat_restrict", "محدودکردن این گفتگو"]);
    }
    if (report.reported_user_id) {
      items.push(["pair_block", "قطع ارتباط این دو کاربر"]);
      items.push(["pair_unblock", "رفع قطع ارتباط دو کاربر"]);
    }
  }
  if (report.target_type === "listing") {
    items.push(["listing_disable", "غیرفعال‌کردن آگهی"]);
    items.push(["listing_enable", "فعال‌کردن دوباره آگهی"]);
    items.push(["video_disable", "توقف نمایش ویدئوی آگهی"]);
    items.push(["video_enable", "فعال‌کردن دوباره ویدئو"]);
  }
  items.push(["refer_legal", "ارجاع داخلی به امور حقوقی"]);
  return items;
}

export default function AdminModeration() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState("");
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const lock = useRef(false);
  const [chatPreview, setChatPreview] = useState(null);
  const [chatPreviewLoading, setChatPreviewLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [historyVisible, setHistoryVisible] = useState({});

  function visibleHistoryCount(reportId) {
    return historyVisible[reportId] || 20;
  }

  function showMoreHistory(reportId) {
    setHistoryVisible((prev) => ({
      ...prev,
      [reportId]: (prev[reportId] || 20) + 20,
    }));
  }

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const data = await getAdminReports(filter);
      if (id !== requestId.current) return false;
      setReports(data);
      return true;
    } catch (e) {
      if (id === requestId.current) {
        setReports([]);
        setError(e.message || "دریافت گزارش‌ها ناموفق بود.");
      }
      return false;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    return () => { requestId.current++; };
  }, [load]);

  const counts = useMemo(() => countReportStatuses(reports), [reports]);
  const filtered = useMemo(() => filterReports(reports, target, search, reasonLabels), [reports, target, search]);
  const listing = reportPage(filtered, page);
  const busy = Boolean(working || chatPreviewLoading || loading);
  const fa = n => n.toLocaleString("fa-IR");

  async function change(r, status) {
    if (lock.current || loading) return;
    lock.current = true;
    try {
      setWorking(r.id);
      await updateAdminReport(r.id, status, r.resolution_note || "");
      if (!await load()) showInSiteAlert("وضعیت گزارش ثبت شد، اما تازه‌سازی فهرست ناموفق بود. عملیات را تکرار نکنید و ابتدا فهرست را تازه کنید.");
    } catch (e) {
      showInSiteAlert(e.message);
    } finally {
      lock.current = false;
      setWorking("");
    }
  }

  async function openChatPreview(report) {
    if (lock.current || loading) return;
    lock.current = true;
    try {
      setChatPreviewLoading(true);
      const data = await getAdminReportChat(report.id);
      setChatPreview({ report, ...data });
    } catch (e) {
      showInSiteAlert(e.message);
    } finally {
      lock.current = false;
      setChatPreviewLoading(false);
    }
  }

  function openActionModal(report) {
    if (lock.current || loading) return;
    const first = availableActions(report)[0]?.[0] || "refer_legal";
    setSelectedAction(first);
    setActionNote("");
    setActionModal(report);
  }

  async function submitAction(event) {
    event.preventDefault();
    if (!actionModal || lock.current || loading || actionNote.trim().length < 3) return;
    lock.current = true;
    try {
      setWorking(actionModal.id);
      const result = await applyAdminModerationAction(actionModal.id, selectedAction, actionNote);
      setActionModal(null);
      setActionNote("");
      const refreshed = await load();
      showInSiteAlert(refreshed ? (result?.message || "اقدام مدیریتی ثبت و اجرا شد.") : "اقدام ثبت شد، اما تازه‌سازی فهرست ناموفق بود. عملیات را تکرار نکنید و ابتدا فهرست را تازه کنید.");
    } catch (e) {
      showInSiteAlert(e.message);
    } finally {
      lock.current = false;
      setWorking("");
    }
  }

  return (
    <main className="moderation adm03">
      <header className="ad3-header">
        <div className="ad3-width ad3-head">
          <div><small>فضاجو / اعتماد و ایمنی</small><h1>مرکز رسیدگی به گزارش‌ها</h1><p>بررسی مستندات، تصمیم متناسب و ثبت سابقه رسیدگی</p></div>
          <Link to="/admin">بازگشت به مدیریت</Link>
        </div>
      </header>
      <section className="ad3-width ad3-body">
        <div className="moderation__stats" aria-label="آمار فهرست دریافت‌شده">
          {[["نمایش فعلی", reports.length, "all"], ["جدید",counts.new,"new"], ["در حال بررسی",counts.reviewing,"reviewing"], ["رسیدگی‌شده",counts.resolved,"resolved"], ["ردشده",counts.dismissed,"dismissed"]].map(([label,n,k]) => (
            <article key={k} data-kind={k}><span>{label}</span><strong>{loading || error || (filter && k !== "all" && k !== filter) ? "—" : fa(n)}</strong><small>در فهرست دریافتی</small></article>
          ))}
        </div>
        <div className="ad3-workspace">
          <aside className="ad3-sidebar">
            <div className="ad3-panel">
              <small className="ad3-kicker">صف رسیدگی</small><h2>وضعیت گزارش‌ها</h2>
              <nav className="moderation__filters" aria-label="فیلتر وضعیت گزارش">
                {REPORT_STATUSES.map(([v,l]) => <button type="button" aria-pressed={filter === v} className={filter === v ? "active" : ""} disabled={busy} onClick={() => {setFilter(v);setPage(1);}} key={v}>{l}<span aria-hidden="true">‹</span></button>)}
              </nav>
              <p className="ad3-muted">فیلتر وضعیت از سرور دریافت می‌شود. هر فهرست حداکثر {fa(REPORT_LIMIT)} گزارش دارد.</p>
            </div>
            <div className="ad3-panel ad3-guide"><h2>راهنمای رسیدگی</h2><p>ابتدا گزارش و مستندات را بررسی کنید؛ سپس وضعیت پرونده یا اقدام مدیریتی متناسب را انتخاب کنید.</p><Link to="/admin/legal">مرکز امور حقوقی</Link></div>
          </aside>
          <section className="ad3-main">
            <div className="ad3-panel ad3-toolbar">
              <div className="ad3-section-head"><div><small className="ad3-kicker">میز کار نظارت</small><h2>{REPORT_STATUSES.find(([v]) => v === filter)?.[1]}</h2></div><button type="button" className="ad3-secondary" disabled={busy} onClick={load}>تازه‌سازی</button></div>
              <div className="ad3-search"><label htmlFor="ad3-search">جستجو در گزارش‌های دریافت‌شده<input id="ad3-search" value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} placeholder="نام، شماره گزارش‌دهنده، علت یا توضیحات" /></label><label htmlFor="ad3-target">موضوع گزارش<select id="ad3-target" value={target} onChange={e => {setTarget(e.target.value);setPage(1);}}>{REPORT_TARGETS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label></div>
              <div className="ad3-results"><span>{loading || error ? "—" : `${fa(filtered.length)} نتیجه از ${fa(reports.length)} گزارش دریافت‌شده`}</span>{(search || target) && <button type="button" className="ad3-text-button" onClick={() => {setSearch("");setTarget("");setPage(1);}}>پاک کردن جستجو و موضوع</button>}</div>
              {!loading && !error && reports.length >= REPORT_LIMIT && <p className="ad3-limit">به سقف دریافت سرور رسیده‌اید؛ این فهرست لزوماً شامل همه گزارش‌ها نیست.</p>}
            </div>
        {loading ? (
          <div className="moderation__empty" role="status">در حال دریافت گزارش‌ها...</div>
        ) : error ? (
          <div className="moderation__empty ad3-error" role="alert"><strong>دریافت اطلاعات ناموفق بود</strong><p>{error}</p><button type="button" className="ad3-secondary" disabled={busy} onClick={load}>تلاش مجدد</button></div>
        ) : filtered.length === 0 ? (
          <div className="moderation__empty">{reports.length ? "گزارشی مطابق جستجو و فیلتر موضوع پیدا نشد." : "گزارشی در این بخش وجود ندارد."}</div>
        ) : (
          <div className="moderation__list">
            {listing.rows.map((r) => (
              <article className="report-card" key={r.id}>
                <div className="report-card__top">
                  <div><span className={`status status--${r.status}`}>{statusLabels[r.status] || r.status}</span><strong>{reasonLabels[r.reason] || r.reason}</strong></div>
                  <time>{faDate(r.created_at)}</time>
                </div>
                <div className="report-card__meta">
                  <span>هدف: {targetLabels[r.target_type] || r.target_type}</span>
                  <span>گزارش‌دهنده: {r.reporter_name || "کاربر فضاجو"}</span>
                  <span>کاربر گزارش‌شده: {r.reported_name || "—"}</span>
                </div>
                {r.details && <p className="ad3-detail"><strong>شرح گزارش</strong>{r.details}</p>}
                {r.resolution_note && <p className="ad3-detail"><strong>یادداشت رسیدگی</strong>{r.resolution_note}</p>}

                {Array.isArray(r.actions) && r.actions.length > 0 && (
                  <details className="report-card__history">
                    <summary>سابقه اقدام مدیریتی ({fa(r.actions.length)})</summary>
                    {r.actions.slice(0, visibleHistoryCount(r.id)).map((a) => (
                      <div key={a.id}>
                        <span>{actionLabels[a.actionType] || a.actionType}</span>
                        <small>{a.adminName || "مدیر فضاجو"} • {faDate(a.createdAt)}</small>
                        {a.note && <em>{a.note}</em>}
                      </div>
                    ))}
                    {r.actions.length > visibleHistoryCount(r.id) && (
                      <button
                        type="button"
                        className="report-card__history-more"
                        onClick={() => showMoreHistory(r.id)}
                      >
                        نمایش بیشتر ({Math.min(20, r.actions.length - visibleHistoryCount(r.id)).toLocaleString("fa-IR")} مورد بعدی)
                      </button>
                    )}
                  </details>
                )}

                <div className="report-card__actions">
                  <button disabled={busy} onClick={() => change(r, "reviewing")}>شروع بررسی</button>
                  <button className="ok" disabled={busy} onClick={() => change(r, "resolved")}>رسیدگی شد</button>
                  <button className="muted" disabled={busy} onClick={() => change(r, "dismissed")}>رد گزارش</button>
                  <button className="action" disabled={busy} onClick={() => openActionModal(r)}>اقدام مدیریتی</button>
                  {r.target_type === "listing" && <Link to={`/parking/${r.target_id}`}>مشاهده آگهی</Link>}
                  {r.target_type === "chat" && (
                    <button className="dark" disabled={busy} onClick={() => openChatPreview(r)}>
                      {chatPreviewLoading ? "در حال دریافت..." : "مشاهده امن گفتگو"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && listing.pages > 1 && <nav className="ad3-pager" aria-label="صفحه‌بندی گزارش‌ها"><button type="button" disabled={busy || listing.page === 1} onClick={() => setPage(listing.page-1)}>صفحه قبل</button><span>صفحه {fa(listing.page)} از {fa(listing.pages)}</span><button type="button" disabled={busy || listing.page === listing.pages} onClick={() => setPage(listing.page+1)}>صفحه بعد</button></nav>}
          </section>
        </div>
      </section>

      {chatPreview && (
        <div className="moderation-chat-modal" role="dialog" aria-modal="true" aria-labelledby="ad3-chat-title">
          <div className="moderation-chat-modal__backdrop" onClick={() => setChatPreview(null)} />
          <section className="moderation-chat-modal__card">
            <header>
              <div><span>نمایش امن مدیر</span><h2 id="ad3-chat-title">گفتگوی گزارش‌شده</h2></div>
              <button aria-label="بستن گفتگو" onClick={() => setChatPreview(null)}>×</button>
            </header>
            {!chatPreview.exists ? (
              <div className="moderation-chat-modal__empty">رکورد این گفتگو دیگر وجود ندارد.</div>
            ) : (
              <>
                <div className="moderation-chat-modal__meta">
                  <strong>{chatPreview.chat?.spaceTitle || "آگهی فضاجو"}</strong>
                  <span>{chatPreview.chat?.ownerName || "آگهی‌دهنده"} ↔ {chatPreview.chat?.requesterName || "متقاضی"}</span>
                </div>
                <p className="ad3-preview-limit">{fa(chatPreview.messages?.length || 0)} پیام دریافت‌شده • حداکثر {fa(REPORT_LIMIT)} پیام نخست به ترتیب زمان</p>
                <div className="moderation-chat-modal__messages">
                  {chatPreview.messages?.length ? chatPreview.messages.map((m) => (
                    <article key={m.id}>
                      <div><strong>{m.senderName}</strong><time>{faDate(m.createdAt)}</time></div>
                      <p>{m.text}</p>
                    </article>
                  )) : <div className="moderation-chat-modal__empty">هنوز هیچ پیامی در این گفتگو ثبت نشده است.</div>}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {actionModal && (
        <div className="moderation-action-modal" role="dialog" aria-modal="true" aria-labelledby="ad3-action-title">
          <div className="moderation-action-modal__backdrop" onClick={() => {if (!lock.current) setActionModal(null);}} />
          <form className="moderation-action-modal__card" onSubmit={submitAction}>
            <header>
              <div><span>تصمیم اجرایی مدیر</span><h2 id="ad3-action-title">اقدام مدیریتی</h2></div>
              <button type="button" aria-label="بستن اقدام" disabled={Boolean(working)} onClick={() => setActionModal(null)}>×</button>
            </header>

            <div className="moderation-action-modal__summary">
              <strong>{reasonLabels[actionModal.reason] || actionModal.reason}</strong>
              <span>کاربر گزارش‌شده: {actionModal.reported_name || "نامشخص"}</span>
            </div>

            <label>
              <span>نوع اقدام</span>
              <select disabled={Boolean(working)} value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
                {availableActions(actionModal).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>

            {actionHelp(selectedAction) && (
              <div className="moderation-action-modal__legal-note">
                {actionHelp(selectedAction)}
              </div>
            )}

            <label>
              <span>توضیح داخلی مدیر</span>
              <textarea
                disabled={Boolean(working)}
                rows="4"
                maxLength="1000"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="این توضیح فقط برای سابقه مدیریتی ذخیره می‌شود و به کاربر نمایش داده نمی‌شود."
                required
              />
            </label>

            {selectedAction === "refer_legal" && (
              <div className="moderation-action-modal__legal-note">
                این گزینه ارجاع داخلی را ثبت می‌کند. اگر دستور قضایی یا Legal Hold لازم شد، پرونده رسمی را در «امور حقوقی» بسازید.
                <Link to="/admin/legal">رفتن به امور حقوقی</Link>
              </div>
            )}

            <div className="moderation-action-modal__buttons">
              <button type="button" className="cancel" disabled={Boolean(working)} onClick={() => setActionModal(null)}>انصراف</button>
              <button type="submit" disabled={busy || actionNote.trim().length < 3}>
                {working === actionModal.id ? "در حال اجرا..." : "ثبت و اجرای اقدام"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
