"use strict";
// Normalization is intentionally limited to account-owner lookup; never search by
// an advertisement's editable contact number.
function toAsciiDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (character) => String(character.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, (character) => String(character.charCodeAt(0) - 0x0660));
}
function normalizeIranMobile(value) {
  const digits = toAsciiDigits(value).replace(/[^0-9]/g, "");
  if (/^00989\d{9}$/.test(digits)) return `0${digits.slice(4)}`;
  if (/^989\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  return /^09\d{9}$/.test(digits) ? digits : "";
}
function normalizeOwnerSearch(value) {
  return String(value ?? "").trim().slice(0, 80);
}
function escapeSqlLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}
module.exports = { normalizeIranMobile, normalizeOwnerSearch, escapeSqlLike };
