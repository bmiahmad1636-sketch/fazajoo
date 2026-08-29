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
    throw new Error(data?.message || "ارتباط با اعلان هوشمند فضاجو ناموفق بود.");
  }
  return data;
}

export async function getSmartSearches() {
  return (await request("/smart-searches")).searches || [];
}

export async function saveSmartSearch(payload) {
  const data = await request("/smart-searches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  window.dispatchEvent(new Event("fazajoo:smart-notifications-changed"));
  return data;
}

export async function setSmartSearchActive(id, isActive) {
  const data = await request(`/smart-searches/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return data.search;
}

export async function deleteSmartSearch(id) {
  return request(`/smart-searches/${id}`, { method: "DELETE" });
}

export async function getSmartNotifications() {
  return request("/smart-searches/notifications");
}

export async function markSmartNotificationRead(id) {
  const data = await request(`/smart-searches/notifications/${id}/read`, { method: "PATCH" });
  window.dispatchEvent(new Event("fazajoo:smart-notifications-changed"));
  return data;
}

export async function markAllSmartNotificationsRead() {
  const data = await request("/smart-searches/notifications/read-all", { method: "PATCH" });
  window.dispatchEvent(new Event("fazajoo:smart-notifications-changed"));
  return data;
}
