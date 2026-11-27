import { footerContent } from '../config/footerContent.js';
// Only fixed labels and routes from FT01, never server-supplied URLs for internal pages.
export const CMS_GROUPS=['pages','contacts','licenses'];
export const CMS_MAX_IMAGE=96*1024;
export function toFooterContent(doc) {
  const out={showPendingInProduction:false};
  for(const group of CMS_GROUPS) out[group]=footerContent[group].map(base=>{
    const item=doc?.[group]?.[base.id];
    if(!item || item.status!=='ready') return {...base,status:'pending'};
    if(group==='pages') return {...base,status:typeof item.body==='string' && item.body.trim()?'ready':'pending'};
    if(group==='contacts') return {...base,status:'ready',value:typeof item.value==='string'?item.value:''};
    return {...base,status:'ready',verificationUrl:item.verificationUrl,imageData:item.imageData};
  });
  return out;
}
export function publicPage(doc,id) {
  const base=footerContent.pages.find(p=>p.id===id); const item=doc?.pages?.[id];
  return base && item?.status==='ready' && typeof item.body==='string' && item.body.trim()?{...base,body:item.body}:null;
}
export function changedFields(a,b) {
  return CMS_GROUPS.flatMap(group=>footerContent[group].filter(({id})=>JSON.stringify(a?.[group]?.[id])!==JSON.stringify(b?.[group]?.[id])).map(({id,label})=>({key:`${group}.${id}`,label})));
}
