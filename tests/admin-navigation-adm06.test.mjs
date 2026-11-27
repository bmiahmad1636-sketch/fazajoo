import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/App.jsx');
const nav=read('src/components/AdminNavigationADM06.jsx');
const css=read('src/components/AdminNavigationADM06.css');
const policyCss=read('src/components/AdminNotificationPolicyNT03.css');
const guard=app.slice(app.indexOf('function AdminRoute('),app.indexOf('function App()'));
const routes=['/admin','/admin/direct-management','/admin/moderation','/admin/legal','/admin/featured','/admin/notification-policy','/admin/chat-policy','/admin/site-content'];
test('all eight admin destinations are actual registered routes and unique',()=>{
 const paths=[...nav.matchAll(/to: "([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(paths,routes);
 for(const p of paths)assert.ok(app.includes(`path="${p}"`));
});
test('shared navigation is mounted only inside authorized admin return',()=>{
 assert.equal((app.match(/<AdminNavigationADM06\s*\/>/g)||[]).length,1);
 assert.ok(guard.indexOf('<AdminNavigationADM06 />')>guard.indexOf('if (!isAdmin)'));
 assert.match(guard,/if \(!isAdmin\)\s*\{\s*return <Navigate to="\/" replace \/>;/);
 assert.match(guard,/userProfile\?\.systemRole === "admin"/);
 assert.match(guard,/if \(!user\)\s*\{\s*return <Navigate to="\/login" replace \/>;/);
 assert.match(guard,/if \(authLoading \|\| profileLoading\)/);
});
test('all five page components remain protected',()=>{
 for(const component of ['AdminDashboard','AdminDirectManagement','AdminModeration','LegalCenterJalali','FeaturedShowcaseAdmin'])assert.match(app,new RegExp(`<AdminRoute[^>]*>\\s*<${component}\\s*/>\\s*</AdminRoute>`));
});
test('navigation uses router links and exact matching, not a new access mechanism',()=>{
 assert.match(nav,/<NavLink key=\{to\} to=\{to\} end/);
 assert.doesNotMatch(nav,/fetch\(|localStorage|sessionStorage|window\.location|onClick=/);
 assert.match(nav,/aria-label=\{label\}/);
});
test('active page and keyboard focus have explicit visual styles',()=>{
 assert.match(css,/\[aria-current="page"\]/);assert.match(css,/:focus-visible/);
 assert.match(nav,/aria-label="ناوبری بخش مدیریت فضاجو"/);
});
test('compact mobile rail stays in flow, uses responsive flexible columns, print hides it',()=>{
 assert.match(css,/repeat\(8,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:620px\)/);assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/position\s*:\s*(fixed|sticky)|z-index/);
 assert.match(css,/@media print\{\.adm06-nav\{display:none;\}\}/);
});
test('policy changes are limited to dashboard appearance',()=>{
 const additions=policyCss.split('/* ADM06:')[1];assert.ok(additions);
 assert.match(additions,/\.adm01 \.nt03-admin-grid/);
 assert.match(additions,/\.adm01 \.nt03-admin \[role="alert"\]/);
 assert.match(additions,/\.adm01 \.nt03-admin \[role="status"\]/);
 assert.doesNotMatch(additions,/display\s*:\s*none|position\s*:\s*(fixed|sticky)/);
});
test('existing policy controls and versioned save calls stay connected',()=>{
 const dashboard=read('src/pages/AdminDashboard.jsx');
 assert.match(dashboard,/to="\/admin\/notification-policy"/);
 assert.match(dashboard,/to="\/admin\/chat-policy"/);
 const workspace=read('src/pages/AdminPolicyWorkspaceADM07.jsx');assert.match(workspace,/<AdminNotificationPolicyNT03\s*\/>/);assert.match(workspace,/<AdminChatPolicyCM03\s*\/>/);
 for(const [file,save] of [['AdminNotificationPolicyNT03','saveNotificationPolicyNT03'],['AdminChatPolicyCM03','saveChatPolicyCM03']]){
  const s=read(`src/components/${file}.jsx`);assert.match(s,new RegExp(`await ${save}\\(`));assert.match(s,/version:data\.policy\.version/);assert.match(s,/disabled=\{!valid\|\|!dirty\|\|busy\}/);
 }
});
