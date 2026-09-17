const crypto = require("crypto");
const { query } = require("../db/pool");

let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    await query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS moderation_mode VARCHAR(20) NOT NULL DEFAULT 'active'`);
    await query(`CREATE TABLE IF NOT EXISTS moderation_pair_blocks (
      user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_id UUID,
      reason VARCHAR(1000), created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_a,user_b), CHECK(user_a<>user_b)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS moderation_notices (
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_id UUID, notice_type VARCHAR(30) NOT NULL DEFAULT 'warning', message VARCHAR(1000) NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), read_at TIMESTAMPTZ
    )`);
    await query(`CREATE TABLE IF NOT EXISTS admin_direct_actions (
      id UUID PRIMARY KEY, admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action_type VARCHAR(40) NOT NULL, target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      target_chat_id UUID REFERENCES chats(id) ON DELETE SET NULL, target_space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
      related_user_id UUID REFERENCES users(id) ON DELETE SET NULL, reason_code VARCHAR(50) NOT NULL,
      note VARCHAR(1000) NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_direct_target ON admin_direct_actions(target_user_id,created_at DESC)`);
  })().catch(e => { schemaPromise=null; throw e; });
  return schemaPromise;
}
function pair(a,b){ return String(a)<String(b)?[a,b]:[b,a]; }
function maskPhone(phone){
  const value=String(phone||"").trim();
  if(/^09\d{9}$/.test(value)) return `${value.slice(-4)}***${value.slice(0,4)}`;
  return "کاربر فضاجو";
}
async function userLabel(userId){
  if(!userId) return "کاربر فضاجو";
  const r=await query(`SELECT phone FROM users WHERE id=$1 LIMIT 1`,[userId]);
  const masked=maskPhone(r.rows[0]?.phone);
  return masked==="کاربر فضاجو" ? masked : `کاربر \u2066${masked}\u2069`;
}
async function notice(userId,type,message,adminId){
  if(!userId) return;
  await query(`INSERT INTO moderation_notices(id,user_id,report_id,notice_type,message,created_by) VALUES($1,$2,NULL,$3,$4,$5)`,[crypto.randomUUID(),userId,type,message,adminId]);
}
async function searchUsers(q){
  await ensureSchema(); const s=String(q||"").trim(); if(s.length<2) return [];
  const r=await query(`SELECT id,phone,full_name,account_type,system_role,agency_status,is_active,created_at FROM users
    WHERE phone ILIKE $1 OR COALESCE(full_name,'') ILIKE $1 ORDER BY created_at DESC LIMIT 20`,[`%${s}%`]); return r.rows;
}
async function getUser(id){
  await ensureSchema();
  const u=(await query(`SELECT id,phone,full_name,account_type,system_role,agency_status,is_active,created_at FROM users WHERE id=$1`,[id])).rows[0];
  if(!u){const e=new Error("کاربر پیدا نشد.");e.status=404;throw e;}
  const spaces=(await query(`SELECT id,title,category,status,city,created_at FROM spaces WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 50`,[id])).rows;
  const chats=(await query(`SELECT c.id,c.space_id,c.owner_id,c.requester_id,c.moderation_mode,c.updated_at,s.title,
    CASE WHEN c.owner_id=$1 THEN c.requester_id ELSE c.owner_id END AS other_user_id,
    CASE WHEN c.owner_id=$1 THEN ur.full_name ELSE uo.full_name END AS other_name,
    CASE WHEN c.owner_id=$1 THEN ur.phone ELSE uo.phone END AS other_phone
    FROM chats c JOIN spaces s ON s.id=c.space_id JOIN users uo ON uo.id=c.owner_id JOIN users ur ON ur.id=c.requester_id
    WHERE c.owner_id=$1 OR c.requester_id=$1 ORDER BY c.updated_at DESC LIMIT 50`,[id])).rows;
  const history=(await query(`SELECT a.*,ad.full_name admin_name,ru.full_name related_name FROM admin_direct_actions a
    LEFT JOIN users ad ON ad.id=a.admin_id LEFT JOIN users ru ON ru.id=a.related_user_id
    WHERE a.target_user_id=$1 OR a.related_user_id=$1 ORDER BY a.created_at DESC LIMIT 200`,[id])).rows;
  return {user:u,spaces,chats,history};
}
async function act(adminId,p){
  await ensureSchema();
  const action=String(p.action||""); const targetUserId=p.targetUserId; const chatId=p.chatId||null; const spaceId=p.spaceId||null; const relatedUserId=p.relatedUserId||null;
  const reasonCode=String(p.reasonCode||"").trim(); const note=String(p.note||"").trim().slice(0,1000);
  const allowed=new Set(["warning","user_suspend","user_restore","chat_restrict","chat_restore","pair_block","pair_unblock","listing_disable","listing_enable"]);
  if(!allowed.has(action)){const e=new Error("اقدام مدیریتی معتبر نیست.");e.status=400;throw e;}
  if(!reasonCode){const e=new Error("علت اقدام را انتخاب کنید.");e.status=400;throw e;}
  if(note.length<3){const e=new Error("توضیح داخلی مدیر را وارد کنید.");e.status=400;throw e;}
  const target=(await query(`SELECT id,full_name,system_role FROM users WHERE id=$1`,[targetUserId])).rows[0];
  if(!target){const e=new Error("کاربر هدف پیدا نشد.");e.status=404;throw e;}
  if(target.system_role==="admin" && ["user_suspend","user_restore"].includes(action)){const e=new Error("تعلیق یا فعال‌سازی حساب مدیر از این بخش مجاز نیست.");e.status=403;throw e;}
  if(String(adminId)===String(targetUserId) && action==="user_suspend"){const e=new Error("مدیر نمی‌تواند حساب خودش را تعلیق کند.");e.status=403;throw e;}
  if(action==="warning") await notice(targetUserId,"warning","یک اخطار مدیریتی برای حساب شما در فضاجو ثبت شده است. لطفاً قوانین فضاجو را رعایت کنید.",adminId);
  if(action==="user_suspend") await query(`UPDATE users SET is_active=FALSE,auth_version=COALESCE(auth_version,1)+1,updated_at=NOW() WHERE id=$1`,[targetUserId]);
  if(action==="user_restore") await query(`UPDATE users SET is_active=TRUE,auth_version=COALESCE(auth_version,1)+1,updated_at=NOW() WHERE id=$1`,[targetUserId]);
  if(["chat_restrict","chat_restore"].includes(action)){
    if(!chatId){const e=new Error("گفتگو را انتخاب کنید.");e.status=400;throw e;}
    const c=(await query(`UPDATE chats SET moderation_mode=$3,updated_at=NOW() WHERE id=$1 AND (owner_id=$2 OR requester_id=$2) RETURNING owner_id,requester_id`,[chatId,targetUserId,action==="chat_restrict"?"blocked":"active"])).rows[0];
    if(!c){const e=new Error("گفتگوی انتخاب‌شده متعلق به این کاربر نیست.");e.status=400;throw e;}
    const ownerOther=await userLabel(c.requester_id);
    const requesterOther=await userLabel(c.owner_id);
    const ownerMsg=action==="chat_restrict" ? `ارسال پیام در گفتگوی شما با ${ownerOther} توسط مدیریت فضاجو موقتاً محدود شده است. این محدودیت فقط همین گفتگو را شامل می‌شود.` : `محدودیت مدیریتی گفتگوی شما با ${ownerOther} برداشته شد و امکان ارسال پیام در این گفتگو دوباره فعال است.`;
    const requesterMsg=action==="chat_restrict" ? `ارسال پیام در گفتگوی شما با ${requesterOther} توسط مدیریت فضاجو موقتاً محدود شده است. این محدودیت فقط همین گفتگو را شامل می‌شود.` : `محدودیت مدیریتی گفتگوی شما با ${requesterOther} برداشته شد و امکان ارسال پیام در این گفتگو دوباره فعال است.`;
    await notice(c.owner_id,action==="chat_restrict"?"chat_restricted":"chat_restored",ownerMsg,adminId); await notice(c.requester_id,action==="chat_restrict"?"chat_restricted":"chat_restored",requesterMsg,adminId);
  }
  if(["pair_block","pair_unblock"].includes(action)){
    if(!relatedUserId||relatedUserId===targetUserId){const e=new Error("کاربر دوم را انتخاب کنید.");e.status=400;throw e;} const [a,b]=pair(targetUserId,relatedUserId);
    if(action==="pair_block") await query(`INSERT INTO moderation_pair_blocks(user_a,user_b,report_id,reason,created_by) VALUES($1,$2,NULL,$3,$4) ON CONFLICT(user_a,user_b) DO UPDATE SET reason=EXCLUDED.reason,created_by=EXCLUDED.created_by,created_at=NOW()`,[a,b,note,adminId]);
    else await query(`DELETE FROM moderation_pair_blocks WHERE user_a=$1 AND user_b=$2`,[a,b]);
    const targetOther=await userLabel(relatedUserId);
    const relatedOther=await userLabel(targetUserId);
    const targetMsg=action==="pair_block" ? `ارتباط حساب شما با ${targetOther} به تصمیم مدیریت فضاجو موقتاً محدود شد. در حال حاضر امکان شروع یا ادامه گفتگو بین این دو حساب وجود ندارد.` : `محدودیت ارتباط مدیریتی حساب شما با ${targetOther} برداشته شد و امکان گفتگو دوباره فعال است.`;
    const relatedMsg=action==="pair_block" ? `ارتباط حساب شما با ${relatedOther} به تصمیم مدیریت فضاجو موقتاً محدود شد. در حال حاضر امکان شروع یا ادامه گفتگو بین این دو حساب وجود ندارد.` : `محدودیت ارتباط مدیریتی حساب شما با ${relatedOther} برداشته شد و امکان گفتگو دوباره فعال است.`;
    await notice(targetUserId,action==="pair_block"?"pair_blocked":"pair_unblocked",targetMsg,adminId); await notice(relatedUserId,action==="pair_block"?"pair_blocked":"pair_unblocked",relatedMsg,adminId);
  }
  if(["listing_disable","listing_enable"].includes(action)){
    if(!spaceId){const e=new Error("آگهی را انتخاب کنید.");e.status=400;throw e;}
    const r=await query(`UPDATE spaces SET status=$3,updated_at=NOW() WHERE id=$1 AND owner_id=$2 RETURNING id,title`,[spaceId,targetUserId,action==="listing_disable"?"inactive":"active"]);
    if(!r.rowCount){const e=new Error("آگهی انتخاب‌شده متعلق به این کاربر نیست.");e.status=400;throw e;}
    const listingTitle=String(r.rows[0]?.title || "آگهی شما").trim();
    const listingMessage=action==="listing_disable"
      ? `نمایش عمومی آگهی «${listingTitle}» توسط مدیریت فضاجو متوقف شد. آگهی حذف نشده و وضعیت آن در بخش «آگهی‌های من» قابل مشاهده است.`
      : `آگهی «${listingTitle}» توسط مدیریت فضاجو دوباره فعال شد و در صورت نداشتن محدودیت دیگری، امکان نمایش عمومی آن برقرار است.`;
    await notice(targetUserId,action==="listing_disable"?"listing_disabled":"listing_enabled",listingMessage,adminId);
  }
  const id=crypto.randomUUID();
  await query(`INSERT INTO admin_direct_actions(id,admin_id,action_type,target_user_id,target_chat_id,target_space_id,related_user_id,reason_code,note,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,[id,adminId,action,targetUserId,chatId,spaceId,relatedUserId,reasonCode,note,JSON.stringify({source:"direct_admin"})]);
  return {id,actionType:action};
}
module.exports={searchUsers,getUser,act};
