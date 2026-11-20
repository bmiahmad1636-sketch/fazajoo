// DS11: supply area is mandatory, request area stays optional.
// Keep this separate from price and from request range fields.
export const VILLA_AREA_REQUIRED_DS11 = "متراژ واقعی اقامتگاه را وارد کنید.";
export function validateVillaOfferAreaDS11(value) {
  const text = String(value ?? "").trim();
  const area = Number(text);
  return text !== "" && Number.isFinite(area) && area > 0
    ? ""
    : VILLA_AREA_REQUIRED_DS11;
}
