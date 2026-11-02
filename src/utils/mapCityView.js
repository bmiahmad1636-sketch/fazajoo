/** Map viewport helper: city center is a visual hint, never a saved property location. */
export function normalizeMapCityName(value = "") {
  return String(value).trim().replace(/ي/g,"ی").replace(/ك/g,"ک")
    .replaceAll("\u200C"," ").replaceAll("\u200D"," ").replaceAll("\u200E"," ").replaceAll("\u200F"," ")
    .replace(/\s+/g," ");
}
export function getKnownCityCenter(city, cities) {
  const name=normalizeMapCityName(city);
  if (!name || !Array.isArray(cities)) return null;
  const match=cities.find(item => normalizeMapCityName(item?.cityName) === name &&
    Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lng)) &&
    Number(item.lat)>=24 && Number(item.lat)<=40 && Number(item.lng)>=43 && Number(item.lng)<=64);
  return match ? [Number(match.lng), Number(match.lat)] : null;
}
