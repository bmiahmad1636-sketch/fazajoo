import { useEffect, useRef, useState } from "react";
import { deleteAdImage, deleteAdVideo, uploadAdImage, uploadAdVideo } from "../services/uploadService";
import { videoTransferPercent, videoUploadStageLabel, videoUploadPhaseLabel } from "../utils/videoUploadProgress";
import "./VideoUploader.css";

const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_DURATION = 120;

function readDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (error, duration) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else resolve(duration);
    };
    const timer = setTimeout(() => finish(new Error("خواندن مدت ویدئو طول کشید. فایل دیگری امتحان کنید.")), 12000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      finish(!Number.isFinite(duration) || duration <= 0 ? new Error("مدت ویدئو قابل تشخیص نیست.") : null, duration);
    };
    video.onerror = () => finish(new Error("ویدئو قابل خواندن نیست."));
    video.src = url;
  });
}

function createPoster(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (poster = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(poster);
    };
    // A device which cannot seek an MP4/MOV frame must not hold the video at 99% indefinitely.
    const timer = setTimeout(() => finish(), 8000);
    const drawFrame = () => {
      if (settled || !video.videoWidth || !video.videoHeight || video.readyState < 2) return;
      try {
        const maxWidth = 960; // Preview only: don't waste upload time on a full-HD poster.
        const scale = Math.min(1, maxWidth / video.videoWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          finish(blob ? new File([blob], "video-poster.jpg", { type: "image/jpeg" }) : null);
        }, "image/jpeg", 0.78);
      } catch { finish(); }
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      try { video.currentTime = Math.min(0.3, Math.max(0, video.duration / 10)); } catch { drawFrame(); }
    };
    video.onseeked = drawFrame;
    video.onloadeddata = drawFrame;
    video.onerror = () => finish();
    video.src = url;
  });
}

export default function VideoUploader({ video = null, onChange, disabled = false, persisted = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [error, setError] = useState("");
  const [stageSeconds, setStageSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const uploadStartedAtRef = useRef(0);

  useEffect(() => {
    if (!uploading || !uploadStage) return undefined;
    const stageStartedAt = Date.now();
    const interval = setInterval(() => {
      setStageSeconds(Math.floor((Date.now() - stageStartedAt) / 1000));
      setTotalSeconds(Math.floor((Date.now() - uploadStartedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [uploading, uploadStage]);

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setProgressText("");
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

      uploadStartedAtRef.current = Date.now();
      setTotalSeconds(0);
      setStageSeconds(0);
      setUploading(true);
      setUploadProgress(0);
      setUploadStage("browser");
      setProgressText(videoUploadStageLabel("browser"));
      // Poster generation is optional and independent of the upload transfer.
      // Overlap local frame extraction with the network instead of adding up to
      // eight seconds *after* S3 confirmation. Failure never blocks the video.
      const posterStartedAt = Date.now();
      const posterPromise = createPoster(file)
        .then((posterFile) => ({ posterFile, preparationMs: Date.now() - posterStartedAt }))
        .catch(() => ({ posterFile: null, preparationMs: Date.now() - posterStartedAt }));
      const uploaded = await uploadAdVideo(file, duration, (update) => {
        setUploadStage(update.stage);
        setUploadProgress((previous) => Math.max(previous, videoTransferPercent(update)));
        setProgressText(videoUploadStageLabel(update.stage));
      });

      let posterUrl = "";
      let posterUploadMs = null;
      setUploadStage("preview");
      setProgressText(videoUploadStageLabel("preview"));
      const { posterFile, preparationMs: posterPreparationMs } = await posterPromise;
      if (posterFile) {
        try {
          setUploadStage("poster");
          setProgressText(videoUploadStageLabel("poster"));
          const posterUploadStartedAt = Date.now();
          try {
            posterUrl = (await uploadAdImage(posterFile))?.url || "";
          } finally {
            posterUploadMs = Date.now() - posterUploadStartedAt;
          }
        } catch { posterUrl = ""; } // Optional poster must not invalidate the saved video.
      }
      // Durations only; no filename, URL, credential or file content is logged.
      if (typeof console !== "undefined" && typeof console.info === "function") {
        console.info("[Fazajoo video finalization timing]", {
          posterPreparationMs,
          posterUploadMs,
          overallMs: Date.now() - uploadStartedAtRef.current,
        });
      }

      if (video?.url && !persisted) await deleteAdVideo(video.url).catch(() => {});
      if (video?.posterUrl && !persisted) await deleteAdImage(video.posterUrl).catch(() => {});
      onChange?.({ ...uploaded, posterUrl });
      setUploadProgress(100);
      setUploadStage("ready");
      setProgressText(videoUploadStageLabel("ready"));
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (e) {
      setError(e.message || "آپلود ویدئو انجام نشد.");
      setProgressText("");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("");
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
      setProgressText("");
    } catch (e) {
      setError(e.message || "حذف ویدئو انجام نشد.");
    } finally {
      setUploading(false);
    }
  }

  const transferActive = ["browser", "storage-wait", "storage"].includes(uploadStage);
  const waitingForConfirmation = ["confirming", "saved", "preview", "poster"].includes(uploadStage);

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
          <span className="fazajoo-video-uploader__icon">▶</span>
          <strong>{uploading ? "در حال بارگذاری ویدئو…" : "افزودن ویدئوی آگهی"}</strong>
          <small>اختیاری • حداکثر ۲ دقیقه • حداکثر ۱۰۰MB • MP4 / MOV / WebM</small>
        </button>
      )}

      {uploading && uploadStage && (
        <div className="fazajoo-video-uploader__progress-panel" role="status" aria-live="polite">
          <span
            className={`fazajoo-video-uploader__progress-ring${waitingForConfirmation ? " fazajoo-video-uploader__progress-ring--busy" : ""}`}
            style={{ "--video-progress": `${uploadProgress * 3.6}deg` }}
            role={transferActive || uploadStage === "ready" ? "progressbar" : "status"}
            aria-valuemin={transferActive || uploadStage === "ready" ? 0 : undefined}
            aria-valuemax={transferActive || uploadStage === "ready" ? 100 : undefined}
            aria-valuenow={transferActive || uploadStage === "ready" ? uploadProgress : undefined}
            aria-label={transferActive ? "درصد انتقال واقعی فایل ویدئو" : "در حال تأیید و آماده‌سازی نهایی ویدئو"}
          >
            <span>{transferActive || uploadStage === "ready" ? `${uploadProgress.toLocaleString("fa-IR")}٪` : "…"}</span>
          </span>
          <div className="fazajoo-video-uploader__progress-copy">
            <strong>{progressText}</strong>
            <small className="fazajoo-video-uploader__phase">{videoUploadPhaseLabel(uploadStage)} • {stageSeconds.toLocaleString("fa-IR")} ثانیه در این مرحله • {totalSeconds.toLocaleString("fa-IR")} ثانیه از شروع</small>
            <small>{transferActive
              ? "این درصد فقط بایت‌های انتقال‌یافته را نشان می‌دهد؛ پایان انتقال به‌معنی تأیید ذخیره‌سازی نیست."
              : waitingForConfirmation
                ? "انتقال فایل به پایان رسیده؛ منتظر تأیید سرور یا آماده‌سازی تصویر پیش‌نمایش هستیم."
                : "ویدئو آماده شد."}</small>
          </div>
        </div>
      )}

      <input ref={inputRef} hidden type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={choose} />
      {!uploading && progressText && <div className="fazajoo-video-uploader__status">{progressText}</div>}
      {error && <div className="fazajoo-video-uploader__error">{error}</div>}
      <p className="fazajoo-video-uploader__privacy">
        ویدئو خودکار پخش نمی‌شود. فقط پس از تأیید آگهی در صفحه جزئیات نمایش داده می‌شود و مدیریت فضاجو می‌تواند در صورت گزارش تخلف، نمایش آن را متوقف کند.
      </p>
    </div>
  );
}
