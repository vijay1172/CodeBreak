import { contactSchema } from './Contact.js';
import { importBatchSchema } from './ImportBatch.js';
export function defineModels(connection) {
  return { Contact: connection.model('Contact', contactSchema), ImportBatch: connection.model('ImportBatch', importBatchSchema) };
}
