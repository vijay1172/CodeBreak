import { readCsvRows } from './readCsvRows.js';
import { validateContacts } from './validateContacts.js';
import { RequestError } from '../middleware/errorHandler.js';
export async function importContacts(file, repository) {
  if (!file?.buffer.length) throw new RequestError(422, 'Choose a non-empty CSV file.');
  let rows;
  try { rows = await readCsvRows(file.buffer.toString('utf8')); }
  catch { throw new RequestError(422, 'The CSV could not be read. Check its quotes and record boundaries.'); }
  const records = validateContacts(rows);
  return repository.import(records, file.originalname);
}
