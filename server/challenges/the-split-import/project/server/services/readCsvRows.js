import { parse } from 'csv-parse/sync';
export async function readCsvRows(text) {
  const rows = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(...parse(line));
  }
  return rows;
}
