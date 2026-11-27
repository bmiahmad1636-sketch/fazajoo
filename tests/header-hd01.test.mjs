import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const header=read('src/components/Header.jsx');
const message=read('src/components/MessageBadge.jsx');
const bell=read('src/components/NotificationBell.jsx');
const css=read('src/components/Header.css');
const flat=s=>s.replace(/\s+/g,'');
const h=flat(header), m=flat(message), b=flat(bell);
test('shared Header preserves guest and signed-in destinations',()=>{
 for(const route of ['/','/parking','/my-parkings','/favorites','/account','/admin','/add-parking','/login','/register']) assert.ok(h.includes(`to="${route}"`),route);
 assert.ok(h.includes('isApprovedAgent?"/agency":"/agency-access"'));
 assert.ok(h.includes('userProfile?.accountType==="agent"&&userProfile?.agencyStatus==="approved"'));
 assert.ok(h.includes('userProfile?.systemRole==="admin"'));
 assert.match(read('src/App.jsx'),/<Header\s+user=\{user\}/);
});
test('logout handlers and both session modes remain connected',()=>{
 assert.ok(h.includes('awaitonLogout(allDevices)'));
 assert.ok(h.includes('handleLogout(false)'));
 assert.ok(h.includes('handleLogout(true)'));
 assert.ok(h.includes('onClick={openLogoutModal}'));
 assert.match(header,/aria-modal="true"/);
});
test('mobile navigation toggle and loading state are preserved',()=>{
 assert.ok(h.includes('setMenuOpen((currentValue)=>!currentValue)'));
 assert.ok(h.includes('aria-expanded={menuOpen}'));
 assert.ok(h.includes('aria-disabled={profileLoading}'));
 assert.ok(h.includes('fazajoo-header__menu--open'));
});
test('message routes, unread count and realtime subscriptions are preserved',()=>{
 assert.ok(m.includes('isApprovedAgent?"/agency/inbox":"/inbox"'));
 assert.ok(m.includes('getUnreadCount(isApprovedAgent?"agency":"personal")'));
 assert.ok(m.includes('subscribeInboxChanged(load)'));
 assert.ok(m.includes('!loading&&unreadCount>0'));
 assert.match(message,/fazajoo:inbox-changed/);
});
test('notification route, polling, event subscriptions and count remain intact',()=>{
 assert.ok(b.includes('getNoticeCenter("all",1,true)'));
 assert.ok(b.includes('window.setInterval(load,45000)'));
 assert.ok(b.includes('to="/notifications"'));
 assert.ok(b.includes('count>0&&<b>'));
 assert.match(bell,/fazajoo:smart-notifications-changed/);
 assert.match(bell,/fazajoo:notifications-changed/);
});
test('new SVG icons are decorative and need no external dependency',()=>{
 for(const source of [header,message,bell]) {
  const icons=[...source.matchAll(/<svg\b[^>]*>/g)]; assert.ok(icons.length>0);
  for(const [svg] of icons){assert.match(svg,/aria-hidden="true"/); assert.match(svg,/focusable="false"/);assert.match(svg,/stroke="currentColor"/);}
  assert.doesNotMatch(source,/💬|🔔|🏢/);
 }
});
test('shared visual changes stay local to Header with no page/global rules',()=>{
 assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|html|:root|#root|\.parking-page|\.home-hero|\.wallet-page)\b/);
 assert.match(css,/position:\s*sticky/);assert.match(css,/z-index:\s*1000/);
 assert.match(css,/\.fazajoo-header \.fazajoo-header__nav-link\s*\{[\s\S]*?min-height:\s*44px !important/);
 assert.match(css,/max-width:\s*1150px/);assert.match(css,/min-width:\s*1151px/);
 assert.match(css,/overflow-y:\s*auto/);assert.match(css,/100dvh/);assert.match(css,/focus-visible/);assert.match(css,/prefers-reduced-motion/);
});
