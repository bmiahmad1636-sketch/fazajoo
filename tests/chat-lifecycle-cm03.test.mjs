import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const lifecycle=require('../backend/src/services/chatLifecycleCM03.service.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('backend/src/db/chat-lifecycle-cm03.sql'), controller=read('backend/src/controllers/chats.controller.js'), server=read('backend/src/server.js'), inbox=read('src/pages/Inbox.jsx'), chat=read('src/pages/Chat.jsx'), admin=read('backend/src/routes/admin.routes.js');
test('migration replaces only the known listing FK and snapshots deleted reference in same transaction',()=>{
 assert.match(sql,/confrelid='spaces'::regclass/);assert.match(sql,/confdeltype NOT IN \('c','n'\)/);assert.match(sql,/ALTER COLUMN space_id DROP NOT NULL/);assert.match(sql,/REFERENCES spaces\(id\) ON DELETE SET NULL/);assert.match(sql,/BEFORE DELETE ON spaces/);assert.match(sql,/deleted_space_title=OLD.title/);assert.doesNotMatch(sql,/DELETE FROM (chats|messages)/i);
});
test('startup awaits migration before listening; transaction and rollback protect partial schema',()=>{
 assert.match(server,/ensureChatLifecycle\(\)\.then\(\(\) => server.listen/);assert.match(server,/CM03 startup protection failed[\s\S]*?process.exit\(1\)/);
});
test('listing and archive select preserve participant scope and hidden-message filters',()=>{
 assert.match(controller,/LEFT JOIN spaces s ON s.id = c.space_id/);assert.match(controller,/parkingId: row.space_id \|\| row.original_space_id/);assert.match(controller,/listingDeleted: !row.space_id/);assert.match(controller,/c.owner_id = \$1 OR c.requester_id = \$1/);assert.match(controller,/message_hidden_for_user h WHERE h.message_id=m.id AND h.user_id=\$1/);
});
test('archive cannot override unread, legal hold or moderation restriction',()=>{
 for(const k of ['unread_count','legal_hold','legal_mode','moderation_mode','ca.last_message_id=activity.id'])assert.ok(lifecycle.ARCHIVED_SQL.includes(k),k);
 for(const k of ['c.owner_id=$1 OR c.requester_id=$1','m.read_at IS NULL','m.deleted_for_all_at IS NULL','h.user_id=$1','NOT $3::boolean'])assert.ok(lifecycle.SET_ARCHIVE_SQL.includes(k),k);
 assert.match(lifecycle.SET_ARCHIVE_SQL,/ON CONFLICT\(chat_id,user_id\)/);
});
test('regular and approved agent inbox/count share participant-scoped personal and agency visibility',()=>{
 assert.equal(controller.match(/typeCondition = `c.chat_type IN \('personal', 'agency'\)`;/g)?.length,4);assert.match(controller,/if \(!isApprovedAgent\)/);assert.match(controller,/if \(isApprovedAgent\)/);assert.match(controller,/policy.agencyDays : policy.personalDays/);
});
test('administrative and judicial queries retain deleted listing references',()=>{
 for(const p of ['backend/src/services/adminDirect.service.js','backend/src/services/legal.service.js','backend/src/services/trustSafety.service.js']){const s=read(p);assert.match(s,/COALESCE\(c.space_id,c.original_space_id\)/);assert.match(s,/COALESCE\(s.title,c.deleted_space_title\)/);}
});
test('policy inputs are strict, default limits are seeded, admin routes protected',()=>{
 assert.deepEqual(lifecycle.validatePolicy({personalDays:90,agencyDays:180,version:1}),{personalDays:90,agencyDays:180,version:1});
 for(const bad of [{personalDays:0,agencyDays:180,version:1},{personalDays:90,agencyDays:3651,version:1},{personalDays:'90',agencyDays:180,version:1},{personalDays:90,agencyDays:180,version:0},null])assert.throws(()=>lifecycle.validatePolicy(bad),e=>e.status===400);
 assert.match(sql,/VALUES\(1,90,180\)/);assert.ok(admin.indexOf('requireAdmin\n);')<admin.indexOf('router.get("/chat-policy"'));assert.match(admin,/savePolicy\(req.user.id,req.body\)/);
});
test('UI keeps active/unread/archive distinct, independent actions outside links, deleted listing not linked',()=>{
 for(const t of ['chooseFilter("active")','chooseFilter("archive")','chooseFilter("unread")','setChatArchive(chat.id, !chat.archived)','filteredChats.slice(0, visibleLimit)','chat.listingDeleted','chat.legalHold'])assert.ok(inbox.includes(t),t);
 assert.match(chat,/chat\?\.listingDeleted \? <p[^>]*>.*?<\/p> : <Link/);
 assert.match(chat,/user\?\.accountType === "agent" && user\?\.agencyStatus === "approved"/);
});
test('existing message delete deadlines and judicial hold remain intact',()=>{
 assert.match(controller,/const maxMinutes = m.read_at \? 15 : 1440/);assert.match(controller,/SELECT legal_hold FROM chats WHERE id=\$1 FOR UPDATE/);assert.match(controller,/INSERT INTO message_deletion_audit/);assert.match(controller,/getBlockStatus\(req.user.id, otherUserId\)/);
});
test('policy write is transactional, audited and optimistic-concurrency protected',async()=>{
 const calls=[];const old={personal_days:90,agency_days:180,version:1,updated_at:null};const next={...old,personal_days:91,version:2};
 const client={async query(s,args){calls.push([s,args]);if(s.includes('FOR UPDATE'))return{rows:[old]};if(s.startsWith('UPDATE'))return{rows:[next]};return{rows:[]};},release(){calls.push(['RELEASE']);}};
 const pool={async connect(){return client;}};
 const r=await lifecycle.savePolicy('actor',{personalDays:91,agencyDays:180,version:1},pool);assert.equal(r.version,2);assert.ok(calls.some(([s])=>s.startsWith('INSERT INTO chat_policy_audit')));assert.ok(calls.some(([s])=>s==='COMMIT'));
 calls.length=0;await assert.rejects(lifecycle.savePolicy('actor',{personalDays:92,agencyDays:180,version:2},pool),e=>e.status===409);assert.ok(calls.some(([s])=>s==='ROLLBACK'));assert.ok(!calls.some(([s])=>s.startsWith('UPDATE')));
});
test('migration runner rolls back if verification fails, never commits on failed FK check',async()=>{
 const calls=[];const c={async query(s){calls.push(s);if(s.startsWith('SELECT id FROM'))return{rowCount:0};if(s.startsWith('SELECT 1 FROM pg_constraint'))return{rowCount:0};return{rowCount:1};},release(){calls.push('RELEASE');}};
 await assert.rejects(lifecycle.ensureChatLifecycle({async connect(){return c;}}),/schema verification failed/);assert.ok(calls.includes('ROLLBACK'));assert.ok(!calls.includes('COMMIT'));assert.ok(calls.includes('RELEASE'));
});
