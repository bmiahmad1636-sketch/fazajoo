import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldUseAdminHeader} from '../src/components/adminHeaderCMS02.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const admin={user:{id:'test'},userProfile:{systemRole:'admin'},authLoading:false,profileLoading:false};
const paths=['/admin','/admin/direct-management','/admin/moderation','/admin/legal','/admin/featured','/admin/notification-policy','/admin/chat-policy','/admin/site-content'];
test('authorized administrator gets distinct header on every administrative route',()=>{
 for(const path of [...paths,'/admin/','/ADMIN/site-content']) assert.equal(shouldUseAdminHeader(path,admin),true,path);
});
test('public pages always retain public header, even for administrators',()=>{
 for(const path of ['/','/parking','/parking/123','/login','/account','/agency','/administer','/administrator','/admin-other','/about','/terms','/inbox','/wallet']) assert.equal(shouldUseAdminHeader(path,admin),false,path);
});
test('guest, normal user, agent and loading state never receive admin header',()=>{
 for(const context of [{...admin,user:null},{...admin,userProfile:{systemRole:'user'}},{...admin,userProfile:{systemRole:'user',accountType:'agent',agencyStatus:'approved'}},{...admin,userProfile:null},{...admin,authLoading:true},{...admin,profileLoading:true},{}]) assert.equal(shouldUseAdminHeader('/admin/site-content',context),false);
});
test('app uses router location, remounts header only on mode changes and retains guard',()=>{
 const a=read('src/App.jsx');assert.match(a,/const \{ pathname \} = useLocation\(\)/);assert.match(a,/shouldUseAdminHeader\(pathname, \{\s*user, userProfile, authLoading, profileLoading,/);assert.match(a,/key=\{adminHeaderMode \? "admin" : "public"\}/);assert.match(a,/adminMode=\{adminHeaderMode\}/);
 const guard=a.slice(a.indexOf('function AdminRoute('),a.indexOf('function App()'));
 assert.match(guard,/if \(authLoading \|\| profileLoading\)/);assert.match(guard,/if \(!user\)[\s\S]*?to="\/login"/);assert.match(guard,/if \(!isAdmin\)[\s\S]*?to="\/"/);assert.ok(guard.indexOf('<AdminNavigationADM06 />')>guard.indexOf('if (!isAdmin)'));
});
test('admin header contains only identity, security account, return and shared logout; public header remains distinct',()=>{
 const h=read('src/components/Header.jsx');const start=h.indexOf('{adminMode ? (');const end=h.indexOf(') : (',start);const branch=h.slice(start,end);
 assert.ok(start>0&&end>start);for(const p of ['/admin','/account','/'])assert.ok(branch.includes(`to="${p}"`));assert.match(branch,/onClick=\{openLogoutModal\}/);assert.doesNotMatch(branch,/MessageBadge|NotificationBell|\/add-parking|\/favorites|\/agency|\/my-parkings|\/parking/);
 assert.match(h.slice(end),/<MessageBadge/);assert.match(h.slice(end),/<NotificationBell/);assert.equal((h.match(/aria-modal="true"/g)||[]).length,1);assert.match(h,/handleLogout\(false\)/);assert.match(h,/handleLogout\(true\)/);
});
test('all admin navigation links are retained with no duplicate brand title',()=>{
 const nav=read('src/components/AdminNavigationADM06.jsx');assert.deepEqual([...nav.matchAll(/to: "([^"]+)"/g)].map(m=>m[1]),paths);assert.doesNotMatch(nav,/adm06-nav__brand/);
});
test('admin-only appended CSS has scoped selectors and explicit small screen styles',()=>{
 const css=read('src/components/Header.css').split('/* CMS02')[1];assert.ok(css);assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|html|:root|\.fazajoo-header__|\.cms01-|\.adm01-)/);assert.match(css,/max-width:620px/);assert.match(css,/max-width:360px/);assert.match(css,/:focus-visible/);
});
