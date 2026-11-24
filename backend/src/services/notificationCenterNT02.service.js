const { query } = require('../db/pool');
const { ensureTrustSafetySchema } = require('./trustSafety.service');
const { ensureSmartSearchSchema, reconcileSmartSearchNotificationsForUser } = require('./smartSearch.service');
const { ensurePolicy, lifecycle } = require('./notificationPolicyNT03.service');
const FILTERS = new Set(['all','unread','moderation','smart','archive']);
const PAGE_SIZE = 20;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function invalid(message,status=400){const e=new Error(message);e.status=status;return e;}
async function ensure(){await ensureTrustSafetySchema();await ensureSmartSearchSchema();await ensurePolicy();}
const m=lifecycle('moderation'), s=lifecycle('smart');
// Policy and visibility are calculated in one database snapshot. No delete, job or repeated write on reads.
const records = `WITH p AS (SELECT * FROM notification_policy_nt03 WHERE id=1), records AS (
  SELECT n.id, 'moderation'::text AS kind, n.notice_type::text AS notice_type, n.message::text AS message,
    n.created_at, (n.read_at IS NULL) AS unread, ${m.archived} AS archived, ${m.expires} AS expires_at, ${m.expired} AS expired,
    s.id AS space_id, NULL::text AS space_title, NULL::integer AS match_score
  FROM moderation_notices n CROSS JOIN p LEFT JOIN spaces s ON s.id=n.target_space_id AND s.owner_id=n.user_id
  WHERE n.user_id=$1
  UNION ALL
  SELECT n.id, 'smart'::text, 'smart'::text, NULL::text, n.created_at, NOT n.is_read,
    ${s.archived}, ${s.expires}, ${s.expired},
    CASE WHEN s.status='active' THEN s.id ELSE NULL END, s.title::text, n.match_score::integer
  FROM smart_search_notifications n CROSS JOIN p LEFT JOIN spaces s ON s.id=n.space_id
  WHERE n.user_id=$1
), visible AS (SELECT * FROM records WHERE NOT expired)`;
const tally=`SELECT COUNT(*) FILTER (WHERE NOT archived)::int AS all, COUNT(*) FILTER (WHERE unread)::int AS unread,
 COUNT(*) FILTER (WHERE NOT archived AND kind='moderation')::int AS moderation,
 COUNT(*) FILTER (WHERE NOT archived AND kind='smart')::int AS smart, COUNT(*) FILTER (WHERE archived)::int AS archive FROM visible`;
const policySql=`(SELECT json_build_object('smart',smart,'moderation',moderation,'smartRetention',smart_retention,'moderationRetention',moderation_retention) FROM p) AS policy`;
async function list(userId,filter='all',page=1,summaryOnly=false){
 if(!FILTERS.has(filter)||!Number.isSafeInteger(page)||page<1||page>100000)throw invalid('فیلتر یا صفحه معتبر نیست.');
 await ensure(); await reconcileSmartSearchNotificationsForUser(userId);
 if(summaryOnly){const r=await query(records+`, totals AS (${tally}) SELECT row_to_json(totals) AS counts, ${policySql} FROM totals`,[userId]);return r.rows[0];}
 const r=await query(records+`, totals AS (${tally}), selected AS (
   SELECT * FROM visible WHERE CASE $2::text WHEN 'archive' THEN archived WHEN 'unread' THEN unread
   WHEN 'moderation' THEN NOT archived AND kind='moderation' WHEN 'smart' THEN NOT archived AND kind='smart' ELSE NOT archived END
   ORDER BY created_at DESC, kind, id DESC LIMIT $3 OFFSET $4)
   SELECT row_to_json(totals) AS counts, ${policySql}, COALESCE((SELECT json_agg(selected ORDER BY created_at DESC, kind, id DESC) FROM selected),'[]'::json) AS items FROM totals`,[userId,filter,PAGE_SIZE,(page-1)*PAGE_SIZE]);
 return {...r.rows[0],page,pageSize:PAGE_SIZE};
}
async function setArchive(userId,kind,id,archived){
 if(!['smart','moderation'].includes(kind)||!UUID.test(String(id))||typeof archived!=='boolean')throw invalid('درخواست آرشیو معتبر نیست.');
 await ensure();
 const table=kind==='smart'?'smart_search_notifications':'moderation_notices';
 const life=lifecycle(kind), read=kind==='smart'?'n.is_read':'n.read_at IS NOT NULL';
 const r=await query(`UPDATE ${table} n SET archive_override=$3, nt03_archived_at=CASE WHEN $3 THEN NOW() ELSE NULL END FROM notification_policy_nt03 p WHERE p.id=1 AND n.user_id=$1 AND n.id=$2 AND ${read} AND NOT ${life.expired} AND ${life.archived} IS DISTINCT FROM $3 RETURNING n.id`,[userId,id,archived]);
 if(!r.rowCount)throw invalid('اعلان در این وضعیت در دسترس نیست؛ فهرست را به‌روز کنید.',404);
}
async function markAllRead(userId){
 await ensure(); await query(`WITH m AS (UPDATE moderation_notices SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL RETURNING id)
 UPDATE smart_search_notifications SET is_read=TRUE, nt03_read_at=COALESCE(nt03_read_at,NOW()) WHERE user_id=$1 AND NOT is_read`,[userId]);
}
async function archiveRead(userId){
 await ensure(); await query(`WITH m AS (UPDATE moderation_notices n SET archive_override=TRUE, nt03_archived_at=NOW() FROM notification_policy_nt03 p WHERE p.id=1 AND n.user_id=$1 AND n.read_at IS NOT NULL AND NOT ${m.archived} RETURNING n.id)
 UPDATE smart_search_notifications n SET archive_override=TRUE, nt03_archived_at=NOW() FROM notification_policy_nt03 p WHERE p.id=1 AND n.user_id=$1 AND n.is_read AND NOT ${s.archived}`,[userId]);
}
module.exports={list,setArchive,markAllRead,archiveRead};
