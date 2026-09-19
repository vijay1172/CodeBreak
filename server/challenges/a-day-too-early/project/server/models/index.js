import { assignmentSchema } from './Assignment.js';
export function defineModels(connection) { return { Assignment: connection.model('Assignment', assignmentSchema) }; }
