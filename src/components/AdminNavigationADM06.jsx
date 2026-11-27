import { NavLink } from "react-router-dom";
import "./AdminNavigationADM06.css";

const sections = [
  { to: "/admin", label: "مرکز مدیریت", short: "مدیریت", icon: <g><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></g> },
  { to: "/admin/direct-management", label: "مدیریت کاربران", short: "کاربران", icon: <g><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5"/></g> },
  { to: "/admin/moderation", label: "مرکز تخلفات", short: "تخلفات", icon: <g><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></g> },
  { to: "/admin/legal", label: "امور حقوقی", short: "حقوقی", icon: <path d="M12 3v18M5 21h14M3 7h18M5 7l-3 7h6L5 7Zm14 0-3 7h6l-3-7Z"/> },
  { to: "/admin/featured", label: "ویترین ویژه", short: "ویترین", icon: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.2-.9Z"/> },
  { to: "/admin/notification-policy", label: "تنظیمات اعلان‌ها", short: "اعلان‌ها", icon: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/> },
  { to: "/admin/chat-policy", label: "تنظیمات گفتگوها", short: "گفتگوها", icon: <path d="M20 4H4a1 1 0 0 0-1 1v12l5-4h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1ZM8 8h8"/> },
  { to: "/admin/site-content", label: "محتوا و هویت سایت", short: "محتوا", icon: <g><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></g> },
];

export default function AdminNavigationADM06() {
  return (
    <nav className="adm06-nav" dir="rtl" aria-label="ناوبری بخش مدیریت فضاجو">
      <div className="adm06-nav__inner">
        <div className="adm06-nav__links">
          {sections.map(({to, label, short, icon}) => (
            <NavLink key={to} to={to} end className="adm06-nav__link" aria-label={label}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{icon}</svg>
              <span className="adm06-nav__full" aria-hidden="true">{label}</span>
              <span className="adm06-nav__short" aria-hidden="true">{short}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
