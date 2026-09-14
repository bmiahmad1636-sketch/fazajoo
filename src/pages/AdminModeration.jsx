import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminReportChat, getAdminReports, updateAdminReport } from "../services/trustSafetyService";
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

export default function AdminModeration() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [working, setWorking] = useState("");
  const [chatPreview, setChatPreview] = useState(null);
  const [chatPreviewLoading, setChatPreviewLoading] = useState(false);

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

  return (
    <main className="moderation">
      <section className="moderation__hero">
        <div><span>🛡 اعتماد و ایمنی</span><h1>مرکز رسیدگی به گزارش‌ها</h1><p>گزارش‌های کاربران را بررسی و وضعیت رسیدگی را ثبت کنید.</p></div>
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
                  <time>{new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(new Date(r.created_at))}</time>
                </div>
                <div className="report-card__meta">
                  <span>هدف: {targetLabels[r.target_type] || r.target_type}</span>
                  <span>گزارش‌دهنده: {r.reporter_name || "کاربر فضاجو"}</span>
                  <span>کاربر گزارش‌شده: {r.reported_name || "—"}</span>
                </div>
                {r.details && <p>{r.details}</p>}
                <div className="report-card__actions">
                  <button disabled={working === r.id} onClick={() => change(r, "reviewing")}>شروع بررسی</button>
                  <button className="ok" disabled={working === r.id} onClick={() => change(r, "resolved")}>رسیدگی شد</button>
                  <button className="muted" disabled={working === r.id} onClick={() => change(r, "dismissed")}>رد گزارش</button>
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
                      <div><strong>{m.senderName}</strong><time>{new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "short", timeStyle: "short" }).format(new Date(m.createdAt))}</time></div>
                      <p>{m.text}</p>
                    </article>
                  )) : <div className="moderation-chat-modal__empty">هنوز هیچ پیامی در این گفتگو ثبت نشده است.</div>}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
