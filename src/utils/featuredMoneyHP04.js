// The server always receives ASCII digits; input presentation stays grouped.
export function rialDigits(value) {
  const ascii = String(value ?? "")
    .replace(/[۰-۹]/g, (ch) => String(ch.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 0x0660));
  const digits = ascii.replace(/[^0-9]/g, "").slice(0, 15);
  return digits.replace(/^0+(?=\d)/, "");
}
export function rialGrouped(value) {
  const digits = rialDigits(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
export function rialText(value) {
  return `${rialGrouped(value) || "0"} ریال`;
}
