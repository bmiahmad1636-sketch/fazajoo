import {useEffect,useRef,useState} from 'react';
import {getAdminSiteContent,saveSiteContent,publishSiteContent} from '../services/siteContentCMS01Service';
import {footerContent,resolveFooterContent} from '../config/footerContent';
import {CMS_MAX_IMAGE,changedFields,toFooterContent} from '../utils/siteContentCMS01';
import './SiteContentCMS01.css';
const tabs=[['contacts','اطلاعات تماس'],['licenses','مجوزها و اعتبارنامه‌ها'],['pages','صفحات حقوقی و راهنما']];
const labelFor=key=>{const [group,id]=key.split('.');return footerContent[group]?.find(i=>i.id===id)?.label||key;};
const date=v=>v?new Date(v).toLocaleString('fa-IR'):'هنوز منتشر نشده';
function Preview({doc,open,onClose}) {
  const dialogRef=useRef(null);
  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!open||!dialog)return;
    dialog.showModal();
    return ()=>{if(dialog.open)dialog.close();};
  },[open]);
  const data=resolveFooterContent({content:toFooterContent(doc),development:true});
  return <dialog ref={dialogRef} className="cms01-preview-dialog" aria-labelledby="cms03-preview-title" onCancel={e=>{e.preventDefault();onClose();}}>
    <div className="cms03-preview-head"><div><h2 id="cms03-preview-title">پیش‌نمایش محتوا (غیرعمومی)</h2><p>این نمایش فقط برای مدیر است؛ هیچ اطلاعاتی منتشر نمی‌شود.</p></div><button type="button" onClick={onClose}>بستن</button></div>
    <div className="cms03-preview-body"><p className="cms03-preview-help">داده‌های قابل نمایش در فوتر و صفحات عمومی؛ نه نمای کامل سایت.</p>
    {tabs.map(([group,title])=><div key={group}><h3>{title}</h3>{data[group].map(item=><div className="cms01-preview__item" key={item.id}><strong>{item.label}</strong>{!item.ready?<small>در انتظار تکمیل یا نامعتبر</small>:group==='pages'?<p className="cms01-text">{doc.pages[item.id].body||'محتوا وارد نشده'}</p>:group==='contacts'?<span>{item.value}</span>:<>{item.imagePath&&<img src={item.imagePath} alt="پیش‌نمایش مجوز"/>}<small dir="ltr">{item.href}</small></>}</div>)}</div>)}
    </div>
  </dialog>;
}
export default function AdminSiteContentCMS01() {
  const [state,setState]=useState(null),[draft,setDraft]=useState(null),[tab,setTab]=useState('contacts'),[pageId,setPageId]=useState('about'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(false),[confirm,setConfirm]=useState(false),[imageBusy,setImageBusy]=useState(false);
  const dirty=!!state&&!!draft&&changedFields(state.draft,draft).length>0;
  const unpublished=!!state&&changedFields(state.published,state.draft).length>0;
  function apply(data){setState(data);setDraft(structuredClone(data.draft));setConfirm(false);}
  useEffect(()=>{const c=new AbortController();getAdminSiteContent(c.signal).then(data=>{if(!c.signal.aborted)apply(data);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
  useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function update(group,id,patch){setDraft(old=>({...old,[group]:{...old[group],[id]:{...old[group][id],...patch}}}));setConfirm(false);setNotice('');}
  async function reload(){if(dirty&&!window.confirm('تغییرات ذخیره‌نشده کنار گذاشته شوند؟'))return;setBusy(true);setError('');setNotice('');try{apply(await getAdminSiteContent());}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function save(){setBusy(true);setError('');setNotice('');try{apply(await saveSiteContent(state.version,draft));setNotice('پیش‌نویس ذخیره شد؛ سایت عمومی تغییر نکرده است.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function publish(){setBusy(true);setError('');setNotice('');try{apply(await publishSiteContent(state.version));setNotice('نسخه ذخیره‌شده منتشر شد.');window.dispatchEvent(new Event('fazajoo:site-content-published'));}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function image(id,file){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>CMS_MAX_IMAGE){setError('تصویر PNG، JPEG یا WebP تا ۹۶ کیلوبایت انتخاب کنید.');return;}setImageBusy(true);setError('');try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});update('licenses',id,{imageData:data});}catch{setError('خواندن تصویر انجام نشد.');}finally{setImageBusy(false);}}
  const disabled=busy||imageBusy;
  return <main className="cms01-admin" dir="rtl">
    <header className="cms01-head"><div><small>میز کار مدیریت / هویت سایت</small><h1>مدیریت محتوا و هویت فضاجو</h1><p>پیش‌نویس، پیش‌نمایش و انتشار کنترل‌شده اطلاعات عمومی سایت</p></div><button type="button" onClick={reload} disabled={disabled}>بارگذاری مجدد</button></header>
    {error&&<p className="cms01-error" role="alert">{error}</p>}{notice&&<p className="cms01-notice" role="status">{notice}</p>}
    {!draft?<p role="status">{error?'دریافت اطلاعات انجام نشد.':'در حال دریافت تنظیمات...'}</p>:<>
      <div className="cms01-summary"><span>نسخه <b>{state.version}</b></span><span>آخرین انتشار: {date(state.publishedAt)}</span><strong>{dirty?'تغییرات ذخیره‌نشده':unpublished?'پیش‌نویس منتشرنشده':'همگام با نسخه منتشرشده'}</strong></div>
      <div className="cms01-layout"><section className="cms01-editor"><nav aria-label="دسته اطلاعات">{tabs.map(([id,title])=><button key={id} type="button" aria-pressed={tab===id} onClick={()=>setTab(id)}>{title}</button>)}</nav>
        {tab==='pages'&&<div className="cms03-page-picker"><label>صفحه موردنظر برای ویرایش<select value={pageId} onChange={e=>setPageId(e.target.value)}>{footerContent.pages.map(({id,label})=><option key={id} value={id}>{label}{draft.pages[id].status==='ready'?' — فعال در انتشار بعدی':''}</option>)}</select></label><small>تغییر صفحه، متن‌های واردشده را پاک نمی‌کند. ذخیره پیش‌نویس برای تمام بخش‌ها انجام می‌شود.</small></div>}
        <div className={`cms03-fields cms03-fields--${tab}`}>
        {footerContent[tab].filter(({id})=>tab!=='pages'||id===pageId).map(({id,label})=>{const item=draft[tab][id];return <fieldset key={id} disabled={disabled}><legend>{label}</legend><label className="cms01-toggle"><input type="checkbox" checked={item.status==='ready'} onChange={e=>update(tab,id,{status:e.target.checked?'ready':'pending'})}/> فعال در انتشار بعدی</label>
          {tab==='contacts'?<label>اطلاعات عمومی<input dir={id==='address'?'rtl':'ltr'} value={item.value} maxLength={id==='address'?500:150} onChange={e=>update(tab,id,{value:e.target.value})}/></label>:tab==='pages'?<label>متن ساده صفحه (حداکثر ۶۰۰۰ نویسه)<textarea rows="5" maxLength="6000" value={item.body} onChange={e=>update(tab,id,{body:e.target.value})}/><small>{item.body.length} / 6000</small></label>:<>
            <label>لینک رسمی استعلام<input dir="ltr" maxLength="1500" value={item.verificationUrl} placeholder="https://" onChange={e=>update(tab,id,{verificationUrl:e.target.value})}/></label>
            <label>تصویر معتبر مجوز (PNG، JPEG، WebP؛ حداکثر ۹۶ کیلوبایت)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{image(id,e.target.files?.[0]);e.target.value='';}}/></label>
            {item.imageData&&<div className="cms01-image"><img src={item.imageData} alt="تصویر مجوز"/><button type="button" onClick={()=>update(tab,id,{imageData:''})}>حذف تصویر</button></div>}
            <small>فقط پس از دریافت و بررسی مجوز واقعی فعال کنید؛ کد HTML یا اسکریپت پذیرفته نمی‌شود.</small>
          </>}</fieldset>;})}
        </div>
      </section><aside className="cms01-actions"><h2>کنترل انتشار</h2><p>ذخیره پیش‌نویس هیچ تغییری در سایت عمومی ایجاد نمی‌کند. انتشار فقط نسخه ذخیره‌شده را اعمال می‌کند.</p><button type="button" disabled={disabled||!dirty} onClick={save}>ذخیره پیش‌نویس</button><button type="button" disabled={disabled} onClick={()=>setPreview(true)}>مشاهده پیش‌نمایش</button>
      <label className="cms01-toggle"><input type="checkbox" disabled={disabled||dirty||!unpublished} checked={confirm} onChange={e=>setConfirm(e.target.checked)}/> صحت اطلاعات عمومی و مجوزها را بررسی کرده‌ام.</label><button className="cms01-primary" type="button" disabled={disabled||dirty||!unpublished||!confirm} onClick={publish}>انتشار در سایت</button><small>اطلاعات خصوصی، رمز یا کلید دسترسی را وارد نکنید.</small></aside></div>
      <Preview doc={draft} open={preview} onClose={()=>setPreview(false)}/>
      <details className="cms01-audit"><summary>۳۰ رویداد اخیر مدیریت محتوا <span>({state.audit.length})</span></summary>{!state.audit.length?<p>هنوز تغییری ثبت نشده است.</p>:<ul>{state.audit.map(item=><li key={item.id}><strong>{item.action==='publish'?'انتشار':'ذخیره پیش‌نویس'} · نسخه {item.version}</strong><span>{date(item.created_at)}</span><small>{item.changed_keys.map(labelFor).join('، ')}</small><small dir="ltr">{item.actor_id||'—'}</small></li>)}</ul>}</details>
    </>}
  </main>;
}
