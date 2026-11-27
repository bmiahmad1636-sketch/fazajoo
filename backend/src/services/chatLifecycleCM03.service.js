const fs = require('node:fs');
const path = require('node:path');
const migration = fs.readFileSync(path.join(__dirname,'../db/chat-lifecycle-cm03.sql'),'utf8');
// Single migration transaction, including marker. Failure prevents serving requests.
async function ensureChatLifecycle(pool = require('../db/pool').pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query('SELECT pg_advisory_xact_lock(60320261126)');
    await client.query('CREATE TABLE IF NOT EXISTS chat_lifecycle_cm03_version (id integer PRIMARY KEY CHECK (id=1))');
    const applied = await client.query('SELECT id FROM chat_lifecycle_cm03_version WHERE id=1');
    if (!applied.rowCount) {
      await client.query(migration);
      await client.query('INSERT INTO chat_lifecycle_cm03_version(id) VALUES(1)');
    }
    // Fail closed if a later manual schema change reintroduces the cascading FK.
    const checked = await client.query(`SELECT 1 FROM pg_constraint WHERE conrelid='chats'::regclass
      AND confrelid='spaces'::regclass AND contype='f'
      AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='chats'::regclass AND attname='space_id')]
      HAVING count(*)=1 AND bool_and(confdeltype='n')
      AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='spaces'::regclass AND tgname='cm03_snapshot_deleted_space' AND tgenabled IN ('O','A'))
      AND to_regclass('chat_user_archive_cm03') IS NOT NULL
      AND to_regclass('chat_policy_cm03') IS NOT NULL
      AND to_regclass('chat_policy_audit_cm03') IS NOT NULL`);
    if (checked.rowCount!==1) throw new Error('CM03 listing retention schema verification failed');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}
// Latest real message, including messages hidden from the viewer, defines activity.
const ACTIVITY_JOIN = `LEFT JOIN LATERAL (
  SELECT id,created_at FROM messages WHERE chat_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1
) activity ON TRUE`;
const ARCHIVE_JOIN = `LEFT JOIN chat_user_archive_cm03 ca ON ca.chat_id=c.id AND ca.user_id=$1`;
const PROTECTED = `(COALESCE(c.legal_hold,false) OR COALESCE(c.legal_mode,'active')<>'active' OR COALESCE(c.moderation_mode,'active')<>'active')`;
// Unread and protected conversations remain in the active inbox. Overrides are
// scoped to the last activity, so any new message automatically reopens the chat.
const ARCHIVED_SQL = `CASE WHEN activity.id IS NULL OR COALESCE(uc.unread_count,0)>0 OR ${PROTECTED} THEN false
  WHEN ca.last_message_id=activity.id THEN ca.archived
  ELSE activity.created_at <= NOW()-($2::integer * interval '1 day') END`;
const SET_ARCHIVE_SQL = `INSERT INTO chat_user_archive_cm03(chat_id,user_id,last_message_id,archived)
  SELECT c.id,$1,activity.id,$3 FROM chats c ${ACTIVITY_JOIN}
  WHERE c.id=$2 AND (c.owner_id=$1 OR c.requester_id=$1) AND activity.id IS NOT NULL
    AND (NOT $3::boolean OR (NOT ${PROTECTED} AND NOT EXISTS (
      SELECT 1 FROM messages m WHERE m.chat_id=c.id AND m.sender_id<>$1 AND m.read_at IS NULL
      AND m.deleted_for_all_at IS NULL AND NOT EXISTS (SELECT 1 FROM message_hidden_for_user h WHERE h.message_id=m.id AND h.user_id=$1)
    )))
  ON CONFLICT(chat_id,user_id) DO UPDATE SET last_message_id=EXCLUDED.last_message_id,archived=EXCLUDED.archived,changed_at=NOW()
  RETURNING chat_id`;
function policyRow(row) {
  if (!row) throw new Error('CM03 archive policy missing');
  return {personalDays:row.personal_days,agencyDays:row.agency_days,version:row.version,updatedAt:row.updated_at};
}
function policyError(message,status=400) { const e=new Error(message); e.status=status; return e; }
function validatePolicy(body) {
  if (!body || !['personalDays','agencyDays'].every(k=>Number.isSafeInteger(body[k])&&body[k]>=1&&body[k]<=3650) || !Number.isSafeInteger(body.version)||body.version<1) throw policyError('مدت‌ها باید عدد صحیح بین ۱ تا ۳۶۵۰ روز باشند.');
  return {personalDays:body.personalDays,agencyDays:body.agencyDays,version:body.version};
}
async function getPolicy(db=require('../db/pool')) {
  return policyRow((await db.query('SELECT * FROM chat_policy_cm03 WHERE id=1')).rows[0]);
}
async function policyAudit(db=require('../db/pool')) {
  return (await db.query('SELECT id,old_policy,new_policy,created_at FROM chat_policy_audit_cm03 ORDER BY id DESC LIMIT 20')).rows;
}
async function savePolicy(actor, body, pool=require('../db/pool').pool) {
  const next=validatePolicy(body);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const old=policyRow((await client.query('SELECT * FROM chat_policy_cm03 WHERE id=1 FOR UPDATE')).rows[0]);
    if(old.version!==next.version) throw policyError('تنظیمات تغییر کرده‌اند؛ دوباره بارگذاری کنید.',409);
    if(old.personalDays===next.personalDays && old.agencyDays===next.agencyDays) {await client.query('COMMIT');return old;}
    const updated=policyRow((await client.query('UPDATE chat_policy_cm03 SET personal_days=$1,agency_days=$2,version=version+1,updated_at=NOW() WHERE id=1 RETURNING *',[next.personalDays,next.agencyDays])).rows[0]);
    await client.query('INSERT INTO chat_policy_audit_cm03(actor_id,old_policy,new_policy) VALUES($1,$2::jsonb,$3::jsonb)',[actor,JSON.stringify(old),JSON.stringify(updated)]);
    await client.query('COMMIT'); return updated;
  } catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;} finally{client.release();}
}
module.exports={ensureChatLifecycle,ACTIVITY_JOIN,ARCHIVE_JOIN,ARCHIVED_SQL,SET_ARCHIVE_SQL,validatePolicy,getPolicy,savePolicy,policyAudit};
