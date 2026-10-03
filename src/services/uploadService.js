import { API_BASE_URL } from "../config/api";
import { getAuthToken } from "./authService";

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


export function uploadAdVideo(file, duration, onProgress) {
  const token = getAuthToken();
  if (!token) return Promise.reject(new Error("برای آپلود ویدئو ابتدا وارد حساب شوید."));

  const form = new FormData();
  form.append("file", file);
  form.append("duration", String(duration || ""));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/uploads/ad-video`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      onProgress?.(percent, event.loaded, event.total);
    };

    xhr.onerror = () => reject(new Error("ارتباط هنگام آپلود ویدئو قطع شد."));
    xhr.onabort = () => reject(new Error("آپلود ویدئو لغو شد."));
    xhr.onload = () => {
      const data = xhr.response || (() => {
        try { return JSON.parse(xhr.responseText || "null"); } catch { return null; }
      })();
      if (xhr.status < 200 || xhr.status >= 300 || data?.ok === false) {
        reject(new Error(data?.message || "آپلود ویدئو انجام نشد."));
        return;
      }
      onProgress?.(100, file.size, file.size);
      resolve(data.video);
    };

    xhr.send(form);
  });
}

export async function deleteAdVideo(url) {
  if (!url) return;
  const token = getAuthToken();
  if (!token) return;
  const response = await fetch(`${API_BASE_URL}/uploads/ad-video`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  return parse(response);
}
