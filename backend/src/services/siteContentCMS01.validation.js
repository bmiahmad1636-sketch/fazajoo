'use strict';
const PAGE_IDS = ['about','faq','guide','terms','privacy','contact'];
const CONTACT_IDS = ['phone','email','address'];
const LICENSE_IDS = ['enamad','business'];
const MAX_IMAGE = 96 * 1024;
const bad = (message, status=400) => Object.assign(new Error(message), {status});
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function only(v, keys) {
  if (!object(v) || Object.keys(v).some(k => !keys.includes(k))) throw bad('ساختار اطلاعات معتبر نیست.');
}
function text(v, max) {
  if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) throw bad('متن یا طول اطلاعات معتبر نیست.');
  return v.trim();
}
function status(v) { if (!['pending','ready'].includes(v)) throw bad('وضعیت معتبر نیست.'); return v; }
function url(v) {
  v = text(v, 1500);
  if (!v) return '';
  try { const u = new URL(v); if (!/^https:\/\//i.test(v) || /\s|\\/.test(v) || u.protocol !== 'https:' || !u.hostname || u.username || u.password) throw Error(); return u.href; }
  catch { throw bad('لینک استعلام باید HTTPS معتبر و بدون نام کاربری و رمز باشد.'); }
}
function raster(v) {
  if (v === '') return '';
  if (typeof v !== 'string' || v.length > Math.ceil(MAX_IMAGE/3)*4+40) throw bad('حجم تصویر مجوز بیشتر از ۹۶ کیلوبایت است.');
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(v);
  if (!m) throw bad('فقط تصویر PNG، JPEG یا WebP مجاز است.');
  const b = Buffer.from(m[2], 'base64');
  if (b.length > MAX_IMAGE || b.toString('base64') !== m[2]) throw bad('تصویر معتبر نیست.');
  const png = b.length >= 24 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii',12,16)==='IHDR';
  const jpeg = b.length >= 4 && b[0]===255 && b[1]===216 && b[2]===255 && b[b.length-2]===255 && b[b.length-1]===217;
  const webp = b.length >= 16 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP' && b.readUInt32LE(4)===b.length-8;
  if (!({png,jpeg,webp})[m[1]]) throw bad('نوع واقعی فایل تصویر با فرمت انتخابی سازگار نیست.');
  return v;
}
function emptyDocument() {
  return {pages:Object.fromEntries(PAGE_IDS.map(id=>[id,{status:'pending',body:''}])),contacts:Object.fromEntries(CONTACT_IDS.map(id=>[id,{status:'pending',value:''}])),licenses:Object.fromEntries(LICENSE_IDS.map(id=>[id,{status:'pending',verificationUrl:'',imageData:''}]))};
}
function normalizeDocument(input, {publish=false}={}) {
  only(input,['pages','contacts','licenses']);
  only(input.pages,PAGE_IDS); only(input.contacts,CONTACT_IDS); only(input.licenses,LICENSE_IDS);
  const out=emptyDocument();
  for (const id of PAGE_IDS) {
    const item=input.pages[id]; if (!item) throw bad('تمام بخش‌های صفحات باید موجود باشند.');
    only(item,['status','body']); const s=status(item.status), body=text(item.body,6000);
    if (publish && s==='ready' && !body) throw bad('صفحه فعال باید محتوا داشته باشد.');
    out.pages[id]={status:s,body};
  }
  for (const id of CONTACT_IDS) {
    const item=input.contacts[id]; if (!item) throw bad('تمام راه‌های تماس باید موجود باشند.');
    only(item,['status','value']); const s=status(item.status),value=text(item.value,id==='address'?500:150);
    if (publish && s==='ready' && (!value || (id==='phone' && !/^\+?\d{7,15}$/.test(value.replace(/[\s()-]/g,''))) || (id==='email' && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)))) throw bad('اطلاعات تماس فعال معتبر نیست.');
    out.contacts[id]={status:s,value};
  }
  for (const id of LICENSE_IDS) {
    const item=input.licenses[id]; if (!item) throw bad('تمام جایگاه‌های مجوز باید موجود باشند.');
    only(item,['status','verificationUrl','imageData']); const s=status(item.status), verificationUrl=url(item.verificationUrl),imageData=raster(item.imageData);
    if (publish && s==='ready' && (!verificationUrl || !imageData)) throw bad('مجوز فعال باید تصویر و لینک استعلام داشته باشد.');
    out.licenses[id]={status:s,verificationUrl,imageData};
  }
  if (Buffer.byteLength(JSON.stringify(out))>450*1024) throw bad('حجم کل محتوا بیشتر از حد مجاز است.');
  return out;
}
function fromStorage(value) { return Object.keys(value || {}).length ? normalizeDocument(value) : emptyDocument(); }
function publicDocument(value) {
  const doc=normalizeDocument(fromStorage(value),{publish:true}); const result=emptyDocument();
  for(const group of Object.keys(result)) for(const id of Object.keys(result[group])) if(doc[group][id].status==='ready') result[group][id]=doc[group][id];
  return result;
}
function changedKeys(a,b) {return Object.keys(b).flatMap(group=>Object.keys(b[group]).filter(id=>JSON.stringify(a[group][id])!==JSON.stringify(b[group][id])).map(id=>`${group}.${id}`));}
module.exports={emptyDocument,normalizeDocument,fromStorage,publicDocument,changedKeys,bad,MAX_IMAGE};
