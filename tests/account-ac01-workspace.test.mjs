import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
const jsx = read('src/pages/Account.jsx');
const css = read('src/pages/Account.css');
test('AC01 preserves password submission, validation and autocomplete', () => {
  for (const token of ['await changePassword({','currentPassword: form.currentPassword','newPassword: form.newPassword','form.newPassword !== form.confirmPassword','form.currentPassword === form.newPassword','onSubmit={submitPassword}','disabled={busy}','autoComplete="current-password"','autoComplete="new-password"','minLength={8} maxLength={72}']) assert.ok(jsx.includes(token),token);
});
test('AC01 preserves unblock confirmation, service and realtime event', () => {
  for (const token of ['window.confirm(','await unblockUser(userId)','current.filter((item) => item.userId !== userId)','fazajoo:block-status-changed','handleUnblock(item.userId)','disabled={Boolean(unblockingUserId)}','item.maskedPhone','محدودیت‌های مدیریتی یا حقوقی']) assert.ok(jsx.includes(token),token);
});
test('AC01 keeps actual data services and honest loading/error states', () => {
  for (const token of ['getNoticeCenter("all",1,true)' ,'getBlockedUsers()','noticeStatus === "loading"','noticeStatus === "error"','blockedError','blockedUsersLoading','data.counts.unread','alive = false','setRetry']) assert.ok(jsx.includes(token),token);
});
test('AC01 routes and roles remain available', () => {
  for (const token of ['/my-parkings','/favorites','/wallet','/inbox','/notifications','user?.phone','userProfile?.systemRole === "admin"','userProfile?.agencyStatus === "approved"']) assert.ok(jsx.includes(token),token);
});
test('AC01 real workspace with keyboard-accessible navigation', () => {
  for (const token of ['fz-account__workspace','aria-pressed={panel === item.id}','selectPanel("security")','selectPanel("blocked")','hidden={panel !== "security"}','hidden={panel !== "blocked"}','setShowPasswords(false)']) assert.ok(jsx.includes(token),token);
  assert.match(css,/\.fz-account \[hidden\]\{display:none!important\}/);
  assert.match(css,/grid-template-columns:minmax\(245px,305px\) minmax\(0,1fr\)/);
});
test('AC01 responsive CSS is scoped', () => {
  assert.match(css,/@media\(max-width:820px\)/);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/\.fz-account :focus-visible/);
  assert.doesNotMatch(css,/\.account-page|\.account-card|\.chat-page|\.inbox-page/);
});
