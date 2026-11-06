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

  // UUID identifies only this upload's temporary progress, never a user or file.
  const uploadId = globalThis.crypto?.randomUUID?.() || "";
  const form = new FormData();
  form.append("uploadId", uploadId);
  form.append("duration", String(duration || ""));
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let active = true;
    const startedAt = Date.now();
    let browserFinishedAt = null;
    let startedPolling = false;
    let firstStorageSampleAt = null;
    let bytesConsumedAt = null;
    let storageAcknowledgedAt = null;
    let pollTimer = null;
    let polling = false;
    const pollAbort = new AbortController();
    const emit = (update) => { if (active) onProgress?.(update); };

    const stopPolling = () => {
      active = false;
      if (pollTimer !== null) clearTimeout(pollTimer);
      pollAbort.abort();
    };

    const poll = async () => {
      if (!active || !uploadId || polling) return;
      polling = true;
      try {
        const response = await fetch(`${API_BASE_URL}/uploads/ad-video-progress/${uploadId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: pollAbort.signal,
        });
        if (response.ok) {
          const status = await response.json();
          if (status?.ok && ["storage", "confirming", "saved"].includes(status.stage)) {
            const now = Date.now();
            if (firstStorageSampleAt === null) firstStorageSampleAt = now;
            if (status.stage === "confirming" && bytesConsumedAt === null) bytesConsumedAt = now;
            if (status.stage === "saved" && storageAcknowledgedAt === null) storageAcknowledgedAt = now;
            emit({ stage: status.stage, loaded: status.loaded, total: status.total });
          }
        }
        // A temporary 404 is normal: Multer must finish receiving the first hop
        // before backend storage progress starts. A failed poll NEVER aborts upload.
      } catch { /* optional telemetry unavailable; POST is still authoritative */ }
      finally {
        polling = false;
        if (active) pollTimer = setTimeout(poll, 700);
      }
    };
    const startPolling = () => {
      if (startedPolling || !uploadId || !active) return;
      startedPolling = true;
      poll();
    };

    xhr.open("POST", `${API_BASE_URL}/uploads/ad-video`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      emit({ stage: "browser", loaded: event.loaded, total: event.total });
    };
    xhr.upload.onload = () => {
      browserFinishedAt = Date.now();
      emit({ stage: "storage-wait", loaded: file.size, total: file.size });
      startPolling();
    };
    xhr.onerror = () => { stopPolling(); reject(new Error("ارتباط هنگام آپلود ویدئو قطع شد.")); };
    xhr.onabort = () => { stopPolling(); reject(new Error("آپلود ویدئو لغو شد.")); };
    xhr.onload = () => {
      stopPolling();
      const data = xhr.response || (() => {
        try { return JSON.parse(xhr.responseText || "null"); } catch { return null; }
      })();
      if (xhr.status < 200 || xhr.status >= 300 || data?.ok !== true || !data?.video?.url) {
        reject(new Error(data?.message || "آپلود ویدئو انجام نشد."));
        return;
      }
      onProgress?.({ stage: "saved", loaded: file.size, total: file.size });
      // Approximate client-observed times (polling interval adds some uncertainty).
      // No filenames, URLs, tokens, identifiers, or user data enter the log.
      if (typeof console !== "undefined" && typeof console.info === "function") {
        console.info("[Fazajoo video transfer timing]", {
          browserToServerMs: browserFinishedAt === null ? null : browserFinishedAt - startedAt,
          serverStorageAndAckMs: browserFinishedAt === null ? null : Date.now() - browserFinishedAt,
          storageStreamObservedMs: firstStorageSampleAt === null || bytesConsumedAt === null ? null : bytesConsumedAt - firstStorageSampleAt,
          storageConfirmationObservedMs: bytesConsumedAt === null ? null : (storageAcknowledgedAt || Date.now()) - bytesConsumedAt,
        });
      }
      resolve(data.video);
    };

    emit({ stage: "browser", loaded: 0, total: file.size });
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
