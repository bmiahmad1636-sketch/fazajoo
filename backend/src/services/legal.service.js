const crypto = require('crypto');
const { query } = require('../db/pool');

let ready;
async function ensureLegalSchema() {
  if (!ready) ready = (async () => {
    await query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS legal_mode VARCHAR(20) NOT NULL DEFAULT 'active'`);
    await query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`CREATE TABLE IF NOT EXISTS legal_system_settings (id SMALLINT PRIMARY KEY CHECK (id=1), global_chat_mode VARCHAR(20) NOT NULL DEFAULT 'active', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`INSERT INTO legal_system_settings (id,global_chat_mode) VALUES (1,'active') ON CONFLICT (id) DO NOTHING`);
    await query(`
      CREATE TABLE IF NOT EXISTS legal_cases (
        id UUID PRIMARY KEY,
        case_number VARCHAR(120) NOT NULL,
        authority VARCHAR(255) NOT NULL,
        order_date DATE,
        subject TEXT NOT NULL,
        scope_text TEXT,
        order_document_ref TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','archived')),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await query(`ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS order_notes TEXT`);
     await query(`ALTER TABLE legal_cases DROP CONSTRAINT IF EXISTS legal_cases_status_check`);
    await query(`UPDATE legal_cases SET status='archived' WHERE status='closed'`);
    await query(`ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_status_check CHECK (status IN ('open','archived'))`);
    await query(`ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS order_date_jalali VARCHAR(10)`);
    await query(`
      CREATE TABLE IF NOT EXISTS legal_actions (
        id UUID PRIMARY KEY,
        case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
        action_type VARCHAR(40) NOT NULL,
        target_type VARCHAR(20) NOT NULL,
        target_id UUID,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await query(`
      CREATE TABLE IF NOT EXISTS legal_audit_log (
        id UUID PRIMARY KEY,
        case_id UUID REFERENCES legal_cases(id) ON DELETE SET NULL,
        admin_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(80) NOT NULL,
        target_type VARCHAR(30),
        target_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await query(`CREATE INDEX IF NOT EXISTS idx_legal_audit_created ON legal_audit_log(created_at DESC)`);
    await query(`ALTER TABLE legal_actions ALTER COLUMN target_id TYPE TEXT USING target_id::text`);
    await query(`CREATE INDEX IF NOT EXISTS idx_legal_actions_case ON legal_actions(case_id, created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS video_action_history (
        id UUID PRIMARY KEY,
        space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        video_url TEXT,
        action_type VARCHAR(40) NOT NULL,
        source VARCHAR(30) NOT NULL,
        source_ref TEXT,
        previous_status VARCHAR(30),
        new_status VARCHAR(30),
        reason_code VARCHAR(120),
        note TEXT,
        actor_id UUID REFERENCES users(id),
        video_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await query(`CREATE INDEX IF NOT EXISTS idx_video_action_history_space ON video_action_history(space_id,created_at DESC)`);
  })().catch(e => { ready = null; throw e; });
  return ready;
}

async function audit({adminId, caseId=null, action, targetType=null, targetId=null, metadata={}}) {
  await ensureLegalSchema();
  await query(`INSERT INTO legal_audit_log (id, case_id, admin_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [crypto.randomUUID(), caseId, adminId, action, targetType, targetId ? String(targetId) : null, JSON.stringify(metadata)]);
}

async function listCases() { await ensureLegalSchema(); return (await query(`SELECT lc.*, u.full_name AS created_by_name, u.phone AS created_by_phone FROM legal_cases lc LEFT JOIN users u ON u.id=lc.created_by ORDER BY lc.created_at DESC`)).rows; }
async function createCase(adminId, body) {
  await ensureLegalSchema();
  const id = crypto.randomUUID();
  const caseNumber = String(body.caseNumber||'').trim(); const authority = String(body.authority||'').trim(); const subject = String(body.subject||'').trim();
  const orderDateJalali = String(body.orderDateJalali||'').trim();
  if (!caseNumber || !authority || !subject) { const e=new Error('شماره پرونده، مرجع و موضوع الزامی است.'); e.status=400; throw e; }
  if (orderDateJalali && !/^\d{4}\/\d{2}\/\d{2}$/.test(orderDateJalali)) { const e=new Error('تاریخ شمسی را به صورت ۱۴۰۵/۰۶/۰۸ وارد کنید.'); e.status=400; throw e; }
  const r=await query(`INSERT INTO legal_cases (id,case_number,authority,order_date_jalali,subject,scope_text,order_document_ref,order_notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id,caseNumber,authority,orderDateJalali||null,subject,String(body.scopeText||'').trim()||null,String(body.orderDocumentRef||'').trim()||null,String(body.orderNotes||'').trim()||null,adminId]);
  await audit({adminId,caseId:id,action:'case_created',metadata:{caseNumber,authority}}); return r.rows[0];
}
async function archiveCase(adminId,id){ await ensureLegalSchema(); const r=await query(`UPDATE legal_cases SET status='archived',updated_at=NOW() WHERE id=$1 RETURNING *`,[id]); if(!r.rows[0]){const e=new Error('پرونده پیدا نشد.');e.status=404;throw e;} await audit({adminId,caseId:id,action:'case_archived'}); return r.rows[0]; }
async function listAudit(caseId){ await ensureLegalSchema(); const r=await query(`SELECT l.*,u.full_name AS admin_name,u.phone AS admin_phone FROM legal_audit_log l LEFT JOIN users u ON u.id=l.admin_id WHERE ($1::uuid IS NULL OR l.case_id=$1) ORDER BY l.created_at DESC LIMIT 2000`,[caseId||null]); return r.rows; }


async function requireOpenCase(caseId){
  await ensureLegalSchema();
  const c=(await query(`SELECT * FROM legal_cases WHERE id=$1`,[caseId])).rows[0];
  if(!c){const e=new Error('ابتدا یک پرونده قضایی معتبر انتخاب کنید.');e.status=404;throw e;}
  if(c.status!=='open'){const e=new Error('پرونده انتخاب‌شده بایگانی شده است.');e.status=409;throw e;}
  return c;
}

async function applyAction(adminId, caseId, body){
  await ensureLegalSchema();
  const action=String(body.action||''); const targetType=String(body.targetType||''); const targetId=String(body.targetId||'').trim();
  const allowed=new Set(['chat_readonly','chat_block','chat_unblock','global_chat_block','global_chat_unblock','legal_hold_on','legal_hold_off','user_suspend','user_restore','space_disable','space_enable','video_disable','video_enable']);
  if(!allowed.has(action)||!['chat','user','space','system'].includes(targetType)||!targetId){const e=new Error('عملیات یا هدف معتبر نیست.');e.status=400;throw e;}
  await requireOpenCase(caseId);
  if(action==='chat_readonly') await query(`UPDATE chats SET legal_mode='readonly' WHERE id=$1`,[targetId]);
  if(action==='chat_block') await query(`UPDATE chats SET legal_mode='blocked' WHERE id=$1`,[targetId]);
  if(action==='chat_unblock') await query(`UPDATE chats SET legal_mode='active' WHERE id=$1`,[targetId]);
  if(action==='global_chat_block') await query(`UPDATE legal_system_settings SET global_chat_mode='blocked',updated_at=NOW() WHERE id=1`);
  if(action==='global_chat_unblock') await query(`UPDATE legal_system_settings SET global_chat_mode='active',updated_at=NOW() WHERE id=1`);
  if(action==='legal_hold_on') { if(targetType==='chat') await query(`UPDATE chats SET legal_hold=TRUE WHERE id=$1`,[targetId]); if(targetType==='space') await query(`UPDATE spaces SET legal_hold=TRUE WHERE id=$1`,[targetId]); }
  if(action==='legal_hold_off') { if(targetType==='chat') await query(`UPDATE chats SET legal_hold=FALSE WHERE id=$1`,[targetId]); if(targetType==='space') await query(`UPDATE spaces SET legal_hold=FALSE WHERE id=$1`,[targetId]); }
  if(action==='user_suspend') await query(`UPDATE users SET is_active=FALSE WHERE id=$1`,[targetId]);
  if(action==='user_restore') await query(`UPDATE users SET is_active=TRUE WHERE id=$1`,[targetId]);
  if(action==='space_disable') await query(`UPDATE spaces SET status='inactive', legal_hold=TRUE WHERE id=$1`,[targetId]);
  if(action==='space_enable') await query(`UPDATE spaces SET status='active', legal_hold=FALSE WHERE id=$1`,[targetId]);
  if(action==='video_disable'||action==='video_enable') {
    const row=(await query(`SELECT media_items FROM spaces WHERE id=$1 LIMIT 1`,[targetId])).rows[0];
    if(!row){const e=new Error('آگهی پیدا نشد.');e.status=404;throw e;}
    const items=Array.isArray(row.media_items)?row.media_items:[]; const currentVideo=items.find(item=>item?.type==='video');
    if(!currentVideo){const e=new Error('این آگهی ویدئو ندارد.');e.status=409;throw e;}
    const currentStatus=String(currentVideo.status||'ready');
    if(action==='video_disable' && currentStatus==='blocked'){const e=new Error('نمایش این ویدئو قبلاً متوقف شده است؛ دستور تکراری ثبت نمی‌شود.');e.status=409;throw e;}
    if(action==='video_enable' && currentStatus!=='blocked'){const e=new Error('نمایش این ویدئو در حال حاضر متوقف نیست.');e.status=409;throw e;}
    const status=action==='video_disable'?'blocked':'ready';
    const now=new Date().toISOString();
    const next=items.map(item=>item?.type!=='video'?item:{...item,status,legalActionAt:now,legalActionBy:adminId});
    await query(`UPDATE spaces SET media_items=$2::jsonb,updated_at=NOW() WHERE id=$1`,[targetId,JSON.stringify(next)]);
    await query(`INSERT INTO video_action_history(id,space_id,video_url,action_type,source,source_ref,previous_status,new_status,note,actor_id,video_snapshot)
      VALUES($1,$2,$3,$4,'legal_case',$5,$6,$7,$8,$9,$10::jsonb)`,
      [crypto.randomUUID(),targetId,currentVideo.url||null,action,caseId,currentStatus,status,String(body.note||'').trim(),adminId,JSON.stringify(currentVideo)]);
  }
  await query(`INSERT INTO legal_actions (id,case_id,action_type,target_type,target_id,details,created_by) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,[crypto.randomUUID(),caseId,action,targetType,targetId,JSON.stringify({note:String(body.note||'').trim()}),adminId]);
  await audit({adminId,caseId,action,targetType,targetId,metadata:{note:String(body.note||'').trim()}}); return {ok:true};
}


async function getVideoEvidenceDownload(adminId, caseId, spaceId){
  await requireOpenCase(caseId);
  await ensureLegalSchema();
  const row=(await query(`SELECT id,owner_id,title,media_items,legal_hold FROM spaces WHERE id=$1 LIMIT 1`,[spaceId])).rows[0];
  if(!row){const e=new Error('آگهی پیدا نشد.');e.status=404;throw e;}
  const items=Array.isArray(row.media_items)?row.media_items:[];
  const video=items.find(item=>item?.type==='video');
  if(!video?.url){const e=new Error('برای این آگهی فایل ویدئو ثبت نشده است.');e.status=404;throw e;}
  let userId='',filename='';
  try{
    const parsed=new URL(String(video.url),'http://fazajoo.local');
    const marker='/api/uploads/ad-video/';
    const pos=parsed.pathname.indexOf(marker);
    if(pos<0)throw new Error('bad-url');
    const parts=parsed.pathname.slice(pos+marker.length).split('/').filter(Boolean).map(decodeURIComponent);
    if(parts.length!==2)throw new Error('bad-url');
    [userId,filename]=parts;
  }catch{
    const e=new Error('مسیر فایل اصلی ویدئو معتبر نیست.');e.status=409;throw e;
  }
  if(String(userId)!==String(row.owner_id) || !filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')){
    const e=new Error('مالکیت یا مسیر فایل ویدئو قابل تأیید نیست.');e.status=403;throw e;
  }
  await audit({adminId,caseId,action:'legal_video_evidence_download',targetType:'space',targetId:spaceId,metadata:{videoUrl:video.url,status:video.status||'ready',filename}});
  return {userId:String(row.owner_id),filename,video,title:row.title||''};
}

async function exportUserData(adminId, caseId, userId, from, to, scope='both'){
  await requireOpenCase(caseId);
  await ensureLegalSchema();
  const caseRow=(await query(`SELECT id,case_number,authority,order_date_jalali,subject,scope_text,order_document_ref,order_notes FROM legal_cases WHERE id=$1`,[caseId])).rows[0];
  const user=(await query(`SELECT id,phone,full_name,account_type,system_role,agency_status,is_active,created_at FROM users WHERE id=$1`,[userId])).rows[0]; if(!user){const e=new Error('کاربر پیدا نشد.');e.status=404;throw e;}

  // Judicial exports must always have an explicit, valid time window.
  if(!from || !to){const e=new Error('برای خروجی قضایی، بازه «از تاریخ» و «تا تاریخ» الزامی است.');e.status=400;throw e;}
  const fromDate=new Date(from),toDate=new Date(to);
  if(Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())){const e=new Error('بازه زمانی خروجی معتبر نیست.');e.status=400;throw e;}
  if(fromDate>toDate){const e=new Error('«از تاریخ» نمی‌تواند بعد از «تا تاریخ» باشد.');e.status=400;throw e;}

  const messages=scope==='spaces'?[]:(await query(`SELECT m.id,m.chat_id,m.sender_id,m.text,m.created_at,m.read_at,c.space_id,c.owner_id,c.requester_id,c.chat_type
    FROM messages m JOIN chats c ON c.id=m.chat_id
    WHERE (c.owner_id=$1 OR c.requester_id=$1) AND m.created_at >= $2::timestamptz AND m.created_at <= $3::timestamptz
    ORDER BY m.created_at ASC`,[userId,from,to])).rows;

  const spaceRows=scope==='messages'?[]:(await query(`SELECT to_jsonb(s) AS raw FROM spaces s
    WHERE s.owner_id=$1 AND s.created_at >= $2::timestamptz AND s.created_at <= $3::timestamptz
    ORDER BY s.created_at ASC`,[userId,from,to])).rows;

  const imageKeys=new Set(['image','imageurl','image_url','images','image_urls','imageurls','gallery','photos','photo_urls','photourls','main_image','mainimage','main_image_url','mainimageurl']);
  const collectImageUrls=(value,out=new Set(),depth=0)=>{
    if(depth>5||value==null)return [...out];
    if(typeof value==='string'){const v=value.trim();if(/^https?:\/\//i.test(v)||/^\/api\/uploads\/ad-image\//i.test(v))out.add(v);return [...out];}
    if(Array.isArray(value)){for(const item of value)collectImageUrls(item,out,depth+1);return [...out];}
    if(typeof value==='object'){for(const [k,v] of Object.entries(value)){const key=String(k).toLowerCase().replace(/[\s-]/g,'_');if(imageKeys.has(key)||key.includes('image')||key.includes('photo')||key.includes('gallery'))collectImageUrls(v,out,depth+1);else if(depth<2&&typeof v==='object')collectImageUrls(v,out,depth+1);}}
    return [...out];
  };
  const spaces=spaceRows.map(({raw})=>{
    const images=collectImageUrls(raw);
    return {id:raw.id,title:raw.title,city:raw.city,category:raw.category,listing_type:raw.listing_type,status:raw.status,created_at:raw.created_at,updated_at:raw.updated_at,images,imageCount:images.length,mediaItems:Array.isArray(raw.media_items)?raw.media_items:[],video:(Array.isArray(raw.media_items)?raw.media_items:[]).find(item=>item?.type==='video')||null};
  });

  // History is filtered by the history event timestamp itself. This does not change video storage/download behavior.
  let videoHistory=[];
  if(scope!=='messages'){
    videoHistory=(await query(`SELECT vah.*,u.full_name AS actor_name,u.phone AS actor_phone
      FROM video_action_history vah
      JOIN spaces s ON s.id=vah.space_id
      LEFT JOIN users u ON u.id=vah.actor_id
      WHERE s.owner_id=$1 AND vah.created_at >= $2::timestamptz AND vah.created_at <= $3::timestamptz
      ORDER BY vah.created_at ASC`,[userId,from,to])).rows;
  }

  const evidence={exportVersion:4,generatedAt:new Date().toISOString(),caseId,case:caseRow,user,filters:{from,to,scope},spaces,videoHistory,messages};
  const evidenceText=JSON.stringify(evidence,null,2);
  const sha256=crypto.createHash('sha256').update(evidenceText,'utf8').digest('hex');
  const payload={...evidence,integrity:{algorithm:'SHA-256',sha256,scope:'evidence payload without integrity field'}};
  const text=JSON.stringify(payload,null,2);
  await audit({adminId,caseId,action:'user_data_export',targetType:'user',targetId:userId,metadata:{from,to,sha256,messageCount:messages.length,spaceCount:spaces.length,videoHistoryCount:videoHistory.length}});
  return {text,sha256};
}

function normalizePhone(value='') {
  const fa='۰۱۲۳۴۵۶۷۸۹', ar='٠١٢٣٤٥٦٧٨٩';
  let v=String(value).trim().replace(/[۰-۹]/g,d=>String(fa.indexOf(d))).replace(/[٠-٩]/g,d=>String(ar.indexOf(d))).replace(/\D/g,'');
  if(v.startsWith('98') && v.length===12) v='0'+v.slice(2);
  if(v.startsWith('9') && v.length===10) v='0'+v;
  return v;
}
async function exportUserDataByPhone(adminId, caseId, phone, from, to, scope='both'){
  await requireOpenCase(caseId);
  await ensureLegalSchema();
  const normalized=normalizePhone(phone);
  if(!/^09\d{9}$/.test(normalized)){const e=new Error('شماره موبایل معتبر وارد کنید.');e.status=400;throw e;}
  const r=await query(`SELECT id FROM users WHERE regexp_replace(COALESCE(phone,''),'[^0-9]','','g')=$1 LIMIT 1`,[normalized]);
  if(!r.rows[0]){const e=new Error('کاربری با این شماره موبایل پیدا نشد.');e.status=404;throw e;}
  return exportUserData(adminId,caseId,r.rows[0].id,from,to,scope);
}


async function lookupByPhone(adminId, caseId, phone){
  await requireOpenCase(caseId);
  const normalized=normalizePhone(phone);
  if(!/^09\d{9}$/.test(normalized)){const e=new Error('شماره موبایل معتبر وارد کنید.');e.status=400;throw e;}
  const user=(await query(`SELECT id,phone,full_name,account_type,agency_status,is_active FROM users WHERE regexp_replace(COALESCE(phone,''),'[^0-9]','','g')=$1 LIMIT 1`,[normalized])).rows[0];
  if(!user){const e=new Error('کاربری با این شماره موبایل پیدا نشد.');e.status=404;throw e;}
  const chats=(await query(`SELECT c.id,c.space_id,c.chat_type,c.legal_mode,s.title AS space_title, GREATEST(MAX(m.created_at),c.created_at) AS last_activity FROM chats c LEFT JOIN spaces s ON s.id=c.space_id LEFT JOIN messages m ON m.chat_id=c.id WHERE c.owner_id=$1 OR c.requester_id=$1 GROUP BY c.id,s.title ORDER BY last_activity DESC NULLS LAST LIMIT 100`,[user.id])).rows;
  const spaces=(await query(`SELECT id,title,city,status,listing_type FROM spaces WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100`,[user.id])).rows;
  await audit({adminId,caseId,action:'legal_target_lookup',targetType:'user',targetId:user.id,metadata:{phone:normalized}});
  return {user,chats,spaces};
}

module.exports={ensureLegalSchema,listCases,createCase,archiveCase,listAudit,applyAction,exportUserData,exportUserDataByPhone,lookupByPhone,getVideoEvidenceDownload};
