import { API_BASE_URL } from "../config/api";
import { getAuthToken } from "./authService";
async function req(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/featured-showcase${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.message || "ارتباط با ویترین ویژه برقرار نشد.");
  return data;
}
export const getFeaturedCurrent = () => req("/current");
export const getFeaturedAdmin = () => req("/admin");
export const findFeaturedOwnerSpaces = (params) => req("/admin/owner-spaces/search",{method:"POST",body:JSON.stringify(params)});
export const saveFeaturedSettings = (settings) => req("/admin/settings", {method:"PATCH",body:JSON.stringify(settings)});
export const createFeaturedBooking = (booking) => req("/admin/bookings", {method:"POST",body:JSON.stringify(booking)});
export const cancelFeaturedBooking = (id) => req(`/admin/bookings/${encodeURIComponent(id)}/cancel`, {method:"POST"});
