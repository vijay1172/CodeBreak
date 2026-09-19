import { RequestError } from '../middleware/errorHandler.js';
export function searchInput(query) {
  const text = typeof query.q === 'string' ? query.q.trim() : '';
  if (text.length > 80) throw new RequestError(422, 'Keep searches to 80 characters or fewer.');
  return text;
}
