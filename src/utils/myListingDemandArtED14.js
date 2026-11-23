import { GENERAL_ART } from "./unifiedCardModel.js";
import { resolveOtherDemandArt } from "./otherDemandArt.js";
import { readOtherRequest } from "./otherRequest.js";

// Presentation only. Match public cards, including specialized other-space art.
export function myListingDemandArt(listing) {
  if (listing?.listingType !== "wanted") return null;
  if (listing.category === "warehouse") return "/images/fj-industrial-demand.webp";
  if (listing.category === "other") {
    const parsed = readOtherRequest(listing.description || "", listing.area, listing.price, listing.priceType);
    return resolveOtherDemandArt(listing, parsed.hasMetadata ? parsed.data : null).src;
  }
  return Object.hasOwn(GENERAL_ART, listing.category) ? GENERAL_ART[listing.category] : GENERAL_ART.other;
}
