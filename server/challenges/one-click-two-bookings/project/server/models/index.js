import { workshopSchema } from './Workshop.js';
import { registrationSchema } from './Registration.js';
export function defineModels(connection) {
  return { Workshop: connection.model('Workshop', workshopSchema), Registration: connection.model('Registration', registrationSchema) };
}
