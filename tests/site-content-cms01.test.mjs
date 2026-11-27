import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolveFooterContent,footerContent} from '../src/config/footerContent.js';
import {toFooterContent,publicPage} from '../src/utils/siteContentCMS01.js';
import {showPublicFooter} from '../src/components/footerFT01.js';
const require=createRequire(import.meta.url);
const v=require('../backend/src/services/siteContentCMS01.validation.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=';
const doc=v.emptyDocument;
const ready=()=>{const d=doc();d.pages.about={status:'ready',body:'متن معرفی'};d.contacts.phone={status:'ready',value:'+98 21 12345678'};d.contacts.email={status:'ready',value:'info@example.test'};d.licenses.enamad={status:'ready',verificationUrl:'https://example.test/verify',imageData:png};return d;};
test('initial storage is empty, fixed schema and all items pending',()=>{assert.deepEqual(v.fromStorage({}),doc());assert.equal(Object.values(doc()).flatMap(Object.values).length,11);assert.deepEqual(resolveFooterContent({content:toFooterContent(doc())}),{pages:[],contacts:[],licenses:[]});});
test('valid draft and publication normalize and connect to existing footer',()=>{const d=v.normalizeDocument(ready(),{publish:true});const f=resolveFooterContent({content:toFooterContent(v.publicDocument(d))});assert.equal(f.pages[0].path,'/about');assert.equal(f.contacts[0].href,'tel:+982112345678');assert.equal(f.contacts[1].href,'mailto:info@example.test');assert.equal(f.licenses[0].imagePath,png);assert.equal(publicPage(d,'about').body,'متن معرفی');});
test('pending data is stripped from public response, not merely hidden in UI',()=>{const d=ready();d.pages.about.status='pending';d.contacts.phone.status='pending';d.licenses.enamad.status='pending';const p=v.publicDocument(d);assert.deepEqual(p.pages.about,doc().pages.about);assert.deepEqual(p.contacts.phone,doc().contacts.phone);assert.deepEqual(p.licenses.enamad,doc().licenses.enamad);assert.equal(publicPage(p,'about'),null);});
test('incomplete active draft can be saved but not published',()=>{for(const [group,id] of [['pages','terms'],['contacts','phone'],['licenses','business']]){const d=doc();d[group][id].status='ready';assert.doesNotThrow(()=>v.normalizeDocument(d));assert.throws(()=>v.normalizeDocument(d,{publish:true}),{status:400});}});
test('strict allowed fields and reserved paths prevent role or routing injection',()=>{const d=ready();d.pages.about.path='/admin';assert.throws(()=>v.normalizeDocument(d),{status:400});const d2=ready();d2.role='admin';assert.throws(()=>v.normalizeDocument(d2),{status:400});const d3=ready();delete d3.contacts.address;assert.throws(()=>v.normalizeDocument(d3),{status:400});});
test('rejects invalid and credential-bearing verification URLs',()=>{for(const url of ['javascript:alert(1)','http://example.test','https://user:pass@example.test','//example.test','https://example.test\\evil','https://example.test/ x']){const d=ready();d.licenses.enamad.verificationUrl=url;assert.throws(()=>v.normalizeDocument(d),{status:400});}});
test('rejects SVG, MIME spoofing, noncanonical base64 and over-size images',()=>{for(const value of ['data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,SGVsbG8=','data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB','data:image/png;base64,'+'A'.repeat(140000)]){const d=ready();d.licenses.enamad.imageData=value;assert.throws(()=>v.normalizeDocument(d),{status:400});}});
test('publication validates actual contact values',()=>{for(const [id,value] of [['phone','not a number'],['email','a@b.test?subject=x'],['address','']]){const d=doc();d.contacts[id]={status:'ready',value};assert.throws(()=>v.normalizeDocument(d,{publish:true}),{status:400});}});
test('legal content is plain text bounded and rendered as React text',()=>{const d=ready();d.pages.about.body='<script>alert(1)</script>';assert.equal(v.normalizeDocument(d).pages.about.body,d.pages.about.body);assert.match(read('src/pages/PublicContentCMS01.jsx'),/\{page.body\}/);assert.doesNotMatch(read('src/pages/PublicContentCMS01.jsx')+read('src/pages/AdminSiteContentCMS01.jsx'),/dangerouslySetInnerHTML|innerHTML\s*=/);d.pages.about.body='x'.repeat(6001);assert.throws(()=>v.normalizeDocument(d),{status:400});});
test('only ready public pages receive footer and admin remains excluded',()=>{const f=toFooterContent(ready());assert.equal(showPublicFooter('/about',f),true);assert.equal(showPublicFooter('/terms',f),false);assert.equal(showPublicFooter('/admin/site-content',f),false);assert.equal(showPublicFooter('/parking/1',f),true);});
test('six fixed public routes and CMS admin guard are real',()=>{const app=read('src/App.jsx');for(const {id,path} of footerContent.pages)assert.ok(app.includes(`path="${path}" element={<PublicContentCMS01 id="${id}"`));assert.match(app,/path="\/admin\/site-content"[\s\S]*?<AdminRoute[^>]*>\s*<AdminSiteContentCMS01 \/>\s*<\/AdminRoute>/);});
test('auth and admin guard precede admin reads and parser; public reads separate',()=>{const routes=read('backend/src/routes/siteContentCMS01.routes.js');assert.match(routes,/router\.get\('\/public',safe\(\(\)=>service\.readPublic\(\)\)\)/);assert.match(routes,/router\.use\('\/admin',requireAuth,requireAdmin\);[\s\S]*router\.get\('\/admin'[\s\S]*router\.put\('\/admin\/draft',json/);assert.match(routes,/router\.post\('\/admin\/publish',json/);assert.match(routes,/Cache-Control','no-store'/);const app=read('backend/src/app.js');assert.ok(app.indexOf('app.use("/api/site-content"')<app.indexOf('express.json({'));assert.match(app,/limit:\s*"100kb"/);});
test('mutation SQL version check, row lock, transactional audit and public projection',()=>{const s=read('backend/src/services/siteContentCMS01.service.js');assert.match(s,/SELECT published,published_at FROM site_content_cms01/);assert.match(s,/publicDocument\(row.published\)/);assert.match(s,/FOR UPDATE/);assert.match(s,/old.version!==body.version/);assert.match(s,/body.confirm!==true/);assert.match(s,/normalizeDocument\(old.draft,\{publish:true\}\)/);assert.match(s,/INSERT INTO site_content_audit_cms01/);assert.match(s,/await client.query\('COMMIT'\)/);assert.match(s,/await client.query\('ROLLBACK'\)/);assert.match(s,/finally \{client.release\(\);\}/);});
test('migration additive transactional and idempotent, no destructive statements',()=>{const s=read('backend/src/db/site-content-cms01.sql');assert.match(s,/^BEGIN;/);assert.match(s,/COMMIT;/);assert.match(s,/CREATE TABLE IF NOT EXISTS site_content_cms01/);assert.match(s,/ON CONFLICT\(id\) DO NOTHING/);assert.doesNotMatch(s,/\b(DROP|TRUNCATE|DELETE FROM|ALTER TABLE users)\b/i);});
test('audit change keys only identify changed fields',()=>{const d=doc();const b=structuredClone(d);b.pages.about.body='draft';assert.deepEqual(v.changedKeys(d,b),['pages.about']);assert.deepEqual(v.changedKeys(b,b),[]);});
test('frontend publish only saved confirmed state; no draft sent to public endpoint',()=>{const s=read('src/pages/AdminSiteContentCMS01.jsx');assert.match(s,/disabled=\{disabled\|\|dirty\|\|!unpublished\|\|!confirm\}/);assert.match(s,/publishSiteContent\(state.version\)/);const api=read('src/services/siteContentCMS01Service.js');assert.match(api,/getPublishedSiteContent=signal=>request\('\/public',\{signal\}\)/);assert.match(api,/body:\{version,confirm:true\}/);});

test('real service functions preserve draft/public separation and reject conflicts using a simulated transactional pool',async()=>{
  const Module=require('node:module');const originalLoad=Module._load;
  let row={version:1,draft:{},published:{},updated_at:null,published_at:null};let audit=[];let tx=null;let released=0;let forceAuditFailure=false;
  const copy=o=>structuredClone(o);
  const query=async(sql,params=[])=>{
    if(sql==='BEGIN'){tx={row:copy(row),audit:copy(audit)};return {rows:[]};}
    if(sql==='COMMIT'){row=tx.row;audit=tx.audit;tx=null;return {rows:[]};}
    if(sql==='ROLLBACK'){tx=null;return {rows:[]};}
    const cur=tx?.row||row;const log=tx?.audit||audit;
    if(sql.startsWith('SELECT version,'))return {rows:[copy(cur)]};
    if(sql.startsWith('SELECT published,'))return {rows:[{published:copy(cur.published),published_at:cur.published_at}]};
    if(sql.startsWith('SELECT id,actor_id'))return {rows:copy(log).reverse()};
    if(sql.startsWith('UPDATE site_content_cms01')){assert.ok(tx);const key=sql.includes('SET draft=')?'draft':'published';cur[key]=JSON.parse(params[0]);cur.version++;cur.updated_at='now';if(key==='published')cur.published_at='now';return {rows:[]};}
    if(sql.startsWith('INSERT INTO site_content_audit_cms01')){assert.ok(tx);if(forceAuditFailure)throw Error('simulated audit failure');log.push({id:log.length+1,actor_id:params[0],action:params[1],version:params[2],changed_keys:params[3],created_at:'now'});return {rows:[]};}
    throw Error('Unexpected SQL: '+sql);
  };
  let service;
  try {Module._load=function(request,parent,isMain){if(request==='../db/pool'&&parent?.filename.endsWith('siteContentCMS01.service.js'))return {query,pool:{connect:async()=>({query,release(){released++;}})}};return originalLoad.call(this,request,parent,isMain);};service=require('../backend/src/services/siteContentCMS01.service.js');}finally{Module._load=originalLoad;}
  const actor='test-admin';const d=ready();
  assert.equal((await service.readAdmin()).version,1);
  const saved=await service.save(actor,{version:1,draft:d});assert.equal(saved.version,2);assert.equal(saved.draft.pages.about.body,'متن معرفی');assert.equal((await service.readPublic()).content.pages.about.status,'pending');
  await assert.rejects(service.publish(actor,{version:1,confirm:true}),{status:409});
  await assert.rejects(service.publish(actor,{version:2,confirm:false}),{status:400});
  const published=await service.publish(actor,{version:2,confirm:true});assert.equal(published.version,3);assert.equal((await service.readPublic()).content.pages.about.body,'متن معرفی');assert.deepEqual(published.audit.map(a=>a.action),['publish','save']);
  d.pages.about.body='draft only';forceAuditFailure=true;await assert.rejects(service.save(actor,{version:3,draft:d}),/simulated audit failure/);assert.equal((await service.readAdmin()).version,3);assert.equal((await service.readPublic()).content.pages.about.body,'متن معرفی');forceAuditFailure=false;
  d.pages.about.status='pending';const s=await service.save(actor,{version:3,draft:d});await service.publish(actor,{version:s.version,confirm:true});assert.equal((await service.readPublic()).content.pages.about.body,'');assert.ok(released>=6);assert.equal(tx,null);
});
