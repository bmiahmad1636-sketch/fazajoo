export const labels = {
  warning: 'اخطار مستقیم', user_suspend: 'تعلیق حساب', user_restore: 'رفع تعلیق حساب',
  chat_restrict: 'محدودکردن گفتگو', chat_restore: 'رفع محدودیت گفتگو',
  pair_block: 'قطع ارتباط دو کاربر', pair_unblock: 'رفع قطع ارتباط',
  listing_disable: 'غیرفعال‌کردن آگهی', listing_enable: 'فعال‌کردن آگهی',
  video_disable: 'توقف نمایش ویدئو', video_enable: 'فعال‌کردن ویدئو',
};
export const reasons = [ ['policy_violation','نقض قوانین فضاجو'], ['harassment','مزاحمت یا رفتار نامناسب'], ['spam','اسپم یا پیام‌های تکراری'], ['fraud_risk','رفتار مشکوک یا خطر کلاهبرداری'], ['fake_info','اطلاعات یا هویت مشکوک'], ['listing_issue','تخلف مرتبط با آگهی'], ['safety','حفاظت از ایمنی کاربران'], ['other','سایر دلایل مدیریتی'] ];
export const groups = [ ['حساب کاربری',['warning','user_suspend','user_restore']], ['گفتگو و ارتباط',['chat_restrict','chat_restore','pair_block','pair_unblock']], ['آگهی و رسانه',['listing_disable','listing_enable','video_disable','video_enable']] ];
export function normalizeSearch(value) {
  return String(value ?? '').trim().replace(/[۰-۹٠-٩]/g, ch=>String(ch.charCodeAt(0)-(ch.charCodeAt(0)>=1776?1776:1632)));
}
export const targetKind = action => action.startsWith('pair_') ? 'relatedUserId' : action.startsWith('chat_') ? 'chatId' : /^(listing|video)_/.test(action) ? 'spaceId' : null;
export const reasonLabel = code => reasons.find(([key])=>key===code)?.[1] || code || '—';
export const faDate = value => { const d=new Date(value); return value && Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeStyle:'short'}).format(d) : '—'; };
export const videoStatus = space => { const v=Array.isArray(space.media_items)?space.media_items.find(m=>m?.type==='video'):null; return v ? (v.status==='blocked'?'نمایش متوقف':'ویدئو دارد') : 'بدون ویدئو'; };
export function targetsFor(data, action) {
  const kind=targetKind(action);
  if(kind==='chatId') return (data.chats||[]).map(c=>({id:c.id,label:`${c.title||'گفتگو'} — ${c.other_name||c.other_phone||'کاربر'} — ${c.moderation_mode==='blocked'?'محدود':'فعال'}`}));
  if(kind==='spaceId') return (data.spaces||[]).filter(s=>!action.startsWith('video_')||videoStatus(s)!=='بدون ویدئو').map(s=>({id:s.id,label:`${s.title||'آگهی'} — ${s.status||'—'} — ${videoStatus(s)}`}));
  if(kind==='relatedUserId') return [...new Map((data.chats||[]).filter(c=>c.other_user_id&&c.other_user_id!==data.user.id).map(c=>[c.other_user_id,c])).values()].map(c=>({id:c.other_user_id,label:`${c.other_name||'کاربر فضاجو'} — ${c.other_phone||'—'}`}));
  return [];
}
export function buildReview(data, action, reasonCode, note, targetId) {
  if(!data?.user?.id || !Object.hasOwn(labels,action)) throw new Error('نوع اقدام معتبر نیست.');
  if(data.user.system_role==='admin' && ['user_suspend','user_restore'].includes(action)) throw new Error('تغییر وضعیت حساب مدیر از این بخش مجاز نیست.');
  if(!reasons.some(([key])=>key===reasonCode)) throw new Error('علت اقدام را انتخاب کنید.');
  const clean=String(note??'').trim();
  if(clean.length<3||clean.length>1000) throw new Error('توضیح داخلی باید بین ۳ تا ۱۰۰۰ نویسه باشد.');
  const kind=targetKind(action), target=targetsFor(data,action).find(t=>t.id===targetId);
  if(kind&&!target) throw new Error('هدف معتبر را از پرونده همین کاربر انتخاب کنید.');
  return {payload:{action,targetUserId:data.user.id,reasonCode,note:clean,chatId:kind==='chatId'?targetId:null,spaceId:kind==='spaceId'?targetId:null,relatedUserId:kind==='relatedUserId'?targetId:null},targetLabel:kind?target.label:null};
}
