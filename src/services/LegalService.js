import { API_BASE_URL } from "../config/api";
import { getAuthToken } from './authService';
const BASE = API_BASE_URL;
async function request(path,options={}){const r=await fetch(`${BASE}/admin/legal${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAuthToken()}`,...(options.headers||{})}});const d=await r.json().catch(()=>null);if(!r.ok||d?.ok===false)throw new Error(d?.message||'خطای بخش حقوقی');return d;}
export async function getLegalCases(){return (await request('/cases')).cases||[]}
export async function createLegalCase(body){return request('/cases',{method:'POST',body:JSON.stringify(body)})}
export async function archiveLegalCase(id){return request(`/cases/${id}/archive`,{method:'PATCH'})}
export async function getLegalAudit(caseId=''){return (await request(`/audit${caseId?`?caseId=${encodeURIComponent(caseId)}`:''}`)).logs||[]}
export async function applyLegalAction(caseId,body){return request(`/cases/${caseId}/actions`,{method:'POST',body:JSON.stringify(body)})}
export async function lookupLegalTargetByPhone(caseId,phone){return request(`/cases/${caseId}/lookup/phone/${encodeURIComponent(phone)}`)}
export async function exportLegalUserDataByPhone(caseId,phone,from='',to='',scope='both'){const q=new URLSearchParams();if(from)q.set('from',from);if(to)q.set('to',to);q.set('scope',scope);const r=await fetch(`${BASE}/admin/legal/cases/${caseId}/export/phone/${encodeURIComponent(phone)}?${q}`,{headers:{Authorization:`Bearer ${getAuthToken()}`}});if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||'خروجی قضایی ساخته نشد.')}return {blob:await r.blob(),sha256:r.headers.get('X-Fazajoo-SHA256')||''};}

export async function downloadLegalVideoEvidence(caseId,spaceId,onProgress){
  const r=await fetch(`${BASE}/admin/legal/cases/${caseId}/evidence/video/${encodeURIComponent(spaceId)}`,{headers:{Authorization:`Bearer ${getAuthToken()}`}});
  if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||'دریافت فایل اصلی ویدئو انجام نشد.')}
  const cd=r.headers.get('Content-Disposition')||'';
  const match=cd.match(/filename="?([^";]+)"?/i);
  const filename=match?.[1]||`fazajoo-legal-video-${spaceId}.mp4`;
  const total=Number(r.headers.get('Content-Length')||0);
  if(!r.body){const blob=await r.blob();onProgress?.({loaded:blob.size,total:total||blob.size,percent:100});return {blob,filename};}
  const reader=r.body.getReader(),chunks=[];let loaded=0;
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;onProgress?.({loaded,total,percent:total?Math.min(99,Math.round(loaded*100/total)):null});}
  onProgress?.({loaded,total:total||loaded,percent:100});
  return {blob:new Blob(chunks,{type:r.headers.get('Content-Type')||'video/mp4'}),filename};
}
