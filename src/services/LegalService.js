import { getAuthToken } from './authService';
const BASE=import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:6060/api';
async function request(path,options={}){const r=await fetch(`${BASE}/admin/legal${path}`,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAuthToken()}`,...(options.headers||{})}});const d=await r.json().catch(()=>null);if(!r.ok||d?.ok===false)throw new Error(d?.message||'خطای بخش حقوقی');return d;}
export async function getLegalCases(){return (await request('/cases')).cases||[]}
export async function createLegalCase(body){return request('/cases',{method:'POST',body:JSON.stringify(body)})}
export async function closeLegalCase(id){return request(`/cases/${id}/close`,{method:'PATCH'})}
export async function getLegalAudit(caseId=''){return (await request(`/audit${caseId?`?caseId=${encodeURIComponent(caseId)}`:''}`)).logs||[]}
export async function applyLegalAction(caseId,body){return request(`/cases/${caseId}/actions`,{method:'POST',body:JSON.stringify(body)})}
export async function lookupLegalTargetByPhone(caseId,phone){return request(`/cases/${caseId}/lookup/phone/${encodeURIComponent(phone)}`)}
export async function exportLegalUserDataByPhone(caseId,phone,from='',to='',scope='both'){const q=new URLSearchParams();if(from)q.set('from',from);if(to)q.set('to',to);q.set('scope',scope);const r=await fetch(`${BASE}/admin/legal/cases/${caseId}/export/phone/${encodeURIComponent(phone)}?${q}`,{headers:{Authorization:`Bearer ${getAuthToken()}`}});if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||'خروجی قضایی ساخته نشد.')}return {blob:await r.blob(),sha256:r.headers.get('X-Fazajoo-SHA256')||''};}
