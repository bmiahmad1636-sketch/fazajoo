import { useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import AdminNotificationPolicyNT03 from "../components/AdminNotificationPolicyNT03";
import AdminChatPolicyCM03 from "../components/AdminChatPolicyCM03";
import "./AdminPolicyWorkspaceADM07.css";

const sections = [
  {kind:"notification", to:"/admin/notification-policy", title:"تنظیمات اعلان‌ها", subtitle:"خبرم کن و اعتماد و ایمنی"},
  {kind:"chat", to:"/admin/chat-policy", title:"تنظیمات گفتگوها", subtitle:"کاربران عادی و مشاوران"},
];
function PolicyIcon({chat}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{chat?<path d="M20 4H4a1 1 0 0 0-1 1v12l5-4h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1ZM8 8h8"/>:<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>}</svg>;
}
export default function AdminPolicyWorkspaceADM07({kind}) {
  const heading=useRef(null);
  const chat=kind==="chat";
  const current=sections[chat?1:0];
  useEffect(()=>{
    // Only on entry to either policy workspace; never on edits, reloads or saves.
    window.scrollTo({top:0,left:0,behavior:"instant"});
    heading.current?.focus({preventScroll:true});
  },[kind]);
  return <main className="adm07-policy" dir="rtl" aria-labelledby="adm07-title">
    <header className="adm07-header"><div className="adm07-header-inner">
      <div className="adm07-heading"><span className="adm07-hero-icon"><PolicyIcon chat={chat}/></span><div><span className="adm07-kicker">فضاجو / سیاست‌های نگهداری</span><h1 id="adm07-title" ref={node=>{heading.current=node;}} tabIndex={-1}>{current.title}</h1><p>{chat?"مدیریت زمان انتقال گفتگوها به آرشیو شخصی":"مدیریت زمان آرشیو و مدت نمایش اعلان‌ها"}</p></div></div>
      <Link className="adm07-back" to="/admin">بازگشت به مرکز مدیریت <span aria-hidden="true">←</span></Link>
    </div></header>
    <div className="adm07-layout">
      <aside className="adm07-rail"><nav aria-label="سیاست‌های نگهداری"><h2>سیاست‌های نگهداری</h2>{sections.map(item=><NavLink key={item.kind} to={item.to} end className="adm07-link"><span className="adm07-link-icon"><PolicyIcon chat={item.kind==="chat"}/></span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></NavLink>)}</nav>
        <section className="adm07-guide"><h2>راهنمای مدیر</h2><p>{chat?"آرشیو هر کاربر مستقل است. پیام جدید می‌تواند گفتگو را دوباره فعال کند.":"اعلان‌های خوانده‌نشده منقضی نمی‌شوند. پایان مهلت آرشیو فقط بر نمایش اعلان اثر دارد."}</p><p>تغییر مدت‌ها فقط پس از ذخیره اعمال می‌شود. پیش از رفتن به بخش دیگر، تغییرات موردنظر را ذخیره کنید.</p><p className="adm07-guide-safe">هیچ سابقه‌ای با این تنظیمات از دیتابیس حذف نمی‌شود.</p></section>
      </aside>
      <div className="adm07-content">{chat?<AdminChatPolicyCM03 />:<AdminNotificationPolicyNT03 />}</div>
    </div>
  </main>;
}
