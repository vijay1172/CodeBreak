import { libraryEntrySchema } from './LibraryEntry.js';
export function defineModels(connection) { return { LibraryEntry: connection.model('LibraryEntry', libraryEntrySchema) }; }
