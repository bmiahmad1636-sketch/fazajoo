import { footerContent, resolveFooterContent } from "../config/footerContent.js";

// Only public browsing routes. Do not add account, chat, admin or form routes here.
export function showPublicFooter(pathname, content = footerContent) {
  if (typeof pathname !== "string") return false;
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || /^\/parking(?:\/[^/]+)?$/i.test(path) || /^\/agency-profile\/[^/]+$/i.test(path)
    || resolveFooterContent({ content }).pages.some(item => item.ready && item.path.toLowerCase() === path.toLowerCase());
}

export function footerLinks({ user = null, userProfile = null, profileLoading = false } = {}) {
  const approved = !profileLoading && user && userProfile?.accountType === "agent" && userProfile?.agencyStatus === "approved";
  return {
    browse: [
      { to: "/parking", label: "همه آگهی‌ها" },
      { to: "/find-for-me", label: "جستجوی هوشمند" },
      { to: "/add-parking", label: "ثبت آگهی یا درخواست فضا" },
    ],
    services: [
      approved ? { to: "/agency", label: "پنل حرفه‌ای مشاور" } : { to: "/agency-access", label: "همکاری با مشاوران املاک" },
      ...(user ? [{ to: "/account", label: "حساب کاربری" }, { to: "/my-parkings", label: "آگهی‌های من" }] : [{ to: "/login", label: "ورود به حساب" }, { to: "/register", label: "ثبت‌نام" }]),
    ],
  };
}
