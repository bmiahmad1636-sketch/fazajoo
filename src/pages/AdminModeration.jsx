import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  applyAdminModerationAction,
  getAdminReportChat,
  getAdminReports,
  updateAdminReport,
} from "../services/trustSafetyService";
import { showInSiteAlert } from "../utils/inSiteDialog";
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
    refer_legal: "فقط ارجاع داخلی ثبت می‌شود و پرونده قضایی به‌صورت خودکار ساخته نمی‌شود.",
  };
  return help[action] || "";
}

function faDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
  }
  items.push(["refer_legal", "ارجاع داخلی به امور حقوقی"]);
  return items;
}

export default function AdminModeration() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [working, setWorking] = useState("");
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

  async function load() {
    try {
      setLoading(true);
      setReports(await getAdminReports(filter));
    } catch (e) {
      showInSiteAlert(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  const counts = useMemo(
    () => reports.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {}),
    [reports]
  );

  async function change(r, status) {
    try {
      setWorking(r.id);
      await updateAdminReport(r.id, status, r.resolution_note || "");
      await load();
    } catch (e) {
      showInSiteAlert(e.message);
    } finally {
      setWorking("");
    }
  }

  async function openChatPreview(report) {
    try {
      setChatPreviewLoading(true);
      const data = await getAdminReportChat(report.id);
      setChatPreview({ report, ...data });
    } catch (e) {
      showInSiteAlert(e.message);
    } finally {
      setChatPreviewLoading(false);
    }
  }

  function openActionModal(report) {
    const first = availableActions(report)[0]?.[0] || "refer_legal";
    setSelectedAction(first);
    setActionNote("");
    setActionModal(report);
  }

  async function submitAction(event) {
    event.preventDefault();
    if (!actionModal) return;
    try {
      setWorking(actionModal.id);
      const result = await applyAdminModerationAction(actionModal.id, selectedAction, actionNote);
      setActionModal(null);
      setActionNote("");
      await load();
      showInSiteAlert(result?.message || "اقدام مدیریتی ثبت و اجرا شد.");
    } catch (e) {
      showInSiteAlert(e.message);
    } finally {
      setWorking("");
    }
  }

  return (
    <main className="moderation">
      <section className="moderation__hero">
        <div><span>🛡 اعتماد و ایمنی</span><h1>مرکز رسیدگی به گزارش‌ها</h1><p>گزارش را بررسی کنید، اقدام متناسب انجام دهید و سابقه تصمیم را نگه دارید.</p></div>
        <Link to="/admin">بازگشت به پنل مدیریت</Link>
      </section>

      <section className="moderation__body">
        <div className="moderation__stats">
          <article><span>نمایش فعلی</span><strong>{reports.length.toLocaleString("fa-IR")}</strong></article>
          <article><span>جدید</span><strong>{(counts.new || 0).toLocaleString("fa-IR")}</strong></article>
          <article><span>در حال بررسی</span><strong>{(counts.reviewing || 0).toLocaleString("fa-IR")}</strong></article>
        </div>

        <div className="moderation__filters">
          {[["", "همه"], ["new", "جدید"], ["reviewing", "در حال بررسی"], ["resolved", "رسیدگی‌شده"], ["dismissed", "ردشده"]].map(([v, l]) => (
            <button className={filter === v ? "active" : ""} onClick={() => setFilter(v)} key={v}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div className="moderation__empty">در حال دریافت گزارش‌ها...</div>
        ) : reports.length === 0 ? (
          <div className="moderation__empty">گزارشی در این بخش وجود ندارد.</div>
        ) : (
          <div className="moderation__list">
            {reports.map((r) => (
              <article className="report-card" key={r.id}>
                <div className="report-card__top">
                  <div><span className={`status status--${r.status}`}>{statusLabels[r.status]}</span><strong>{reasonLabels[r.reason] || r.reason}</strong></div>
                  <time>{faDate(r.created_at)}</time>
                </div>
                <div className="report-card__meta">
                  <span>هدف: {targetLabels[r.target_type] || r.target_type}</span>
                  <span>گزارش‌دهنده: {r.reporter_name || "کاربر فضاجو"}</span>
                  <span>کاربر گزارش‌شده: {r.reported_name || "—"}</span>
                </div>
                {r.details && <p>{r.details}</p>}

                {Array.isArray(r.actions) && r.actions.length > 0 && (
                  <div className="report-card__history">
                    <strong>سابقه اقدام مدیریتی</strong>
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
                  </div>
                )}

                <div className="report-card__actions">
                  <button disabled={working === r.id} onClick={() => change(r, "reviewing")}>شروع بررسی</button>
                  <button className="ok" disabled={working === r.id} onClick={() => change(r, "resolved")}>رسیدگی شد</button>
                  <button className="muted" disabled={working === r.id} onClick={() => change(r, "dismissed")}>رد گزارش</button>
                  <button className="action" disabled={working === r.id} onClick={() => openActionModal(r)}>اقدام مدیریتی</button>
                  {r.target_type === "listing" && <Link to={`/parking/${r.target_id}`}>مشاهده آگهی</Link>}
                  {r.target_type === "chat" && (
                    <button className="dark" disabled={chatPreviewLoading} onClick={() => openChatPreview(r)}>
                      {chatPreviewLoading ? "در حال دریافت..." : "مشاهده امن گفتگو"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {chatPreview && (
        <div className="moderation-chat-modal" role="dialog" aria-modal="true">
          <div className="moderation-chat-modal__backdrop" onClick={() => setChatPreview(null)} />
          <section className="moderation-chat-modal__card">
            <header>
              <div><span>نمایش امن مدیر</span><h2>گفتگوی گزارش‌شده</h2></div>
              <button onClick={() => setChatPreview(null)}>×</button>
            </header>
            {!chatPreview.exists ? (
              <div className="moderation-chat-modal__empty">رکورد این گفتگو دیگر وجود ندارد.</div>
            ) : (
              <>
                <div className="moderation-chat-modal__meta">
                  <strong>{chatPreview.chat?.spaceTitle || "آگهی فضاجو"}</strong>
                  <span>{chatPreview.chat?.ownerName || "آگهی‌دهنده"} ↔ {chatPreview.chat?.requesterName || "متقاضی"}</span>
                </div>
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
        <div className="moderation-action-modal" role="dialog" aria-modal="true">
          <div className="moderation-action-modal__backdrop" onClick={() => setActionModal(null)} />
          <form className="moderation-action-modal__card" onSubmit={submitAction}>
            <header>
              <div><span>تصمیم اجرایی مدیر</span><h2>اقدام مدیریتی</h2></div>
              <button type="button" onClick={() => setActionModal(null)}>×</button>
            </header>

            <div className="moderation-action-modal__summary">
              <strong>{reasonLabels[actionModal.reason] || actionModal.reason}</strong>
              <span>کاربر گزارش‌شده: {actionModal.reported_name || "نامشخص"}</span>
            </div>

            <label>
              <span>نوع اقدام</span>
              <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
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
              <button type="button" className="cancel" onClick={() => setActionModal(null)}>انصراف</button>
              <button type="submit" disabled={working === actionModal.id || actionNote.trim().length < 3}>
                {working === actionModal.id ? "در حال اجرا..." : "ثبت و اجرای اقدام"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
