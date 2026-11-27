// Presentation only. AdminRoute and server authorization remain authoritative.
export function shouldUseAdminHeader(pathname, { user, userProfile, authLoading, profileLoading } = {}) {
  return typeof pathname === "string" && /^\/admin(?:\/|$)/i.test(pathname)
    && Boolean(user) && !authLoading && !profileLoading
    && userProfile?.systemRole === "admin";
}
