export const ADSENSE_CLIENT_ID = "ca-pub-6116683724702543";

const MONETIZED_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/challenges\/?$/,
  /^\/challenges\/[^/]+\/?$/,
  /^\/incidents\/?$/,
  /^\/incidents\/[^/]+\/?$/,
];

export function isMonetizedRoute(pathname: string) {
  return MONETIZED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}
