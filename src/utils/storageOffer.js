/** فضای انبار موجود؛ داده مستقل از توضیحات، استاندارد مشترک v1. */
export const STORAGE_OFFER_DEFAULT = Object.freeze({
  spaceType: "", allowedPurposes: [], otherPurpose: "", access: "",
  heightM: "", vehicleAccess: "", loadingMethod: "", features: [],
});
export const STORAGE_TYPES = [["indoor", "انبار سرپوشیده"], ["container", "کانکس / کانتینر"], ["outdoor", "محوطه روباز"]];
export const STORAGE_PURPOSES = [["personal", "اثاثیه و وسایل شخصی"], ["commercial", "کالای تجاری"], ["food", "مواد غذایی غیرفاسدشدنی"], ["equipment", "تجهیزات و ابزار"], ["other", "سایر"]];
export const STORAGE_ACCESS = [["24h", "شبانه‌روزی"], ["office", "ساعات اداری"], ["scheduled", "ساعات مشخص / هماهنگی"]];
export const STORAGE_VEHICLES = [["none", "فقط دسترسی پیاده"], ["van", "وانت"], ["truck", "کامیون"], ["trailer", "تریلی"]];
export const STORAGE_LOADING = [["ground", "همکف، هم‌سطح با مسیر"], ["ramp", "رمپ بارگیری"], ["lift", "بالابر بار"], ["stairs", "پلکان / حمل دستی"]];
export const STORAGE_FEATURES = [["security", "دوربین و تجهیزات حفاظتی"], ["guard", "نگهبانی"], ["power", "برق"], ["water", "آب"], ["loading", "محل مناسب بارگیری"], ["dry", "محیط خشک"], ["temperature", "کنترل دما"]];
const digit = (s) => String(s ?? "").replace(/[۰-۹]/g, x => String("۰۱۲۳۴۵۶۷۸۹".indexOf(x))).replace(/[٠-٩]/g, x => String("٠١٢٣٤٥٦٧٨٩".indexOf(x))).replace(/٫/g,".");
const has = (options, v) => options.some(([id]) => id === v);
const validList = (options, values) => Array.isArray(values) ? [...new Set(values.filter(v => has(options,v)))] : [];
export const storageOfferLabel = (options, v) => options.find(([id]) => id===v)?.[1] || "";
export function storageOfferFromAttributes(attrs) {
  const v = attrs?.schemaVersion === 1 && attrs?.category === "storage" && attrs?.values && typeof attrs.values === "object" ? attrs.values : {};
  return { ...STORAGE_OFFER_DEFAULT,
    spaceType: has(STORAGE_TYPES,v.spaceType) ? v.spaceType : "",
    allowedPurposes: validList(STORAGE_PURPOSES,v.allowedPurposes), otherPurpose: typeof v.otherPurpose === "string" ? v.otherPurpose : "",
    access: has(STORAGE_ACCESS,v.access) ? v.access : "",
    heightM: v.heightM == null ? "" : String(v.heightM),
    vehicleAccess: has(STORAGE_VEHICLES,v.vehicleAccess) ? v.vehicleAccess : "",
    loadingMethod: has(STORAGE_LOADING,v.loadingMethod) ? v.loadingMethod : "",
    features: validList(STORAGE_FEATURES,v.features),
  };
}
export function validateStorageOffer(v = {}) {
  if (!has(STORAGE_TYPES,v.spaceType)) return "نوع فضای انبار را مشخص کنید.";
  if (!validList(STORAGE_PURPOSES,v.allowedPurposes).length) return "حداقل یک نوع کالای قابل نگهداری را انتخاب کنید.";
  if (v.allowedPurposes.includes("other") && String(v.otherPurpose || "").trim().length < 5) return "نوع کالای «سایر» را در حداقل ۵ حرف توضیح دهید.";
  if (!has(STORAGE_ACCESS,v.access)) return "زمان دسترسی به انبار را مشخص کنید.";
  const h = digit(v.heightM).trim();
  if (v.spaceType !== "outdoor" && h && (!/^\d+(?:\.\d{1,2})?$/.test(h) || Number(h)<1 || Number(h)>20)) return "ارتفاع مفید انبار باید بین ۱ تا ۲۰ متر باشد.";
  return "";
}
export function makeStorageAttributes(v) {
  const height = digit(v.heightM).trim();
  const features = validList(STORAGE_FEATURES,v.features);
  const vehicle = has(STORAGE_VEHICLES,v.vehicleAccess) ? v.vehicleAccess : null;
  const loading = has(STORAGE_LOADING,v.loadingMethod) ? v.loadingMethod : null;
  // Positive, verified request features only; unknown or unchecked is not a confirmed negative.
  if (["van","truck","trailer"].includes(vehicle)) features.push("truck");
  if (["ground","lift"].includes(loading)) features.push("ground");
  return { schemaVersion: 1, category: "storage", values: {
    spaceType: v.spaceType, allowedPurposes: validList(STORAGE_PURPOSES,v.allowedPurposes),
    otherPurpose: v.allowedPurposes?.includes("other") ? String(v.otherPurpose||"").trim().slice(0,160) : "",
    access: v.access,
    heightM: v.spaceType !== "outdoor" && height ? Number(height) : null,
    vehicleAccess: vehicle, loadingMethod: loading, features: [...new Set(features)],
  }};
}
