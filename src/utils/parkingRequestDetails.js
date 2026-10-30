import { readParkingRequestUsage, writeParkingRequestUsage } from "./parkingRequestUsage";
export const EMPTY_PARKING_REQUEST = { minArea: "", maxArea: "", cover: "", access: "", requirements: "" };
export const PARKING_COVERS = [["", "فرقی ندارد"], ["covered", "مسقف"], ["open", "روباز"]];
export const PARKING_ACCESS = [["", "فرقی ندارد"], ["anytime", "شبانه‌روزی"], ["daytime", "ساعات روز"], ["scheduled", "ساعات مشخص"]];
const TAG = /^\[FAZAJOO_PARKING_REQUEST:([^\]\n]+)\]\n?/;
export function readParkingRequestDetails(description = "") {
 const legacy = readParkingRequestUsage(description);
 const match = legacy.description.match(TAG);
 let parsed = {};
 if (match) { try { parsed = JSON.parse(decodeURIComponent(match[1])); } catch { parsed = {}; } }
 const remainder = match ? legacy.description.slice(match[0].length).trim() : legacy.description.trim();
 return { usage: legacy.usage, otherUsage: legacy.otherUsage,
  data: { ...EMPTY_PARKING_REQUEST, ...parsed, requirements: String(parsed.requirements || remainder || "").slice(0,800) }, description: remainder };
}
export function writeParkingRequestDetails(data, usage, otherUsage) {
 const normalized = Object.fromEntries(Object.keys(EMPTY_PARKING_REQUEST).map(key => [key, String(data?.[key] || "").trim()]));
 return writeParkingRequestUsage(`[FAZAJOO_PARKING_REQUEST:${encodeURIComponent(JSON.stringify(normalized))}]`, usage, otherUsage);
}
export function parkingRequestDetailsValidation(data = {}) {
 const min = data.minArea ? Number(data.minArea) : null;
 const max = data.maxArea ? Number(data.maxArea) : null;
 if ((min !== null && (!Number.isFinite(min) || min <= 0)) || (max !== null && (!Number.isFinite(max) || max <= 0))) return "متراژ باید بزرگ‌تر از صفر باشد.";
 if (min !== null && max !== null && min > max) return "حداقل متراژ نمی‌تواند از حداکثر بیشتر باشد.";
 return "";
}
