import { useResource } from './useResource.js';
export function useContacts(revision) { return useResource('/api/contacts', revision); }
