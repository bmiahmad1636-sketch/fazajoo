import { Link, useLocation } from "react-router-dom";
import { footerLinks, showPublicFooter } from "./footerFT01";
import { resolveFooterContent } from "../config/footerContent";
import "./SiteFooterFT01.css";

function scrollToTop() {
  // No global scroll restoration; only footer actions affect scroll position.
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

function handleFooterLink(event) {
  if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) scrollToTop();
}

function FooterLinks({ title, items }) {
  return (
    <nav className="fj-ft01__nav" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {items.map(({ to, label }) => (
          <li key={to}><Link to={to} onClick={handleFooterLink}>{label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

function FooterPending({ label }) {
  return <span className="fj-ft01__pending"><span>{label}</span><small>در انتظار تکمیل</small></span>;
}

function FooterLicense({ item }) {
  if (!item.ready) return (
    <div className="fj-ft01__license fj-ft01__license--pending">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" strokeDasharray="3 2"/><path d="M9 9h6m-6 4h6m-6 4h3"/></svg>
      <span>{item.label}</span><small>جایگاه نمادین · هنوز فعال نیست</small>
    </div>
  );
  return (
    <a className="fj-ft01__license" href={item.href} target="_blank" rel="noopener noreferrer">
      {item.imagePath && <img src={item.imagePath} alt="" width="48" height="48" loading="lazy" />}
      <span>{item.label}</span><small>مشاهده و استعلام</small>
    </a>
  );
}

function FooterPublicInformation({ development, content }) {
  const { pages, contacts, licenses } = resolveFooterContent({ development, content });
  const guide = pages.filter(item => item.id !== "contact");
  const contactPage = pages.find(item => item.id === "contact");
  if (!pages.length && !contacts.length && !licenses.length) return null;
  const pageItem = item => item.ready ? <Link to={item.path} onClick={handleFooterLink}>{item.label}</Link> : <FooterPending label={item.label} />;
  return (
    <div className="fj-ft01__info">
      {guide.length > 0 && <section className="fj-ft01__info-section">
        <h2>راهنما و قوانین</h2>
        <ul className="fj-ft01__info-list fj-ft01__info-list--pages">
          {guide.map(item => <li key={item.id}>{pageItem(item)}</li>)}
        </ul>
      </section>}
      {(contactPage || contacts.length > 0) && <section className="fj-ft01__info-section">
        <h2>ارتباط با فضاجو</h2>
        <ul className="fj-ft01__info-list">
          {contactPage && <li>{pageItem(contactPage)}</li>}
          {contacts.map(item => <li key={item.id}>{!item.ready ? <FooterPending label={item.label} /> : <span className="fj-ft01__contact"><span>{item.label}</span>{item.href ? <a href={item.href} dir="ltr">{item.value}</a> : <span>{item.value}</span>}</span>}</li>)}
        </ul>
      </section>}
      {licenses.length > 0 && <section className="fj-ft01__info-section">
        <h2>مجوزها و اعتبارنامه‌ها</h2>
        <div className="fj-ft01__licenses">{licenses.map(item => <FooterLicense key={item.id} item={item} />)}</div>
      </section>}
    </div>
  );
}

export default function SiteFooterFT01({ user, userProfile, profileLoading, content }) {
  const { pathname } = useLocation();
  if (!showPublicFooter(pathname, content)) return null;
  const { browse, services } = footerLinks({ user, userProfile, profileLoading });

  return (
    <footer className="fj-ft01" dir="rtl" aria-label="پاورقی فضاجو">
      <div className="fj-ft01__inner">
        <div className="fj-ft01__grid">
          <div className="fj-ft01__brand">
            <Link to="/" onClick={handleFooterLink} className="fj-ft01__identity" aria-label="فضاجو، صفحه اصلی">
              <img src="/fazajoo-logo.png" alt="" width="52" height="52" loading="lazy" decoding="async" />
              <span><strong>فضاجو</strong><small>هر فضا، یک فرصت</small></span>
            </Link>
            <p>بازار تخصصی اجاره فضا؛ بستری برای ارتباط مستقیم صاحبان فضا، متقاضیان و مشاوران املاک.</p>
          </div>
          <FooterLinks title="دسترسی سریع" items={browse} />
          <FooterLinks title="خدمات فضاجو" items={services} />
          <div className="fj-ft01__advice">
            <h2>پیش از توافق</h2>
            <p>فضا و مدارک طرف مقابل را بررسی کنید و پیش از اطمینان از شرایط، وجهی پرداخت نکنید.</p>
          </div>
        </div>
        <FooterPublicInformation development={import.meta.env.DEV} content={content} />
        <div className="fj-ft01__bottom">
          <p>کلیه حقوق این وب‌سایت متعلق به فضاجو است.</p>
          <span className="fj-ft01__domain" dir="ltr">FAZAJOO.IR</span>
          <button className="fj-ft01__top" type="button" onClick={scrollToTop}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
            بازگشت به بالا
          </button>
        </div>
      </div>
    </footer>
  );
}
