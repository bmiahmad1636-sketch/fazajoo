/** عرضه واقعی پارکینگ؛ قرارداد داده مشترک فضاجو، نسخه ۱. */
export const PARKING_OFFER_DEFAULT = Object.freeze({
  vehicleUsage: "", cover: "", access: "", parkingStyle: "", entranceHeightCm: "", securityFeatures: [], usageNotes: "",
});
export const PARKING_OFFER_USAGE = [["car", "خودرو"], ["motorcycle", "موتورسیکلت"], ["both", "خودرو و موتورسیکلت"], ["other", "سایر"]];
export const PARKING_OFFER_COVER = [["covered", "مسقف"], ["open", "روباز"]];
export const PARKING_OFFER_ACCESS = [["anytime", "شبانه‌روزی"], ["daytime", "ساعات روز"], ["scheduled", "ساعات مشخص"]];
export const PARKING_OFFER_STYLE = [["independent", "مستقل"], ["tandem", "مزاحم"], ["shared", "مشترک"]];
export const PARKING_OFFER_SECURITY = [["camera", "دوربین مداربسته"], ["guard", "نگهبانی"], ["gated", "درب ورودی کنترل‌شده"], ["lighting", "روشنایی"]];
const englishDigits = (text) => String(text).replace(/[۰-۹]/g, v=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(v))).replace(/[٠-٩]/g, v=>String("٠١٢٣٤٥٦٧٨٩".indexOf(v)));
const valid = (items, value) => items.some(([id]) => id === value);
export function parkingOfferFormFromAttributes(attrs) {
  const data = attrs?.schemaVersion === 1 && attrs.category === "parking" ? attrs.values : null;
  return { ...PARKING_OFFER_DEFAULT, ...Object.fromEntries(
    Object.keys(PARKING_OFFER_DEFAULT).filter(k => data && Object.hasOwn(data,k)).map(k => [k,data[k]])
  ), securityFeatures: Array.isArray(data?.securityFeatures) ? [...data.securityFeatures] : [],
  entranceHeightCm: data?.entranceHeightCm == null ? "" : String(data.entranceHeightCm) };
}
export function validateParkingOffer(values) {
  if (!valid(PARKING_OFFER_USAGE, values.vehicleUsage)) return "نوع استفاده از پارکینگ را مشخص کنید.";
  if (values.vehicleUsage === "other" && String(values.usageNotes || "").trim().length < 5) return "کاربری دیگر را در حداقل ۵ حرف توضیح دهید.";
  if (!valid(PARKING_OFFER_COVER, values.cover)) return "مسقف یا روباز بودن پارکینگ را مشخص کنید.";
  if (!valid(PARKING_OFFER_ACCESS, values.access)) return "زمان دسترسی به پارکینگ را مشخص کنید.";
  const height = englishDigits(values.entranceHeightCm ?? "").trim();
  if (values.cover === "covered" && height && (!/^\d+$/.test(height) || Number(height)<100 || Number(height)>500)) return "ارتفاع ورودی باید عددی بین ۱۰۰ تا ۵۰۰ سانتی‌متر باشد.";
  return "";
}
export function makeParkingAttributes(values) {
  return { schemaVersion: 1, category: "parking", values: {
    vehicleUsage: values.vehicleUsage,
    cover: values.cover,
    access: values.access,
    parkingStyle: valid(PARKING_OFFER_STYLE, values.parkingStyle) ? values.parkingStyle : null,
    entranceHeightCm: values.cover === "covered" && String(values.entranceHeightCm ?? "").trim() ? Number(englishDigits(values.entranceHeightCm)) : null,
    securityFeatures: Array.isArray(values.securityFeatures) ? values.securityFeatures.filter(id => valid(PARKING_OFFER_SECURITY, id)) : [],
    usageNotes: values.vehicleUsage === "other" ? String(values.usageNotes || "").trim().slice(0,160) : "",
  }};
}
export const parkingOfferLabel = (opts, value) => opts.find(([id])=>id===value)?.[1] || "";
