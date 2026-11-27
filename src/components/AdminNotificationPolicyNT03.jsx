import { useEffect, useState } from 'react';
import { getNotificationPolicyNT03, saveNotificationPolicyNT03 } from '../services/adminService';
import './AdminNotificationPolicyNT03.css';
import PolicyAuditADM07 from './PolicyAuditADM07';
const fields=[['smart','خبرم کن','انتقال به آرشیو'],['smartRetention','خبرم کن','ماندگاری در آرشیو'],['moderation','اعتماد و ایمنی','انتقال به آرشیو'],['moderationRetention','اعتماد و ایمنی','ماندگاری در آرشیو']];
const format=n=>Number(n).toLocaleString('fa-IR');
function date(v){try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return '—';}}
export default function AdminNotificationPolicyNT03(){
 const [data,setData]=useState(null),[form,setForm]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[success,setSuccess]=useState('');
 useEffect(()=>{let alive=true;setLoading(true);setError('');getNotificationPolicyNT03().then(r=>{if(alive){setData(r);setForm(Object.fromEntries(fields.map(([k])=>[k,String(r.policy[k])])));}}).catch(e=>{if(alive){setData(null);setError(e.message);}}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[revision]);
 const valid=fields.every(([k])=>/^\d+$/.test(form[k]||'')&&Number(form[k])>=1&&Number(form[k])<=3650);
 const dirty=Boolean(data)&&fields.some(([k])=>Number(form[k])!==data.policy[k]);
 async function submit(e){e.preventDefault();if(!valid||!dirty||busy||loading)return;if(!window.confirm('تغییر مدت‌ها روی اعلان‌های قبلی هم اثر دارد و ممکن است اعلان‌های منقضی دوباره قابل مشاهده شوند. ذخیره شود؟'))return;setBusy(true);setError('');setSuccess('');try{await saveNotificationPolicyNT03({...Object.fromEntries(fields.map(([k])=>[k,Number(form[k])])),version:data.policy.version});setSuccess('تنظیمات ذخیره شد.');setRevision(n=>n+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="nt03-admin" dir="rtl" aria-label="سیاست نگهداری اعلان‌ها"><header><div><h2>مدیریت چرخه عمر اعلان‌ها</h2><p>مدت نمایش اعلان‌ها و آرشیو کاربران را تعیین کنید.</p></div><button type="button" disabled={busy||loading} onClick={()=>{if(!dirty||window.confirm('تغییرات ذخیره نشده کنار گذاشته شوند؟')){setSuccess('');setRevision(n=>n+1);}}}>بارگذاری مجدد</button></header>
 {error&&<p role="alert" className="nt03-admin-error">{error}</p>}{success&&<p role="status">{success}</p>}
 {loading?<p role="status">در حال دریافت تنظیمات…</p>:data&&<><form onSubmit={submit} className="adm07-policy-form"><div className="adm07-form-heading"><h3>مدت‌های نگهداری</h3><span>از ۱ تا ۳۶۵۰ روز</span></div><div className="nt03-admin-grid">{fields.map(([key,type,label])=><label key={key}><span>{type} · {label}</span><div><input type="number" min="1" max="3650" step="1" required value={form[key]||''} disabled={busy} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/><span>روز</span></div></label>)}</div><p>اعلان خوانده‌نشده منقضی نمی‌شود. سوابق دیتابیس حذف نمی‌شوند. اعلان‌های بازگردانی‌شده تا آرشیو مجدد در صندوق می‌مانند.</p><div className="adm07-save-row"><span>{dirty?"تغییرات هنوز ذخیره نشده‌اند.":"مقادیر فعلی با آخرین اطلاعات دریافت‌شده یکسان‌اند."}</span><button className="nt03-admin-save" disabled={!valid||!dirty||busy} type="submit">{busy?'در حال ذخیره…':'ذخیره تنظیمات'}</button></div></form><PolicyAuditADM07 entries={data.audit} fields={fields} date={date} format={format} /></>}
 </section>;
}
