import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8').replace(/\r\n?/g,'\n');
const app=read('src/App.jsx'), dashboard=read('src/pages/AdminDashboard.jsx'), page=read('src/pages/AdminPolicyWorkspaceADM07.jsx'), nav=read('src/components/AdminNavigationADM06.jsx'), audit=read('src/components/PolicyAuditADM07.jsx'), css=read('src/pages/AdminPolicyWorkspaceADM07.css');
test('both policy destinations are separately registered under the existing admin guard',()=>{
 for(const [route,key] of [['notification-policy','notification'],['chat-policy','chat']]){
  assert.match(app,new RegExp(`path="/admin/${route}" element=\\{\\s*<AdminRoute user=\\{user\\} authLoading=\\{authLoading\\} userProfile=\\{userProfile\\} profileLoading=\\{profileLoading\\}>\\s*<AdminPolicyWorkspaceADM07 key="${key}" kind="${key}" />\\s*</AdminRoute>`));
  assert.ok(nav.includes(`to: "/admin/${route}"`));
 }
});
test('dashboard opens full pages, no inline policy panels or toggle state',()=>{
 for(const route of ['notification-policy','chat-policy'])assert.ok(dashboard.includes(`<Link to="/admin/${route}" className="adm01-tool">`));
 assert.doesNotMatch(dashboard,/PolicyOpen|adm01-notice-policy|adm01-chat-policy|<AdminNotificationPolicyNT03|<AdminChatPolicyCM03/);
 assert.match(dashboard,/خلاصه عملیاتی/);assert.match(dashboard,/مدیریت مشاوران/);
});
test('workspace renders exactly the selected policy and never embeds agency dashboard',()=>{
 assert.match(page,/chat\?<AdminChatPolicyCM03\s*\/>:<AdminNotificationPolicyNT03\s*\/>/);
 assert.doesNotMatch(page,/AdminDashboard|agencyUsers|workspaceView/);
 assert.match(page,/to="\/admin"/);assert.match(page,/<NavLink key=\{item.kind\} to=\{item.to\} end/);
});
test('entry resets viewport and focuses title without reacting to form changes',()=>{
 assert.match(page,/useEffect\(\(\)=>\{[\s\S]*?window\.scrollTo\(\{top:0,left:0,behavior:"instant"\}\);[\s\S]*?focus\(\{preventScroll:true\}\);\s*\},\[kind\]\)/);
 assert.match(page,/ref=\{node=>\{heading.current=node;\}\} tabIndex=\{-1\}/);
});
// Compare the actual complete pre-render policy controller (state, loaders, validation, confirmation, save, version) to ADM06.
const baseline = {
 'AdminNotificationPolicyNT03': '28e1bffe03754e562feedbf22f675bb1e6a15915b4ce24ccff54a396702fc46d',
 'AdminChatPolicyCM03': 'a69fc381772e79be0f8dd7c7fd074b70b080639f6482fe4734d4b98dce4384f4'
};
for(const [name,hash] of Object.entries(baseline))test(`${name} controller logic byte-equivalent after LF normalization`,()=>{
 const source=read(`src/components/${name}.jsx`);
 const block=source.slice(source.indexOf('const fields='),source.indexOf(' return <section'));
 assert.equal(createHash('sha256').update(block).digest('hex'),hash);
 assert.match(source,/onSubmit=\{submit\}/);assert.match(source,/disabled=\{!valid\|\|!dirty\|\|busy\}/);
 assert.match(source,/PolicyAuditADM07 entries=\{data.audit\} fields=\{fields\} date=\{date\} format=\{format\}/);
 assert.match(source,/min="1" max="3650" step="1" required/);
});
test('audit history retains every returned entry and every old/new field, no write calls',()=>{
 assert.match(audit,/entries\.map\(a=>/);assert.match(audit,/fields\.map\(\(\[k,type,label\]\)=>/);assert.doesNotMatch(audit,/\.slice\(|\.splice\(/);
});
test('audit missing values are not misleading zero, entries use native details',()=>{
 assert.match(audit,/n == null \|\| !Number\.isFinite\(Number\(n\)\) \? "—"/);
 assert.match(audit,/<details><summary>/);assert.match(audit,/old_policy\?\.\[k\]/);assert.match(audit,/new_policy\?\.\[k\]/);
 assert.doesNotMatch(audit,/fetch\(|localStorage|saveNotificationPolicyNT03|saveChatPolicyCM03/);
});
test('policy stylesheet is scoped, responsive, and contains no fixed overlay',()=>{
 assert.match(css,/\.adm07-policy \.nt03-admin/);assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/\.adm07-policy \.nt03-admin-grid\{grid-template-columns:minmax\(0,1fr\)/);
 assert.doesNotMatch(css,/position\s*:\s*fixed|!important\s*;[^}]*display\s*:\s*none/);
});
