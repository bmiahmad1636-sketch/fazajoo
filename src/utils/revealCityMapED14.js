// Pure calculation for consistent behavior in both listing forms.
export function cityMapScrollOffset(city, map, viewportHeight, headerBottom) {
  const top = Math.max(0, headerBottom) + 12;
  const bottom = viewportHeight - 12;
  if (!map || !city || bottom <= top) return 0;
  if (city.top >= top && map.bottom <= bottom) return 0;
  if (map.bottom - city.top <= bottom - top) return city.top - top;
  if (map.top >= top && map.bottom <= bottom) return 0;
  return map.top - top;
}

export function revealCityMap(section) {
  if (!section?.isConnected) return;
  const city = section.closest("form")?.querySelector("#city");
  const map = section.querySelector(".neshan-location-picker__map") || section;
  if (!city) return;
  const header = document.querySelector(".fazajoo-header");
  const offset = cityMapScrollOffset(city.getBoundingClientRect(), map.getBoundingClientRect(), window.innerHeight, header?.getBoundingClientRect().bottom || 0);
  if (Math.abs(offset) < 2) return;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  window.scrollBy({ top: offset, left: 0, behavior: reduced ? "instant" : "smooth" });
}
