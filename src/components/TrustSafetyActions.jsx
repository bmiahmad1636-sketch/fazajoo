import {useEffect,useState} from "react";
import {blockUser,createAbuseReport,getBlockStatus,unblockUser} from "../services/trustSafetyService";
import {showInSiteAlert,showInSiteConfirm} from "../utils/inSiteDialog";
import "./TrustSafetyActions.css";
const REASONS=[['fake','آگهی یا هویت جعلی'],['wrong_info','اطلاعات نادرست یا گمراه‌کننده'],['harassment','مزاحمت یا رفتار نامناسب'],['suspected_fraud','کلاهبرداری احتمالی'],['spam','پیام یا محتوای تکراری'],['inappropriate','محتوای نامناسب'],['other','سایر موارد']];
export default function TrustSafetyActions({targetType,targetId,reportedUserId,allowBlock=false,compact=false}){
 const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[details,setDetails]=useState(''),[busy,setBusy]=useState(false),[blockStatus,setBlockStatus]=useState(null);
 useEffect(()=>{
  if(!(allowBlock&&reportedUserId)) return undefined;
  let alive=true;
  const refresh=()=>getBlockStatus(reportedUserId).then((value)=>{if(alive)setBlockStatus(value)}).catch(()=>{});
  refresh();
  const onChanged=(event)=>{if(!event?.detail?.userId||event.detail.userId===reportedUserId)refresh();};
  window.addEventListener("fazajoo:block-status-changed",onChanged);
  return()=>{alive=false;window.removeEventListener("fazajoo:block-status-changed",onChanged);};
 },[allowBlock,reportedUserId]);
 async function submit(e){e.preventDefault();if(!reason)return showInSiteAlert('لطفاً دلیل گزارش را انتخاب کنید.');try{setBusy(true);const r=await createAbuseReport({targetType,targetId,reportedUserId,reason,details});setOpen(false);setReason('');setDetails('');showInSiteAlert(r.message||'گزارش ثبت شد.','گزارش تخلف');}catch(e){showInSiteAlert(e.message,'گزارش تخلف');}finally{setBusy(false)}}
 async function toggleBlock(){const currently=Boolean(blockStatus?.blockedByMe);const ok=await showInSiteConfirm(currently?'مسدودسازی این کاربر برداشته شود؟':'با مسدودکردن این کاربر، ارسال پیام بین شما متوقف می‌شود. ادامه می‌دهید؟',currently?'رفع مسدودسازی':'مسدود کردن کاربر');if(!ok)return;try{setBusy(true);const r=currently?await unblockUser(reportedUserId):await blockUser(reportedUserId);setBlockStatus(await getBlockStatus(reportedUserId));window.dispatchEvent(new CustomEvent('fazajoo:block-status-changed',{detail:{userId:reportedUserId}}));showInSiteAlert(r.message,currently?'رفع مسدودی کاربر':'مسدودسازی');}catch(e){showInSiteAlert(e.message);}finally{setBusy(false)}}
 return <div className={`trust-actions ${compact?'trust-actions--compact':''}`}>
   <button type="button" className="trust-actions__report" onClick={()=>setOpen(true)}>⚑ گزارش تخلف</button>
   {allowBlock&&reportedUserId&&<button type="button" className={`trust-actions__block ${blockStatus?.blockedByMe?'is-blocked':''}`} disabled={busy} onClick={toggleBlock}>{blockStatus?.blockedByMe?'رفع مسدودی کاربر':'⛔ مسدود کردن کاربر'}</button>}
   {open&&<div className="trust-modal" role="dialog" aria-modal="true"><div className="trust-modal__backdrop" onClick={()=>!busy&&setOpen(false)}/><form className="trust-modal__card" onSubmit={submit}><div className="trust-modal__head"><div><span>اعتماد و ایمنی فضاجو</span><h3>گزارش تخلف</h3></div><button type="button" onClick={()=>setOpen(false)} disabled={busy}>×</button></div><p>گزارش شما محرمانه برای تیم مدیریت فضاجو ارسال می‌شود.</p><label>دلیل گزارش<select value={reason} onChange={e=>setReason(e.target.value)} required><option value="">انتخاب کنید</option>{REASONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>توضیحات تکمیلی <small>(اختیاری)</small><textarea value={details} onChange={e=>setDetails(e.target.value)} maxLength={1000} placeholder="اگر لازم است جزئیات بیشتری بنویسید..."/></label><div className="trust-modal__footer"><button type="button" onClick={()=>setOpen(false)} disabled={busy}>انصراف</button><button className="primary" type="submit" disabled={busy}>{busy?'در حال ثبت...':'ثبت گزارش'}</button></div></form></div>}
 </div>;
}
