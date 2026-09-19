import { useResource } from './useResource.js';
export function useWorkshops() { return useResource('/api/workshops'); }
