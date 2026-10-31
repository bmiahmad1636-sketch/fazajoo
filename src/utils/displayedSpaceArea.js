import { readLandRental } from "./landRental.js";

// Demand-side land area is saved in the description metadata, not in space.area.
// Leave all offer listings and all other categories unchanged.
export function displayedSpaceArea(space) {
  if (space?.listingType === "wanted" && space?.category === "land") {
    const land = readLandRental(space.description || "").data;
    const min = String(land.minArea ?? "").trim();
    const max = String(land.maxArea ?? "").trim();
    const unit = land.areaUnit === "hectare" || land.areaUnit === "ha"
      ? "هکتار" : land.areaUnit === "sqm" || !land.areaUnit
        ? "مترمربع" : land.areaUnit;
    const pretty = (value) => {
      const number = Number(String(value).replace(/[,٬،\s]/g, ""));
      return Number.isFinite(number) && String(value).trim() !== ""
        ? number.toLocaleString("fa-IR") : value;
    };
    if (min && max) return min === max ? `${pretty(min)} ${unit}` : `${pretty(min)} تا ${pretty(max)} ${unit}`;
    if (min) return `از ${pretty(min)} ${unit}`;
    if (max) return `تا ${pretty(max)} ${unit}`;
  }
  return space?.area ? `${space.area} متر` : "ثبت نشده";
}
