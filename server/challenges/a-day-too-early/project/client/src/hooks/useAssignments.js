import { useResource } from './useResource.js';
export function useAssignments(revision) { return useResource('/api/assignments', revision); }
