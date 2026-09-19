export function libraryURL(query) {
  return '/api/library/search?' + new URLSearchParams({ q: query });
}
