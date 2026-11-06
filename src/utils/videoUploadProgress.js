// End-to-end byte accounting: browser -> Fazajoo server, then server -> object storage.
// Both hops carry the original video, so each contributes 50% of *transferred bytes*.
// Reaching 100% means bytes were read for transfer, NOT that storage acknowledged
// the object or an optional poster has been saved. These use separate named stages.
function fraction(loaded, total) {
  const value = Number(total);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(1, (Number(loaded) || 0) / value));
}

export function videoTransferPercent(update = {}) {
  const stage = update.stage;
  if (stage === "ready") return 100;
  if (stage === "saved" || stage === "confirming") return 100;
  if (stage === "storage") return Math.round(50 + 50 * fraction(update.loaded, update.total));
  if (stage === "storage-wait") return 50;
  if (stage === "browser") return Math.round(50 * fraction(update.loaded, update.total));
  return 0;
}

export function videoUploadStageLabel(stage) {
  if (stage === "browser") return "در حال ارسال ویدئو از مرورگر به سرور فضاجو…";
  if (stage === "storage-wait") return "ارسال به سرور تمام شد؛ در حال آغاز انتقال به فضای ذخیره‌سازی…";
  if (stage === "storage") return "در حال انتقال ویدئو از سرور به فضای ذخیره‌سازی…";
  if (stage === "confirming") return "انتقال فایل به پایان رسید؛ در انتظار تأیید فضای ذخیره‌سازی…";
  if (stage === "saved") return "ذخیره‌سازی ویدئو تأیید شد؛ در حال آماده‌سازی پیش‌نمایش…";
  if (stage === "preview") return "در حال آماده‌سازی تصویر پیش‌نمایش ویدئو…";
  if (stage === "poster") return "در حال ذخیره تصویر پیش‌نمایش…";
  if (stage === "ready") return "ویدئو آماده نمایش است ✓";
  return "در حال آماده‌سازی ویدئو…";
}

// Explanatory phase labels remain visible when there are no more bytes to count.
export function videoUploadPhaseLabel(stage) {
  if (stage === "browser") return "مرحله ۱ از ۴: ارسال به سرور";
  if (stage === "storage-wait" || stage === "storage") return "مرحله ۲ از ۴: انتقال به ذخیره‌سازی";
  if (stage === "confirming") return "مرحله ۳ از ۴: تأیید ذخیره‌سازی";
  if (stage === "saved" || stage === "preview" || stage === "poster") return "مرحله ۴ از ۴: آماده‌سازی پیش‌نمایش";
  if (stage === "ready") return "تکمیل موفق";
  return "در حال آماده‌سازی";
}

// Upload timing is measured in milliseconds, but displayed as an elapsed clock.
// These two independent clocks are NOT an estimated time remaining:
// phase = current step; total = everything since video transfer began.
export function elapsedSecondsSince(startedAtMs, nowMs = Date.now()) {
  const started = Number(startedAtMs);
  const now = Number(nowMs);
  if (!Number.isFinite(started) || started <= 0 || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}

export function formatUploadElapsedTime(seconds) {
  const numeric = Number(seconds);
  const total = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  const digits = (value) => value.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours > 0
    ? `${digits(hours)}:${digits(minutes)}:${digits(remainder)}`
    : `${digits(Math.floor(total / 60))}:${digits(remainder)}`;
}
