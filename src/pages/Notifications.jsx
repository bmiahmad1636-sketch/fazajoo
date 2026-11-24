import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  markSmartNotificationRead,
} from "../services/smartSearchService";
import {
  getNoticeCenter,
  archiveNoticeCenterItem,
  archiveReadNoticeCenter,
  markNoticeCenterAllRead,
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

const filters = [
  { id: "all", title: "همه اعلان‌ها", icon: "bell" },
  { id: "unread", title: "خوانده‌نشده", icon: "unread" },
  { id: "moderation", title: "اعتماد و ایمنی", icon: "shield" },
  { id: "smart", title: "نتایج خبرم کن", icon: "spark" },
  { id: "archive", title: "آرشیو اعلان‌ها", icon: "archive" },
];

function NoticeIcon({ name }) {
  const paths = {
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    unread: "M4 4h16v16H4zM4 8l8 5 8-5",
    shield: "M12 3l8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V6zM9 12l2 2 4-4",
    spark: "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5zM20 2v4M18 4h4",
    archive: "M3 4h18v5H3zM5 9v11h14V9M10 13h4",
    check: "M5 12l4 4L19 6",
    refresh: "M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-2l2 6M19 16a8 8 0 0 1-13 2l-2-6",
    arrow: "M20 12H4m6-6-6 6 6 6",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.bell} /></svg>;
}

const formatCount = (value) => Number(value || 0).toLocaleString("fa-IR");
const labels = {warning:"اخطار مدیریت فضاجو",listing_disabled:"توقف نمایش عمومی آگهی",listing_enabled:"فعال‌شدن دوباره آگهی",video_disabled:"توقف نمایش ویدئو",video_enabled:"فعال‌شدن دوباره ویدئو",chat_restricted:"محدودیت گفتگو",chat_restored:"رفع محدودیت گفتگو",pair_blocked:"محدودیت ارتباط",pair_unblocked:"رفع محدودیت ارتباط"};
function mapItem(row) {
  const smart=row.kind === "smart";
  const listing=["listing_disabled","listing_enabled","video_disabled","video_enabled"].includes(row.notice_type);
  return { id:`${row.kind}-${row.id}`, rawId:row.id, type:row.kind, unread:row.unread, archived:row.archived, expiresAt:row.expires_at, createdAt:row.created_at,
    title:smart ? "فضاجو یک گزینه مناسب پیدا کرد" : labels[row.notice_type] || "پیام اعتماد و ایمنی",
    text:smart ? `${row.space_title || "یک نتیجه جدید"} — تطابق ${formatCount(row.match_score)}٪` : row.message,
    href:smart ? (row.space_id ? `/parking/${row.space_id}` : "/find-for-me") : listing ? (row.space_id ? `/edit-parking/${row.space_id}` : "/my-parkings") : ["chat_restricted","chat_restored"].includes(row.notice_type) ? "/inbox" : null,
    linkLabel:smart ? (row.space_id ? "مشاهده نتیجه" : "پیگیری‌های من") : listing ? (row.space_id ? "مدیریت آگهی مرتبط" : "آگهی‌های من") : "گفتگوهای من",
    unavailable:smart && !row.space_id, legacy:listing && !row.space_id };
}
function Notifications() {
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [data,setData]=useState(null);
  const [filter,setFilter]=useState("all");
  const [page,setPage]=useState(1);
  const [pending,setPending]=useState(false);
  const [loadFailed,setLoadFailed]=useState(false);
  const [expanded,setExpanded]=useState(null);
  const [revision,setRevision]=useState(0);
  const detailRef=useRef(null);
  useEffect(()=>{if(expanded){detailRef.current?.focus();detailRef.current?.scrollIntoView({block:"nearest"});}},[expanded]);
  const load=useCallback(()=>setRevision(n=>n+1),[]);
  useEffect(()=>{
    let alive=true;
    setLoading(true);setError("");setLoadFailed(false);
    getNoticeCenter(filter,page).then(result=>{
      if (!alive) return;
      if (page>1 && !result.items.length) {setPage(page-1);return;}
      setData(result);
    }).catch(e=>{if(alive){setLoadFailed(true);setError(e?.message || "دریافت اعلان‌ها انجام نشد.");}})
      .finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[filter,page,revision]);
  const counts=data?.counts || {all:0,unread:0,moderation:0,smart:0,archive:0};
  const unreadCount=counts.unread;
  const visibleItems=(data?.items || []).map(mapItem);
  const currentFilter=filters.find(entry=>entry.id===filter);
  const totalPages=Math.max(1,Math.ceil(counts[filter]/(data?.pageSize || 20)));
  function selectFilter(next) {setExpanded(null);setPage(1);setFilter(next);}
  async function action(fn) {
    if (pending || loading || loadFailed) return;
    setPending(true);setError("");
    try { await fn();load(); }
    catch(e){setError(e?.message || "عملیات انجام نشد.");}
    finally{setPending(false);}
  }
  function markOneRead(item) {
    if (!item.unread) return;
    return action(async()=>{
      if(item.type==="moderation") await markModerationNoticeRead(item.rawId);
      else await markSmartNotificationRead(item.rawId);
    });
  }
  function openDetails(item) {
    setExpanded(expanded?.id===item.id ? null : item);
    if(item.unread) void markOneRead(item);
  }
  function archive(item) {
    return action(async()=>{await archiveNoticeCenterItem(item.type,item.rawId,!item.archived);setExpanded(null);});
  }
  const markAllRead=()=>{if(window.confirm("همه اعلان‌ها، از جمله پیام‌های مهم مدیریت، خوانده‌شده ثبت شوند؟")) void action(markNoticeCenterAllRead);};
  function archiveAllRead() {
    if(window.confirm("همه اعلان‌های خوانده‌شده به آرشیو منتقل شوند؟ امکان بازگردانی وجود دارد.")) void action(async()=>{await archiveReadNoticeCenter();setExpanded(null);});
  }

  return (
    <main className="fazajoo-notifications fz-notice-center" dir="rtl">
      <header className="fz-notice-center__heading">
        <div><span className="fz-notice-center__kicker">فضاجو / پنل شخصی</span><h1>مرکز اعلان‌ها</h1><p>پیام‌های مهم حساب و فرصت‌های تازه، در یک نگاه.</p></div>
        <Link className="fz-notice-center__back" to="/account">حساب کاربری <NoticeIcon name="arrow" /></Link>
      </header>
      <div className="fz-notice-center__workspace">
        <aside className="fz-notice-center__rail">
          <div className="fz-notice-center__summary">
            <span className="fz-notice-center__summary-icon"><NoticeIcon name="bell" /></span>
            <div><span>اعلان‌های خوانده‌نشده</span><strong aria-live="polite">{loading || loadFailed ? "—" : formatCount(unreadCount)}</strong></div>
            <p>{loading ? "در حال همگام‌سازی" : loadFailed ? "وضعیت در دسترس نیست" : unreadCount ? "پیام‌های تازه را بررسی کنید." : "اعلان خوانده‌نشده ندارید."}</p>
          </div>
          <nav className="fz-notice-center__filters" aria-label="دسته‌بندی اعلان‌ها">
            {filters.map((entry) => <button key={entry.id} type="button" aria-pressed={filter === entry.id} disabled={pending} onClick={() => selectFilter(entry.id)}><NoticeIcon name={entry.icon} /><span>{entry.title}</span><small>{loading || loadFailed ? "—" : formatCount(counts[entry.id])}</small></button>)}
          </nav>
        </aside>
        <section className="fz-notice-center__surface" aria-busy={loading || pending}>
          <header className="fz-notice-center__toolbar">
            <div><h2>{currentFilter.title}</h2><span>{loading || loadFailed ? "" : `${formatCount(counts[filter])} اعلان`}</span></div>
            <div className="fz-notice-center__tools">
              <button type="button" onClick={markAllRead} disabled={loading || pending || loadFailed || !unreadCount}><NoticeIcon name="check" /> خواندن همه اعلان‌ها</button>
              {filter!=="archive" && <button type="button" disabled={loading || pending || loadFailed || counts.all<=unreadCount} onClick={archiveAllRead}><NoticeIcon name="archive" /> آرشیو خوانده‌شده‌ها</button>}
              <button type="button" onClick={load} disabled={loading || pending} aria-label="به‌روزرسانی اعلان‌ها" title="به‌روزرسانی اعلان‌ها"><NoticeIcon name="refresh" /></button>
            </div>
          </header>
          {data?.policy && <p className="nt02-policy">اعلان‌های خوانده‌شده پس از {formatCount(data.policy.smart)} روز (خبرم کن) یا {formatCount(data.policy.moderation)} روز (اعتماد و ایمنی) از تاریخ ایجاد، به آرشیو می‌روند. مدت نمایش در آرشیو: {formatCount(data.policy.smartRetention)} روز (خبرم کن) و {formatCount(data.policy.moderationRetention)} روز (اعتماد و ایمنی). اعلان‌های خوانده‌نشده منقضی نمی‌شوند. اعلان‌های بازگردانی‌شده تا آرشیو مجدد در صندوق می‌مانند. پس از انقضا فقط نمایش متوقف می‌شود.</p>}
          {error && <div className="fazajoo-notifications__error" role="alert">{error}{loadFailed && <button type="button" onClick={load} disabled={loading || pending}>تلاش دوباره</button>}</div>}
          {expanded && <section className="nt02-detail" ref={detailRef} tabIndex={-1} aria-label="جزئیات اعلان">
            <div className="nt02-detail-head"><h3>{expanded.title}</h3><button type="button" onClick={()=>setExpanded(null)} aria-label="بستن جزئیات">×</button></div>
            <p>{expanded.text}</p><small>{formatDate(expanded.createdAt)}</small>
            {expanded.legacy && <p>شناسه آگهی در این پیام قدیمی ثبت نشده یا آگهی دیگر در دسترس نیست؛ از فهرست آگهی‌های خود بررسی کنید.</p>}
            {expanded.unavailable && <p>این نتیجه اکنون قابل نمایش نیست؛ پیگیری‌های خود را بررسی کنید.</p>}
            {expanded.href && <Link to={expanded.href}>{expanded.linkLabel}<NoticeIcon name="arrow" /></Link>}
          </section>}
          {loading ? (
            <div className="fz-notice-center__skeleton" role="status"><span className="fz-notice-center__sr">در حال دریافت اعلان‌ها</span>{[0, 1, 2, 3].map((n) => <div key={n} aria-hidden="true"><i /><span><b /><b /></span></div>)}</div>
          ) : loadFailed ? null : visibleItems.length === 0 ? (
            !loadFailed && <div className="fz-notice-center__empty"><NoticeIcon name={filter === "unread" ? "check" : currentFilter.icon} /><h3>{filter === "unread" ? "اعلان خوانده‌نشده ندارید" : "اعلانی در این بخش نیست"}</h3><p>{filter === "all" ? "پیام‌ها و نتایج جدید در اینجا نمایش داده می‌شوند." : "برای دیدن سایر پیام‌ها، همه اعلان‌ها را انتخاب کنید."}</p>{filter !== "all" && <button type="button" onClick={() => selectFilter("all")}>مشاهده همه اعلان‌ها</button>}</div>
          ) : (
            <div className="fazajoo-notifications__list">
              {visibleItems.map((item) => (
                <article key={item.id} className={`fazajoo-notification fazajoo-notification--${item.type} ${item.unread ? "fazajoo-notification--unread" : ""}`}>
                  <div className="fazajoo-notification__icon"><NoticeIcon name={item.type === "moderation" ? "shield" : "spark"} /></div>
                  <div className="fazajoo-notification__body">
                    <div className="fazajoo-notification__title-row"><h3>{item.title}</h3>{item.unread && <span>جدید</span>}</div>
                    <p>{item.text}</p>
                    <small>{formatDate(item.createdAt)}{item.archived && item.expiresAt ? ` · نمایش تا ${formatDate(item.expiresAt)}` : ""}</small>
                  </div>
                  <div className="fazajoo-notification__actions">
                    {item.type==="smart" && !item.unavailable ? <Link to={item.href} onClick={event=>{if(pending || loading || loadFailed){event.preventDefault();return;}void markOneRead(item);}}>{item.linkLabel}<NoticeIcon name="arrow" /></Link> : <button type="button" disabled={pending || loading || loadFailed} aria-expanded={expanded?.id===item.id} onClick={()=>openDetails(item)}>{item.type==="smart" ? "جزئیات نتیجه" : "مشاهده اعلان"}<NoticeIcon name="arrow" /></button>}
                    {item.unread ? <button type="button" disabled={pending || loading} onClick={()=>markOneRead(item)}><NoticeIcon name="check" /> خوانده شد</button> : <button type="button" disabled={pending || loading} onClick={()=>archive(item)}>{item.archived ? "بازگردانی" : "آرشیو"}<NoticeIcon name="archive" /></button>}
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !loadFailed && totalPages>1 && <nav className="nt02-pagination" aria-label="صفحات اعلان‌ها"><button type="button" disabled={page<=1 || pending} onClick={()=>{setExpanded(null);setPage(p=>p-1);}}>قبلی</button><span>{formatCount(page)} از {formatCount(totalPages)}</span><button type="button" disabled={page>=totalPages || pending} onClick={()=>{setExpanded(null);setPage(p=>p+1);}}>بعدی</button></nav>}
        </section>
      </div>
    </main>
  );
}

export default Notifications;
