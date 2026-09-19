import { RequestError } from '../middleware/errorHandler.js';
import { toMinorUnits } from './money.js';
export async function quoteInvoice(input, repository) {
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 50) {
    throw new RequestError(422, 'Choose between 1 and 50 product lines.');
  }
  const lines = [];
  for (const requested of input.lines) {
    if (!Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 1000) {
      throw new RequestError(422, 'Quantities must be whole numbers from 1 to 1000.');
    }
    const product = await repository.product(requested.sku);
    if (!product) throw new RequestError(404, 'That product is no longer available.');
    const unitCents = toMinorUnits(product.unitPrice);
    lines.push({ sku: product.sku, name: product.name, quantity: requested.quantity, unitCents, lineCents: unitCents * requested.quantity });
  }
  return { lines, subtotalCents: lines.reduce((sum, line) => sum + line.lineCents, 0), currency: 'USD' };
}
