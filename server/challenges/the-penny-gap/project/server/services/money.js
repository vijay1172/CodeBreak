export function toMinorUnits(decimalPrice) {
  if (!/^\d{1,6}\.\d{2}$/.test(decimalPrice)) throw new Error('Expected a two-decimal product price.');
  return Math.trunc(Number(decimalPrice) * 100);
}
export function formatMinorUnits(cents) {
  return (cents / 100).toFixed(2);
}
