"use strict";
const DAY_MS = 86400000;
/** Pick one active placement per fixed duration.  The daily shift makes the same
 * advertiser less likely to always occupy the same time of day over three days.
 * This guarantees equal *time-slot* allocation, not equal impressions/traffic. */
function rotationIndex(nowMs, minutes, count) {
  if (!Number.isFinite(nowMs) || !Number.isInteger(minutes) || minutes < 1 || minutes > 60 ||
      !Number.isInteger(count) || count < 1) return -1;
  const slot = Math.floor(nowMs / (minutes * 60000));
  const day = Math.floor(nowMs / DAY_MS);
  return ((slot + day) % count + count) % count;
}
module.exports = { rotationIndex };
