import { INDUSTRIAL_WANTED_FINANCE_DEFAULT, pickIndustrialRental } from "./industrialRental.js";
// Structured demand data, backward-compatible with the current description storage.
export const EMPTY_SHED_REQUEST = {
  spaceType: "", activity: "", otherActivity: "", minArea: "", maxArea: "",
  minHeight: "", power: "any", powerCapacity: "", access: "any", duration: "",
  features: [], requirements: "",
  ...INDUSTRIAL_WANTED_FINANCE_DEFAULT,
};
export const SHED_TYPES = [["shed", "سوله صنعتی"], ["workshop", "کارگاه"]];
export const SHED_ACTIVITIES = [["production", "تولید و مونتاژ"], ["repair", "تعمیرات و خدمات فنی"], ["packaging", "بسته‌بندی"], ["storage", "نگهداری کالا و تجهیزات"], ["craft", "صنایع دستی و کارگاهی"], ["other", "سایر فعالیت‌ها"]];
export const INDUSTRIAL_ACTIVITIES = [["production", "تولید صنعتی و مونتاژ"], ["heavy", "صنایع سنگین و ماشین‌آلات"], ["logistics", "لجستیک و توزیع"], ["packaging", "بسته‌بندی صنعتی"], ["storage", "نگهداری تجهیزات صنعتی"], ["other", "سایر فعالیت‌ها"]];
export const WORKSHOP_ACTIVITIES = [["wood", "نجاری و صنایع چوب"], ["metal", "جوشکاری و فلزکاری"], ["repair", "تعمیرات و خدمات فنی"], ["light", "تولید سبک و مونتاژ"], ["craft", "صنایع دستی"], ["packaging", "بسته‌بندی سبک"], ["other", "سایر فعالیت‌ها"]];
export function shedActivitiesFor(spaceType) {
  return spaceType === "shed" ? INDUSTRIAL_ACTIVITIES : spaceType === "workshop" ? WORKSHOP_ACTIVITIES : SHED_ACTIVITIES;
}
export const SHED_POWER = [["any", "فرقی ندارد / توافقی"], ["single", "تک‌فاز"], ["three", "سه‌فاز"]];
export const SHED_ACCESS = [["any", "توافقی / فرقی ندارد"], ["van", "وانت"], ["truck", "کامیون"], ["trailer", "تریلی"]];
export const SHED_DURATIONS = [["", "مشخص نیست"], ["short", "کوتاه‌مدت"], ["months", "چندماهه"], ["long", "بلندمدت"]];
export const SHED_FEATURES = [["water", "آب"], ["gas", "گاز"], ["ventilation", "تهویه"], ["loading", "فضای بارگیری"], ["office", "اتاق اداری"], ["wc", "سرویس بهداشتی"], ["security", "امنیت / نگهبانی"], ["floor", "کف مقاوم صنعتی"]];
export const SHED_INDUSTRIAL_FEATURES = [["loading", "محوطه بارگیری"], ["floor", "کف مقاوم صنعتی"], ["crane", "جرثقیل سقفی"], ["truck_yard", "محوطه مانور کامیون"], ["fire_safety", "سیستم ایمنی حریق"]];
export const SHED_WORKSHOP_FEATURES = [["ventilation", "تهویه مناسب"], ["soundproof", "کنترل صدا / عایق صوتی"], ["workbench", "فضای کار و میزکار"], ["wc", "سرویس بهداشتی"], ["office", "فضای اداری کوچک"]];
export function shedFeaturesFor(spaceType) {
  const shared = SHED_FEATURES.filter(([id]) => ["water", "gas", "security"].includes(id));
  const specialized = spaceType === "shed" ? SHED_INDUSTRIAL_FEATURES : spaceType === "workshop" ? SHED_WORKSHOP_FEATURES : SHED_FEATURES;
  return [...shared, ...specialized];
}
export const SHED_ALL_FEATURES = [...new Map([...SHED_FEATURES, ...SHED_INDUSTRIAL_FEATURES, ...SHED_WORKSHOP_FEATURES].map(option => [option[0], option])).values()];
const HEADER = /^\[FAZAJOO_SHED_REQUEST:([^\]\n]+)\]\n?/;
export function readShedRequest(description = "") {
  const text = String(description || "");
  const match = text.match(HEADER);
  if (!match) return { data: { ...EMPTY_SHED_REQUEST, features: [] }, description: text, hasMetadata:false };
  try {
    const raw = JSON.parse(decodeURIComponent(match[1]));
    if(!raw || typeof raw !== "object" || Array.isArray(raw))throw new Error("Bad shed request metadata");
    return { data: { ...EMPTY_SHED_REQUEST, ...raw, ...pickIndustrialRental(raw,true), features: Array.isArray(raw.features) ? raw.features : [] }, description: text.slice(match[0].length), hasMetadata:true };
  } catch { return { data: { ...EMPTY_SHED_REQUEST, features: [] }, description: text, hasMetadata:false }; }
}
export function writeShedRequest(description, data) {
  const clean = readShedRequest(description).description.trim();
  const safe = { ...EMPTY_SHED_REQUEST, ...data, ...pickIndustrialRental(data,true), features: Array.isArray(data?.features) ? data.features : [] };
  delete safe.duration; // retired ambiguous old duration, do not equate it to RT-00 rentalTerm
  return `[FAZAJOO_SHED_REQUEST:${encodeURIComponent(JSON.stringify(safe))}]\n${clean}`;
}
export function shedOptionLabel(options, value) { return options.find(([id]) => id === value)?.[1] || "مشخص نشده"; }
export function shedRequestValidation(data = {}) {
  if (!data.spaceType) return "نوع فضای موردنیاز (سوله یا کارگاه) را انتخاب کنید.";
  if (!data.activity) return "نوع فعالیت موردنظر را انتخاب کنید.";
  const allowed = shedActivitiesFor(data.spaceType).some(([id]) => id === data.activity);
  // Older requests may contain activities from the original shared list.
  if (!allowed && !SHED_ACTIVITIES.some(([id]) => id === data.activity)) return "نوع فعالیت با نوع فضای انتخابی سازگار نیست.";
  if (data.activity === "other" && String(data.otherActivity || "").trim().length < 5) return "نوع فعالیت دیگر را حداقل در ۵ حرف توضیح دهید.";
  for (const key of ["minArea", "maxArea", "minHeight", "powerCapacity"]) {
    const value = data[key];
    if (value !== "" && value !== undefined && value !== null && (!Number.isFinite(Number(value)) || Number(value) <= 0)) return "مقادیر متراژ، ارتفاع و توان برق باید بزرگ‌تر از صفر باشند.";
  }
  if (data.minArea && data.maxArea && Number(data.minArea) > Number(data.maxArea)) return "حداقل متراژ نمی‌تواند از حداکثر بیشتر باشد.";
  return "";
}

/** A request size range is optional and must never be presented as a fixed property size. */
export function shedRequestAreaText(v={}) {
  const parse=x=>x!==""&&x!=null&&Number.isFinite(Number(x))&&Number(x)>0?Number(x).toLocaleString("fa-IR"):"";
  const min=parse(v.minArea),max=parse(v.maxArea);
  return !min&&!max?"":`${min?`از ${min}`:""}${min&&max?" تا ":""}${max?`${min?"":"تا "}${max}`:""} مترمربع`;
}
