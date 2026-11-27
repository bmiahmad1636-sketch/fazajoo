'use strict';
const {pool,query}=require('../db/pool');
const {normalizeDocument,fromStorage,publicDocument,changedKeys,bad}=require('./siteContentCMS01.validation');
const select='SELECT version,draft,published,updated_at,published_at FROM site_content_cms01 WHERE id=1';
function state(row) { if(!row) throw bad('ابتدا مهاجرت CMS01 را اجرا کنید.',503); return {version:row.version,draft:fromStorage(row.draft),published:fromStorage(row.published),updatedAt:row.updated_at,publishedAt:row.published_at}; }
async function readPublic() {const row=(await query('SELECT published,published_at FROM site_content_cms01 WHERE id=1')).rows[0]; if(!row) throw bad('محتوا در دسترس نیست.',503); return {ok:true,content:publicDocument(row.published),publishedAt:row.published_at};}
async function readAdmin() {const current=state((await query(select)).rows[0]); const audit=(await query('SELECT id,actor_id,action,version,changed_keys,created_at FROM site_content_audit_cms01 ORDER BY id DESC LIMIT 30')).rows; return {ok:true,...current,audit};}
async function mutate(actor,body,action) {
  if(!body || !Number.isSafeInteger(body.version) || body.version<1 || Object.keys(body).some(k=>!(action==='save'?['version','draft']:['version','confirm']).includes(k))) throw bad('نسخه درخواست معتبر نیست.');
  if(action==='publish' && body.confirm!==true) throw bad('تأیید انتشار لازم است.');
  const nextDraft=action==='save'?normalizeDocument(body.draft):null;
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const old=state((await client.query(select+' FOR UPDATE')).rows[0]);
    if(old.version!==body.version) throw bad('اطلاعات توسط نشست دیگری تغییر کرده است؛ ابتدا دوباره بارگذاری کنید.',409);
    const next=action==='save'?nextDraft:normalizeDocument(old.draft,{publish:true});
    const keys=changedKeys(action==='save'?old.draft:old.published,next);
    if(keys.length) {
      if(action==='save') await client.query('UPDATE site_content_cms01 SET draft=$1::jsonb,version=version+1,updated_at=NOW() WHERE id=1',[JSON.stringify(next)]);
      else await client.query('UPDATE site_content_cms01 SET published=$1::jsonb,version=version+1,updated_at=NOW(),published_at=NOW() WHERE id=1',[JSON.stringify(next)]);
      await client.query('INSERT INTO site_content_audit_cms01(actor_id,action,version,changed_keys) VALUES($1,$2,$3,$4)',[actor,action,old.version+1,keys]);
    }
    // Return state from the same transaction, avoiding a race with another editor.
    const current=state((await client.query(select)).rows[0]);
    const audit=(await client.query('SELECT id,actor_id,action,version,changed_keys,created_at FROM site_content_audit_cms01 ORDER BY id DESC LIMIT 30')).rows;
    await client.query('COMMIT'); return {ok:true,...current,audit};
  } catch(e) {await client.query('ROLLBACK'); throw e;} finally {client.release();}
}
module.exports={readPublic,readAdmin,save:(actor,body)=>mutate(actor,body,'save'),publish:(actor,body)=>mutate(actor,body,'publish')};
