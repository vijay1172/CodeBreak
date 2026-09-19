import { RequestError } from '../middleware/errorHandler.js';
export function validateAssignment(input) {
  const title = String(input.title || '').trim();
  const slug = String(input.slug || '').trim();
  const date = String(input.dueDate || '');
  if (!title || title.length > 120 || !/^[a-z0-9-]{1,80}$/.test(slug)) throw new RequestError(422, 'Enter a title and a valid assignment identifier.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RequestError(422, 'Choose a valid calendar date.');
  const [year, month, day] = date.split('-').map(Number);
  const actual = new Date(Date.UTC(year, month - 1, day));
  if (year < 2000 || year > 2100 || actual.toISOString().slice(0, 10) !== date) {
    throw new RequestError(422, 'Choose a valid calendar date between 2000 and 2100.');
  }
  return { title, slug, dueDate: date, course: 'Systems Lab' };
}
