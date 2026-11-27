// Display pagination only: no change to match ranking, ownership or eligibility.
export function agencyPage(items, requestedPage = 1, size = 8) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(requestedPage)) || 1));
  return { page, pages, items: items.slice((page-1)*size,page*size) };
}
