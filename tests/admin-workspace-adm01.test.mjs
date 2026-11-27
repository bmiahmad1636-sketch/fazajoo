import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeAdminSearch, filterAdminAgents, adminPage, adminCount } from '../src/utils/adminWorkspaceADM01.js';
const read = file => readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const rows = [{id:1,agencyName:'دفتر ملك کیان',agentName:'علي',phone:'09131234567',agencyCity:'شهرضا',agencyLicenseNumber:'۱۲۳'}, {id:2,agencyName:'سپاهان',agencyCity:'اصفهان',phone:'09130000000'}, {id:3}];
test('normalizes Persian and Arabic digits and letters',()=>assert.equal(normalizeAdminSearch('  علي كيان ۱۲٣ '),'علی کیان 123'));
test('matches normalized Persian phone',()=>assert.deepEqual(filterAdminAgents(rows,'۰۹۱۳۱۲۳۴۵۶۷').map(x=>x.id),[1]));
test('matches license digits and city across fields',()=>assert.deepEqual(filterAdminAgents(rows,'شهرضا 123').map(x=>x.id),[1]));
test('matches agent and agency names',()=>assert.deepEqual(filterAdminAgents(rows,'علی کیان').map(x=>x.id),[1]));
test('whitespace and missing fields safe, no results honest',()=>{assert.equal(filterAdminAgents(rows,'  '),rows);assert.deepEqual(filterAdminAgents(rows,'نام ناشناخته'),[]);});
test('paging preserves order and no duplication',()=>{const all=Array.from({length:23},(_,i)=>i);assert.deepEqual([1,2,3].flatMap(p=>adminPage(all,p).rows),all);});
test('paging clamps after action removes last row',()=>assert.deepEqual(adminPage([1],4),{number:1,totalPages:1,rows:[1]}));
test('empty and invalid page safe',()=>{assert.equal(adminPage([],0).number,1);assert.equal(adminPage(rows,NaN).number,1);});
test('counts never show misleading zero on error/loading',()=>{assert.equal(adminCount(0,true,false),'—');assert.equal(adminCount(0,false,true),'—');assert.equal(adminCount(0,false,false),'۰');});
const source=read('src/pages/AdminDashboard.jsx');
test('all original tools remain reachable',()=>{for(const path of ['direct-management','featured','legal','moderation'])assert.ok(source.includes(`to="/admin/${path}"`));assert.ok(source.includes('to="/admin/notification-policy"'));assert.ok(source.includes('to="/admin/chat-policy"'));});
test('dashboard stays under existing admin guard',()=>assert.match(read('src/App.jsx'),/path="\/admin"[\s\S]*?<AdminRoute[\s\S]*?<AdminDashboard\s*\/>[\s\S]*?<\/AdminRoute>/));
test('existing secure document endpoints and confirmation stay connected',()=>{for(const handler of ['approveAgentApi(user.id)','rejectAgentApi(user.id)','grantAdminNetworkCredits(user.id, amount)','getAdminDocumentBlob('])assert.ok(source.includes(handler));assert.match(source,/URL\.revokeObjectURL/);assert.match(source,/showInSiteConfirm/);});
test('filters and page controls close document previews, disabled during in-flight actions',()=>{assert.match(source,/const navigationLocked = Boolean\(documentsLoading \|\| workingUserId \|\| grantWorkingId\)/);for(const fn of ['changeView','changeQuery','changePage'])assert.match(source,new RegExp(`function ${fn}\\([^)]*\\) \\{\\s*if \\(navigationLocked\\) return;\\s*closeDocuments\\(\\);`));});
test('unavailable quotas cannot be granted blindly',()=>assert.match(source,/disabled=\{Boolean\(grantWorkingId\) \|\| networkCreditsLoading \|\| Boolean\(networkCreditsError\) \|\| !credit\}/));
test('no new write endpoints, rejected view read only',()=>{const rejected=source.slice(source.indexOf('{workspaceView === "rejected" && <section'));assert.doesNotMatch(rejected,/approveAgent\(|rejectAgent\(|grantNetworkCredits\(/);assert.doesNotMatch(source,/\bfetch\(/);});

test('all three statuses render the same document button and viewer',()=>{
  for (const view of ['pending','approved','rejected']) {
    const start=source.indexOf(`{workspaceView === "${view}" &&`);
    assert.ok(start>=0,view);
    const end=source.indexOf('</section>}',start);
    const block=source.slice(start,end<0?undefined:end);
    assert.match(block,/renderDocumentsButton\(user\)/);
    assert.match(block,/renderDocumentsPanel\(user\)/);
  }
});
test('viewer uses only existing authenticated blob API with selected user and document type',()=>{
  assert.match(source,/getAdminDocumentBlob\(user\.id, key\)/);
  assert.match(source,/downloadDocument\(user\.id, key, entry\.record, title\)/);
  assert.match(source,/src=\{entry\.url\}/);
  assert.doesNotMatch(source,/src=\{(?:record|entry\.record)\??\.url\}/);
  const routes=read('backend/src/routes/admin.routes.js');
  assert.match(routes,/router\.use\(\s*requireAuth,\s*requireAdmin\s*\)/);
  assert.match(routes,/router\.get\(\s*"\/users\/:id\/documents\/:documentType",\s*getAgencyDocument/);
});
test('missing and failed documents are distinct and partial failures preserve successful blobs',()=>{
  assert.match(source,/Promise\.allSettled/);
  assert.match(source,/result\.status === "fulfilled"/);
  assert.match(source,/دریافت امن مدرک ناموفق بود/);
  assert.match(source,/مدرک موجود نیست/);
  assert.match(source,/آخرین درخواست ثبت‌شده/);
});
test('private preview URLs are revoked and stale requests cannot reopen a closed viewer',()=>{
  assert.match(source,/session\.generation \+= 1/);
  assert.match(source,/revokeDocumentLinks\(session\.urls\)/);
  assert.match(source,/if \(session\.generation !== generation\) return/);
  assert.match(source,/if \(session\.generation === generation\) setDocumentsLoading\(false\)/);
  assert.match(source,/aria-expanded=\{documentsUserId === user\.id\}/);
});
