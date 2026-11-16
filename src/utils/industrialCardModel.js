/**
 * Cards DS-01 pilot: presentation-only adapter for industrial listings.
 * This module does not modify, infer, or persist contract information.
 */
import { parkingRentalBadges } from "./parkingRental.js";
import { industrialMoneyRows } from "./industrialRental.js";
import { shedRequestAreaText } from "./shedRequest.js";
import { formatRialPrice, normalizePriceNumber } from "./priceFormatter.js";

const validText = value => String(value ?? "").trim();

const areaOf = (listing, requested, wanted) => {
  if (wanted && requested) {
    return shedRequestAreaText(requested) || "";
  }
  const numeric = normalizePriceNumber(listing?.area);
  return numeric > 0 ? `${numeric.toLocaleString("fa-IR")} مترمربع` : "";
};

export function getIndustrialCardModel(listing, requested = null) {
  const wanted = listing?.listingType === "wanted";
  const values = wanted ? requested : listing?.spaceAttributes?.values;
  const badges = parkingRentalBadges(values, wanted).map(badge => ({
    label: badge.label,
    ticks: wanted ? "" : badge.state === "primary" ? "✓✓" : "✓",
    state: badge.state,
  }));
  const rows = industrialMoneyRows(values, wanted).map(({ label, amount }) => ({
    label: wanted ? label.replace(/^سقف اجاره(?=\s*\/)/, "سقف بودجه") : label,
    amount,
  }));

  // A legacy listing without RT-00 money is not silently assigned a period.
  // Generic price is shown only when the listing actually has a positive amount.
  const numericPrice = normalizePriceNumber(listing?.price);
  if (!rows.length && numericPrice > 0) {
    const fallback = formatRialPrice(listing.price, { priceType: listing.priceType || "negotiable", fallback: "" });
    if (fallback) rows.push({ label: wanted ? "بودجه ثبت‌شده" : "قیمت ثبت‌شده", amount: fallback });
  }
  const city = validText(listing?.city);
  const title = validText(listing?.title) || (wanted ? "تقاضای سوله یا کارگاه" : "سوله یا کارگاه");
  const fullTitle = city && !title.includes(city) ? `${title} / ${city}` : title;
  return {
    wanted,
    title: fullTitle,
    areaText: areaOf(listing, requested, wanted),
    badges,
    moneyRows: rows,
    status: validText(listing?.status || "active"),
  };
}
