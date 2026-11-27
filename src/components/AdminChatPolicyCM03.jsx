import { useEffect, useState } from 'react';
import { getChatPolicyCM03, saveChatPolicyCM03 } from '../services/adminService';
import { showInSiteConfirm } from '../utils/inSiteDialog';
import './AdminNotificationPolicyNT03.css';
const fields=[['personalDays','کاربران عادی'],['agencyDays','مشاوران تأییدشده']];
const format=n=>Number(n).toLocaleString('fa-IR');
function date(v){try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return '—';}}
export default function AdminChatPolicyCM03(){
 const [data,setData]=useState(null),[form,setForm]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[success,setSuccess]=useState('');
 useEffect(()=>{let alive=true;setLoading(true);setError('');getChatPolicyCM03().then(r=>{if(alive){setData(r);setForm(Object.fromEntries(fields.map(([k])=>[k,String(r.policy[k])])));}}).catch(e=>{if(alive){setData(null);setError(e.message);}}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[revision]);
 const valid=fields.every(([k])=>/^\d+$/.test(form[k]||'')&&Number(form[k])>=1&&Number(form[k])<=3650);
 const dirty=Boolean(data)&&fields.some(([k])=>Number(form[k])!==data.policy[k]);
 async function submit(e){e.preventDefault();if(!valid||!dirty||busy||loading)return;setBusy(true);setError('');setSuccess('');try{if(!await showInSiteConfirm('مدت آرشیو خودکار تغییر می‌کند. ممکن است گفتگوهای قبلی بین صندوق و آرشیو جابه‌جا شوند؛ هیچ پیامی حذف نمی‌شود.','ذخیره سیاست گفتگوها'))return;await saveChatPolicyCM03({...Object.fromEntries(fields.map(([k])=>[k,Number(form[k])])),version:data.policy.version});setSuccess('تنظیمات ذخیره شد.');setRevision(n=>n+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="nt03-admin" dir="rtl" aria-label="سیاست نگهداری گفتگوها"><header><div><h2>مدیریت چرخه عمر گفتگوها</h2><p>مدت عدم فعالیت پیش از انتقال خودکار گفتگو به آرشیو شخصی هر کاربر.</p></div><button type="button" disabled={busy||loading} onClick={async()=>{if(!dirty||await showInSiteConfirm('تغییرات ذخیره نشده کنار گذاشته شوند؟','بارگذاری مجدد')){setSuccess('');setRevision(n=>n+1);}}}>بارگذاری مجدد</button></header>
 {error&&<p role="alert" className="nt03-admin-error">{error}</p>}{success&&<p role="status">{success}</p>}
 {loading?<p role="status">در حال دریافت تنظیمات…</p>:data&&<><form onSubmit={submit}><div className="nt03-admin-grid">{fields.map(([key,type])=><label key={key}><span>{type} · انتقال به آرشیو</span><div><input type="number" min="1" max="3650" step="1" required value={form[key]||''} disabled={busy} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/><span>روز</span></div></label>)}</div><p>گفتگوهای دارای پیام خوانده‌نشده یا محدودیت حقوقی و مدیریتی فعال می‌مانند. آرشیو تاریخ انقضا ندارد. هیچ پیامی با این تنظیمات حذف نمی‌شود.</p><button className="nt03-admin-save" disabled={!valid||!dirty||busy} type="submit">{busy?'در حال ذخیره…':'ذخیره تنظیمات'}</button></form><h3>آخرین تغییرات سیاست</h3>{data.audit.length?<ul>{data.audit.map(a=><li key={a.id}><strong>{date(a.created_at)}</strong><span>{fields.map(([k,t])=>`${t}: ${format(a.old_policy[k])} ← ${format(a.new_policy[k])}`).join(' | ')}</span></li>)}</ul>:<p>هنوز تغییری ثبت نشده است.</p>}</>}
 </section>;
}
