import { useResource } from './useResource.js';
import { libraryURL } from '../api/library.js';
export function useLibrary(query) { return useResource(libraryURL(query)); }
