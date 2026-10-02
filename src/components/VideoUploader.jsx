import { useRef, useState } from "react";
import { deleteAdImage, deleteAdVideo, uploadAdImage, uploadAdVideo } from "../services/uploadService";
import "./VideoUploader.css";

const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_DURATION = 120;

function readDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error("مدت ویدئو قابل تشخیص نیست."));
      else resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("ویدئو قابل خواندن نیست."));
    };
    video.src = url;
  });
}


function createPoster(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onloadeddata = () => {
      try { video.currentTime = Math.min(0.2, Math.max(0, (video.duration || 1) / 10)); } catch { /* ignore */ }
    };
    video.onseeked = async () => {
      try {
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((video.videoWidth || 1280) * scale));
        canvas.height = Math.max(1, Math.round((video.videoHeight || 720) * scale));
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], "video-poster.jpg", { type: "image/jpeg" }) : null);
        }, "image/jpeg", 0.82);
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
  });
}

export default function VideoUploader({ video = null, onChange, disabled = false, persisted = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("فرمت ویدئو باید MP4، MOV یا WebM باشد.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("حجم ویدئو نباید بیشتر از ۱۰۰ مگابایت باشد.");
      return;
    }

    try {
      const duration = await readDuration(file);
      if (duration > MAX_DURATION + 0.5) {
        setError("مدت ویدئو نباید بیشتر از ۲ دقیقه باشد.");
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      setProgressText("در حال بارگذاری ویدئو");
      const uploaded = await uploadAdVideo(file, duration, (percent) => {
        // 0..90 = ارسال واقعی فایل اصلی. 100 فقط وقتی کل فرایند واقعاً آماده نمایش شد.
        setUploadProgress(Math.min(90, Math.round(percent * 0.9)));
      });
      let posterUrl = "";
      try {
        setUploadProgress(92);
        setProgressText("فایل اصلی ارسال شد؛ در حال ساخت پیش‌نمایش...");
        const posterFile = await createPoster(file);
        setUploadProgress(96);
        if (posterFile) {
          setProgressText("در حال ذخیره تصویر پیش‌نمایش...");
          posterUrl = (await uploadAdImage(posterFile))?.url || "";
        }
        setUploadProgress(99);
      } catch { posterUrl = ""; }
      if (video?.url && !persisted) await deleteAdVideo(video.url).catch(() => {});
      if (video?.posterUrl && !persisted) await deleteAdImage(video.posterUrl).catch(() => {});
      onChange?.({ ...uploaded, posterUrl });
      setUploadProgress(100);
      setProgressText("ویدئو آماده نمایش است ✓");
      await new Promise((resolve) => setTimeout(resolve, 450));
    } catch (e) {
      setError(e.message || "آپلود ویدئو انجام نشد.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 350);
    }
  }

  async function remove() {
    if (!video?.url || uploading) return;
    setUploading(true);
    setError("");
    try {
      if (!persisted) {
        await deleteAdVideo(video.url);
        if (video.posterUrl) await deleteAdImage(video.posterUrl).catch(() => {});
      }
      onChange?.(null);
    } catch (e) {
      setError(e.message || "حذف ویدئو انجام نشد.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fazajoo-video-uploader">
      {video?.url ? (
        <div className="fazajoo-video-uploader__ready">
          <video controls preload="metadata" playsInline src={video.url} poster={video.posterUrl || undefined} />
          <div className="fazajoo-video-uploader__meta">
            <strong>ویدئوی آگهی آماده است</strong>
            <span>
              {video.duration ? `${Math.round(video.duration).toLocaleString("fa-IR")} ثانیه` : "ویدئو"}
              {video.size ? ` • ${(video.size / 1024 / 1024).toFixed(1)} MB` : ""}
            </span>
          </div>
          {video?.status === "blocked" && <div className="fazajoo-video-uploader__error">نمایش این ویدئو توسط مدیریت متوقف شده و تا پایان بررسی قابل حذف یا جایگزینی نیست.</div>}
          <div className="fazajoo-video-uploader__actions">
            <button type="button" disabled={disabled || uploading || video?.status === "blocked"} onClick={() => inputRef.current?.click()}>
              جایگزینی
            </button>
            <button type="button" className="danger" disabled={disabled || uploading || video?.status === "blocked"} onClick={remove}>
              حذف ویدئو
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="fazajoo-video-uploader__pick"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <span
                className="fazajoo-video-uploader__progress-ring"
                style={{ "--video-progress": `${uploadProgress * 3.6}deg` }}
                aria-label={`درصد بارگذاری ${uploadProgress}`}
              >
                <span>{uploadProgress.toLocaleString("fa-IR")}٪</span>
              </span>
              <strong>{uploadProgress < 91 ? "در حال ارسال ویدئو" : uploadProgress < 100 ? "در حال آماده‌سازی ویدئو" : "ویدئو آماده است"} — {uploadProgress.toLocaleString("fa-IR")}٪</strong>
              <small>{uploadProgress >= 100 ? "آماده نمایش و ثبت در آگهی ✓" : "لطفاً تا پایان کامل فرایند این صفحه را نبندید."}</small>
            </>
          ) : (
            <>
              <span className="fazajoo-video-uploader__icon">▶</span>
              <strong>افزودن ویدئوی آگهی</strong>
              <small>اختیاری • حداکثر ۲ دقیقه • حداکثر ۱۰۰MB • MP4 / MOV / WebM</small>
            </>
          )}
        </button>
      )}

      <input ref={inputRef} hidden type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={choose} />
      {progressText && <div className="fazajoo-video-uploader__status">{progressText}</div>}
      {error && <div className="fazajoo-video-uploader__error">{error}</div>}
      <p className="fazajoo-video-uploader__privacy">
        ویدئو خودکار پخش نمی‌شود. فقط پس از تأیید آگهی در صفحه جزئیات نمایش داده می‌شود و مدیریت فضاجو می‌تواند در صورت گزارش تخلف، نمایش آن را متوقف کند.
      </p>
    </div>
  );
}
