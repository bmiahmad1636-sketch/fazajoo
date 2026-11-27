import { Link } from "react-router-dom";
import { getCategoryLabel } from "../utils/matchingEngine";
import { agencyPage } from "../utils/agencyWorkspaceAG01.js";
export { agencyPage };
export const agencyNumber = value => Number(value).toLocaleString("fa-IR");
const links = [
  ["dashboard", "/agency", "میز کار و تطبیق‌ها", "grid"],
  ["applicants", "/agency/applicants", "متقاضیان فضا", "search"],
  ["inbox", "/agency/inbox", "گفتگوهای کاری", "chat"],
  ["listings", "/my-parkings", "مدیریت فایل‌های من", "files"],
];
function Glyph({ name }) {
  const paths = { grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z", search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6", chat: "M3 4h18v13H9l-6 4z M7 9h10 M7 13h7", files: "M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h8" };
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
export function AgencyShell({ active, title, subtitle, stats, children }) {
  return <main className="ag01" dir="rtl"><header className="ag01-banner"><div className="ag01-container ag01-banner-inner"><div><small>فضاجو / پنل حرفه‌ای مشاور</small><h1>{title}</h1><p>{subtitle}</p></div><Link className="ag01-primary ag01-create" to="/add-parking">+ ثبت فایل یا درخواست</Link></div></header><div className="ag01-container ag01-workspace"><aside className="ag01-sidebar"><div className="ag01-side-head"><span className="ag01-side-emblem"><Glyph name="grid"/></span><div><strong>فضای کاری مشاور</strong><small>دسترسی‌های تخصصی</small></div></div><nav aria-label="ناوبری پنل مشاور">{links.map(([key,to,label,icon])=><Link key={key} to={to} aria-current={active===key ? "page" : undefined}><Glyph name={icon}/><span>{label}</span><span aria-hidden="true">‹</span></Link>)}</nav><div className="ag01-stats"><h2>خلاصه فعالیت</h2>{stats.map(([label,value])=><div key={label}><span>{label}</span><strong>{agencyNumber(value)}</strong></div>)}</div></aside><div className="ag01-main">{children}</div></div></main>;
}
export function AgencySpace({item,label,kind,canOpen,area,budget}) {
  const areaText = area ?? (Number(item.area)>0 ? `${agencyNumber(item.area)} مترمربع` : "");
  return <div className={`ag01-space ag01-space--${kind}`}><small>{label}</small><h3>{item.title || getCategoryLabel(item)}</h3><div className="ag01-space-meta"><span>{item.city || "شهر ثبت نشده"}</span>{areaText && <span>{areaText}</span>}</div>{budget && <p className="ag01-budget">{budget}</p>}{canOpen ? <Link to={`/parking/${item.id}`}>مشاهده جزئیات ←</Link> : <span className="ag01-locked">جزئیات پس از دریافت فرصت</span>}</div>;
}
export function AgencyScore({score,eligible}) {
  return <div className="ag01-score" data-weak={eligible===false}><b>{agencyNumber(score)}٪</b><span>{eligible===false ? "تطبیق محدود" : "تطبیق"}</span></div>;
}
export function AgencyReasons({reasons=[]}) {return <div className="ag01-reasons">{reasons.length ? reasons.map((reason,index)=><span key={`${index}-${reason}`}>✓ {reason}</span>) : <span>دلیل تطبیق کافی ثبت نشده</span>}</div>;}
export function AgencyPager({data,onPage}) {return data.pages>1 ? <nav className="ag01-pager" aria-label="صفحه‌بندی نتایج"><button type="button" disabled={data.page<=1} onClick={()=>onPage(data.page-1)}>قبلی</button><span aria-live="polite">صفحه {agencyNumber(data.page)} از {agencyNumber(data.pages)}</span><button type="button" disabled={data.page>=data.pages} onClick={()=>onPage(data.page+1)}>بعدی</button></nav> : null;}
