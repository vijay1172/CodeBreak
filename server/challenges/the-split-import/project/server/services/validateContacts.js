import { RequestError } from '../middleware/errorHandler.js';
export function validateContacts(rows) {
  const expected = ['email', 'name', 'company', 'notes'];
  if (!rows.length || rows[0].join(',') !== expected.join(',')) {
    throw new RequestError(422, 'Use the columns email, name, company, notes in that order.');
  }
  if (rows.length < 2) throw new RequestError(422, 'Add at least one contact to the file.');
  if (rows.length > 2001) throw new RequestError(422, 'Import at most 2000 contacts at a time.');
  const emails = new Set();
  return rows.slice(1).map((row, index) => {
    if (row.length !== expected.length) throw new RequestError(422, 'Record ' + (index + 2) + ' has the wrong number of columns.');
    const [email, name, company, notes] = row;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !name.trim() || !company.trim()) {
      throw new RequestError(422, 'Record ' + (index + 2) + ' needs a valid email, name, and company.');
    }
    if (emails.has(normalizedEmail)) throw new RequestError(422, 'The file contains a duplicate email.');
    emails.add(normalizedEmail);
    return { email: normalizedEmail, name: name.trim(), company: company.trim(), notes };
  });
}
