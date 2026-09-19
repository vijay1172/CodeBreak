import { memberSchema } from './Member.js';
export function defineModels(connection) { return { Member: connection.model('Member', memberSchema) }; }
