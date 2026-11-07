// Category-aware display texts for the shared EditParking route.
// Do not infer category from URL (legacy route /edit-parking/:id serves all 9 types).
export const EDIT_LISTING_CATEGORY_LABELS = Object.freeze({
  parking: "پارکینگ",
  residential: "مسکونی",
  villa: "ویلا",
  storage: "انبار",
  warehouse: "سوله و کارگاه",
  shop: "مغازه",
  garden: "باغ",
  land: "زمین",
  other: "سایر فضاها",
});

const TITLE_EXAMPLES = Object.freeze({
  parking: "پارکینگ مسقف نزدیک مرکز شهر",
  residential: "آپارتمان دوخوابه در مرکز شهر",
  villa: "ویلای مجهز با دسترسی آسان",
  storage: "انبار سرپوشیده با دسترسی مناسب",
  warehouse: "سوله صنعتی با امکانات کامل",
  shop: "مغازه با پاخور مناسب",
  garden: "باغ دارای امکانات موردنیاز",
  land: "زمین مناسب فعالیت موردنظر",
  other: "استودیو ضبط صدا در مرکز شهر",
});

export function editListingCategoryLabel(category) {
  return EDIT_LISTING_CATEGORY_LABELS[category] || "فضا";
}

export function editListingTitle(category, isWanted) {
  const label = editListingCategoryLabel(category);
  return `${isWanted ? "ویرایش درخواست" : "ویرایش آگهی"} ${label}`;
}

export function editListingBaseHint(category, isWanted) {
  if (category === "other") {
    return isWanted
      ? "نام فضای موردنیاز، عنوان، شهر و متراژ را بررسی کن."
      : "نام فضای قابل واگذاری، عنوان، شهر و متراژ را بررسی کن.";
  }
  return `عنوان، موقعیت و مشخصات اصلی ${editListingCategoryLabel(category)} ${isWanted ? "موردنیاز" : "آگهی"} را بررسی کن.`;
}

export function editListingTitlePlaceholder(category, isWanted) {
  const label = editListingCategoryLabel(category);
  return isWanted ? `مثلاً درخواست ${label} در محدوده دلخواه` : `مثلاً ${TITLE_EXAMPLES[category] || "فضای مناسب برای اجاره"}`;
}
