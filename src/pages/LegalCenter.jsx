import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {getLegalCases,createLegalCase,closeLegalCase,getLegalAudit,applyLegalAction,exportLegalUserDataByPhone} from '../services/LegalService';
import './LegalCenter.css';

const faToEn=(v='')=>String(v).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const cleanJalali=(v='')=>faToEn(v).replace(/[^0-9/]/g,'').slice(0,10);
const cleanJalaliDateTime=(v='')=>faToEn(v).replace(/[^0-9/: ]/g,'').slice(0,16);

function div(a,b){return ~~(a/b)}
function mod(a,b){return a-~~(a/b)*b}
function jalCal(jy){
 const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
 const bl=breaks.length,gy=jy+621;let leapJ=-14,jp=breaks[0],jm,jump,n,i;
 if(jy<jp||jy>=breaks[bl-1])throw new Error('تاریخ شمسی معتبر نیست.');
 for(i=1;i<bl;i+=1){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ+=div(jump,33)*8+div(mod(jump,33),4);jp=jm}
 n=jy-jp;leapJ+=div(n,33)*8+div(mod(n,33)+3,4);if(mod(jump,33)===4&&jump-n===4)leapJ+=1;
 const leapG=div(gy,4)-div((div(gy,100)+1)*3,4)-150, march=20+leapJ-leapG;
 if(jump-n<6)n=n-jump+div(jump+4,33)*33;let leap=mod(mod(n+1,33)-1,4);if(leap===-1)leap=4;
 return {leap,gy,march}
}
function g2d(gy,gm,gd){let d=div((gy+div(gm-8,6)+100100)*1461,4)+div(153*mod(gm+9,12)+2,5)+gd-34840408;d=d-div(div(gy+100100+div(gm-8,6),100)*3,4)+752;return d}
function d2g(jdn){let j=4*jdn+139361631;j=j+div(div(4*jdn+183187720,146097)*3,4)*4-3908;const i=div(mod(j,1461),4)*5+308,gd=div(mod(i,153),5)+1,gm=mod(div(i,153),12)+1,gy=div(j,1461)-100100+div(8-gm,6);return {gy,gm,gd}}
function j2d(jy,jm,jd){const r=jalCal(jy);return g2d(r.gy,3,r.march)+(jm-1)*31-div(jm,7)*(jm-7)+jd-1}
function toGregorian(jy,jm,jd){return d2g(j2d(jy,jm,jd))}
function jalaliDateTimeToIso(value,endOfDay=false){
 if(!value)return '';
 const v=faToEn(value).trim();
 const m=v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
 if(!m)throw new Error('تاریخ را مثل ۱۴۰۵/۰۶/۰۸ ۱۸:۳۰ وارد کنید.');
 const jy=+m[1],jm=+m[2],jd=+m[3];
 if(jm<1||jm>12||jd<1||jd>31||(jm>6&&jd>30))throw new Error('تاریخ شمسی معتبر نیست.');
 const {gy,gm,gd}=toGregorian(jy,jm,jd);
 const hh=m[4]!==undefined?+m[4]:(endOfDay?23:0),mm=m[5]!==undefined?+m[5]:(endOfDay?59:0);
 if(hh<0||hh>23||mm<0||mm>59)throw new Error('ساعت معتبر نیست.');
 const pad=n=>String(n).padStart(2,'0');
 return `${gy}-${pad(gm)}-${pad(gd)}T${pad(hh)}:${pad(mm)}:00+03:30`;
}

export default function LegalCenter(){
 const [cases,setCases]=useState([]),[selected,setSelected]=useState(''),[logs,setLogs]=useState([]),[msg,setMsg]=useState('');
 const [form,setForm]=useState({caseNumber:'',authority:'',orderDateJalali:'',subject:'',scopeText:'',orderDocumentRef:''});
 const [action,setAction]=useState({action:'chat_readonly',targetType:'chat',targetId:'',note:''});
 const [exp,setExp]=useState({phone:'',from:'',to:''});
 const isGlobal=useMemo(()=>action.action.startsWith('global_chat_'),[action.action]);
 async function load(){const c=await getLegalCases();setCases(c);if(!selected&&c[0])setSelected(c[0].id)}
 useEffect(()=>{load().catch(e=>setMsg(e.message))},[]);
 useEffect(()=>{if(selected)getLegalAudit(selected).then(setLogs).catch(e=>setMsg(e.message));},[selected]);
 useEffect(()=>{if(isGlobal)setAction(a=>({...a,targetType:'system',targetId:''}));},[isGlobal]);
 async function submit(e){e.preventDefault();try{await createLegalCase(form);setForm({caseNumber:'',authority:'',orderDateJalali:'',subject:'',scopeText:'',orderDocumentRef:''});await load();setMsg('پرونده ثبت شد.')}catch(e){setMsg(e.message)}}
 async function runAction(){try{await applyLegalAction(selected,{...action,targetType:isGlobal?'system':action.targetType,targetId:isGlobal?'global-chat':action.targetId});setMsg('دستور ثبت و اعمال شد.');setLogs(await getLegalAudit(selected));}catch(e){setMsg(e.message)}}
 async function download(){try{const fromIso=jalaliDateTimeToIso(exp.from,false),toIso=jalaliDateTimeToIso(exp.to,true);const r=await exportLegalUserDataByPhone(selected,exp.phone,fromIso,toIso);const u=URL.createObjectURL(r.blob);const a=document.createElement('a');a.href=u;a.download=`fazajoo-legal-${faToEn(exp.phone)}.json`;a.click();URL.revokeObjectURL(u);setMsg(`خروجی ساخته شد${r.sha256?` — SHA-256: ${r.sha256}`:''}`)}catch(e){setMsg(e.message)}}
 return <main className="legal"><div className="legal__head"><div><h1>امور حقوقی و دستورات قضایی</h1><p>ثبت پرونده، حفاظت داده، محدودسازی و خروجی مستند</p></div><Link to="/admin">بازگشت به مدیریت</Link></div>{msg&&<div className="legal__msg">{msg}</div>}
 <div className="legal__grid"><section className="legal__card"><h2>پرونده جدید</h2><form onSubmit={submit} className="legal__form"><input placeholder="شماره پرونده / دستور" value={form.caseNumber} onChange={e=>setForm({...form,caseNumber:e.target.value})}/><input placeholder="مرجع صادرکننده" value={form.authority} onChange={e=>setForm({...form,authority:e.target.value})}/><label>تاریخ دستور (شمسی)<input inputMode="numeric" placeholder="مثلاً ۱۴۰۵/۰۶/۰۸" value={form.orderDateJalali} onChange={e=>setForm({...form,orderDateJalali:cleanJalali(e.target.value)})}/></label><input placeholder="موضوع دستور" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/><textarea placeholder="محدوده دقیق دستور" value={form.scopeText} onChange={e=>setForm({...form,scopeText:e.target.value})}/><input placeholder="مرجع فایل دستور / شماره بایگانی" value={form.orderDocumentRef} onChange={e=>setForm({...form,orderDocumentRef:e.target.value})}/><button>ثبت پرونده</button></form></section>
 <section className="legal__card"><h2>پرونده‌ها</h2><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">انتخاب پرونده</option>{cases.map(c=><option key={c.id} value={c.id}>{c.case_number} — {c.authority}{c.order_date_jalali?` — ${c.order_date_jalali}`:''} — {c.status==='open'?'باز':'بسته'}</option>)}</select>{selected&&<button className="legal__muted" onClick={async()=>{await closeLegalCase(selected);await load();setMsg('پرونده بسته شد.')}}>بستن پرونده</button>}</section>
 <section className="legal__card"><h2>اعمال دستور</h2><select value={action.action} onChange={e=>setAction({...action,action:e.target.value})}><optgroup label="دستور روی یک گفتگو"><option value="chat_readonly">چت فقط‌خواندنی</option><option value="chat_block">مسدودکردن چت</option><option value="chat_unblock">رفع مسدودی چت</option></optgroup><optgroup label="دستور عمومی برای همه گفتگوها"><option value="global_chat_readonly">همه چت‌ها فقط‌خواندنی</option><option value="global_chat_block">توقف ارسال پیام در کل فضاجو</option><option value="global_chat_unblock">رفع محدودیت عمومی چت</option></optgroup><optgroup label="سایر دستورات"><option value="legal_hold_on">فعال‌سازی حفاظت قضایی</option><option value="legal_hold_off">پایان حفاظت قضایی</option><option value="user_suspend">تعلیق حساب</option><option value="user_restore">بازگردانی حساب</option><option value="space_disable">غیرفعال‌سازی آگهی</option></optgroup></select>{isGlobal?<div className="legal__notice">این دستور روی ارسال پیام در تمام گفتگوهای فضاجو اعمال می‌شود و در ردپای حقوقی ثبت خواهد شد.</div>:<><select value={action.targetType} onChange={e=>setAction({...action,targetType:e.target.value})}><option value="chat">گفتگو</option><option value="user">کاربر</option><option value="space">آگهی</option></select><input placeholder="شناسه هدف (UUID)" value={action.targetId} onChange={e=>setAction({...action,targetId:e.target.value})}/></>}<input placeholder="یادداشت اجرای دستور" value={action.note} onChange={e=>setAction({...action,note:e.target.value})}/><button disabled={!selected||(!isGlobal&&!action.targetId)} onClick={runAction}>اعمال و ثبت در لاگ</button></section>
 <section className="legal__card"><h2>خروجی قضایی کاربر</h2><label>شماره موبایل کاربر<input inputMode="tel" placeholder="مثلاً 09121234567" value={exp.phone} onChange={e=>setExp({...exp,phone:e.target.value})}/></label><label>از تاریخ (شمسی)<input inputMode="numeric" placeholder="مثلاً ۱۴۰۵/۰۶/۰۱ ۰۰:۰۰" value={exp.from} onChange={e=>setExp({...exp,from:cleanJalaliDateTime(e.target.value)})}/></label><label>تا تاریخ (شمسی)<input inputMode="numeric" placeholder="مثلاً ۱۴۰۵/۰۶/۰۸ ۲۳:۵۹" value={exp.to} onChange={e=>setExp({...exp,to:cleanJalaliDateTime(e.target.value)})}/></label><button disabled={!selected||!exp.phone} onClick={download}>دانلود JSON + SHA-256</button></section></div>
 <section className="legal__card legal__audit"><h2>ردپای دسترسی و عملیات</h2>{logs.length===0?<p>هنوز عملیاتی ثبت نشده است.</p>:<div className="legal__table">{logs.map(l=><div key={l.id}><strong>{l.action}</strong><span>{l.target_type||'-'} {l.target_id||''}</span><span>{new Date(l.created_at).toLocaleString('fa-IR')}</span><small>{l.admin_name||l.admin_phone||'مدیر'}</small></div>)}</div>}</section></main>}
