import { getAuthToken } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:6060/api";

async function parse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) throw new Error(data?.message || "ارتباط با سرویس تصویر فضاجو ناموفق بود.");
  return data;
}

export async function uploadAdImage(file) {
  const token = getAuthToken();
  if (!token) throw new Error("برای آپلود تصویر ابتدا وارد حساب شوید.");
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}/uploads/ad-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await parse(response);
  return data.image;
}

export async function deleteAdImage(url) {
  if (!url) return;
  const token = getAuthToken();
  if (!token) return;
  const response = await fetch(`${API_BASE_URL}/uploads/ad-image`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  return parse(response);
}
