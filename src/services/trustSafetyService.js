import { getAuthToken } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:6060/api";

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || "ارتباط با بخش اعتماد و ایمنی انجام نشد.");
  }
  return data;
}

export const createAbuseReport = (payload) => request("/trust/reports", { method: "POST", body: JSON.stringify(payload) });
export const getBlockStatus = (userId) => request(`/trust/blocks/${encodeURIComponent(userId)}`);
export const blockUser = (userId) => request("/trust/blocks", { method: "POST", body: JSON.stringify({ userId }) });
export const unblockUser = (userId) => request(`/trust/blocks/${encodeURIComponent(userId)}`, { method: "DELETE" });
export const getAdminReports = (status = "") => request(`/trust/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ""}`).then((x) => x.reports || []);
export const updateAdminReport = (id, status, note = "") => request(`/trust/admin/reports/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status, note }) });
export const getAdminReportChat = (id) => request(`/trust/admin/reports/${encodeURIComponent(id)}/chat`);
