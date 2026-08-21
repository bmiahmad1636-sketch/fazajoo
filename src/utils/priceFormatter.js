const PRICE_TYPE_LABELS = {
  daily: "روزانه",
  monthly: "ماهانه",
  yearly: "سالانه",
  negotiable: "توافقی",
};

function toEnglishDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    );
}

export function normalizePriceNumber(value) {
  const normalized = toEnglishDigits(value)
    .replace(/,/g, "")
    .replace(/٬/g, "")
    .replace(/\s/g, "");

  const digits = normalized.match(/\d+/g);

  if (!digits) return 0;

  const number = Number(digits.join(""));

  return Number.isFinite(number) ? number : 0;
}

export function formatRialPrice(value, options = {}) {
  const {
    priceType = "",
    fallback = "توافقی",
    includePriceType = true,
  } = options;

  const number = normalizePriceNumber(value);

  if (!number) {
    return priceType === "negotiable"
      ? "توافقی"
      : fallback;
  }

  const formatted = number.toLocaleString("en-US");
  const typeLabel =
    includePriceType && priceType
      ? PRICE_TYPE_LABELS[priceType] || ""
      : "";

  return typeLabel
    ? `${formatted} ریال / ${typeLabel}`
    : `${formatted} ریال`;
}

export function getPriceTypeLabel(value) {
  return PRICE_TYPE_LABELS[value] || "";
}
