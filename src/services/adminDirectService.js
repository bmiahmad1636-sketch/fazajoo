import { getAuthToken } from "./authService";
const API=import.meta.env.VITE_API_BASE_URL||"http://127.0.0.1:6060/api";
async function request(path,options={}){const r=await fetch(`${API}${path}`,{...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${getAuthToken()}`,...(options.headers||{})}});const d=await r.json().catch(()=>null);if(!r.ok||d?.ok===false)throw new Error(d?.message||"عملیات مدیریتی انجام نشد.");return d;}
export const searchDirectAdminUsers=q=>request(`/admin/direct/users?q=${encodeURIComponent(q)}`).then(x=>x.users||[]);
export const getDirectAdminUser=id=>request(`/admin/direct/users/${encodeURIComponent(id)}`);
export const applyDirectAdminAction=payload=>request("/admin/direct/actions",{method:"POST",body:JSON.stringify(payload)});
