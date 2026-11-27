import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authService';
async function request(path,{admin=false,method='GET',body,signal}={}) {
  const token=admin?getAuthToken():null;
  const response=await fetch(`${API_BASE_URL}/site-content${path}`,{method,signal,cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok) throw Object.assign(new Error(data?.message||'ارتباط با مرکز محتوای فضاجو برقرار نشد.'),{status:response.status});
  return data;
}
export const getPublishedSiteContent=signal=>request('/public',{signal});
export const getAdminSiteContent=signal=>request('/admin',{admin:true,signal});
export const saveSiteContent=(version,draft)=>request('/admin/draft',{admin:true,method:'PUT',body:{version,draft}});
export const publishSiteContent=version=>request('/admin/publish',{admin:true,method:'POST',body:{version,confirm:true}});
