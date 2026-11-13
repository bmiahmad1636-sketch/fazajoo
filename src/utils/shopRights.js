/** F5-04 UX: commercial rights are legal classifications, never rental categories. */
export const SHOP_RIGHTS = Object.freeze([
  ["key_money", "سرقفلی"],
  ["business_right", "حق کسب یا پیشه یا تجارت"],
  ["unsure", "نیازمند بررسی حقوقی"],
]);
export const shopRightLabel = id => SHOP_RIGHTS.find(([value]) => value === id)?.[1] || "نوع حق مشخص نشده";
export const shopRightDealLabel = id => id === "key_money" ? "واگذاری سرقفلی"
  : id === "business_right" ? "واگذاری حق کسب یا پیشه یا تجارت"
  : "نوع حق مورد واگذاری نیازمند بررسی حقوقی";
export const shopRightMoneyLabel = (id, wanted = false) => {
  if (id === "key_money") return wanted ? "سقف بودجه سرقفلی" : "مبلغ پیشنهادی واگذاری سرقفلی";
  if (id === "business_right") return wanted ? "سقف بودجه حق کسب یا پیشه یا تجارت" : "مبلغ پیشنهادی واگذاری حق کسب یا پیشه یا تجارت";
  return wanted ? "سقف بودجه (نوع حق نیازمند بررسی)" : "مبلغ پیشنهادی (منوط به بررسی نوع حق)";
};
export const shopRightHint = id => id === "key_money"
  ? "سرقفلی حق مالی مرتبط با محل تجاری است؛ پیش از معامله، قرارداد و اختیار انتقال باید بررسی شود."
  : id === "business_right"
  ? "حق کسب یا پیشه یا تجارت بیشتر در روابط استیجاری مشمول قانون ۱۳۵۶ مطرح است؛ وجود و انتقال آن باید از روی اسناد بررسی شود."
  : "هنوز روشن نیست کدام حق وجود دارد. انتخاب این گزینه به معنی تأیید سرقفلی یا اجازه انتقال نیست.";
