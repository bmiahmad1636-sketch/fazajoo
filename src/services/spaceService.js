import { getAuthToken } from "./authService";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:6060/api";
async function request(path, options={}) { const token=getAuthToken(); const response=await fetch(`${API_BASE_URL}${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`} : {}),...(options.headers||{})}}); const data=await response.json().catch(()=>null); if(!response.ok||data?.ok===false) throw new Error(data?.message||"ارتباط با سرور فضاجو ناموفق بود."); return data; }
function changed(){ window.dispatchEvent(new Event("fazajoo:spaces-changed")); }
export async function getSpaces(){ return (await request("/spaces")).spaces||[]; }
export async function getMySpaces(){ return (await request("/spaces/mine")).spaces||[]; }
export async function getSpace(id){ return (await request(`/spaces/${id}`)).space; }
export async function createSpace(payload){ const d=await request("/spaces",{method:"POST",body:JSON.stringify(payload)}); changed(); return d.space; }
export async function updateSpace(id,payload){ const d=await request(`/spaces/${id}`,{method:"PATCH",body:JSON.stringify(payload)}); changed(); return d.space; }
export async function deleteSpace(id){ const d=await request(`/spaces/${id}`,{method:"DELETE"}); changed(); return d; }
