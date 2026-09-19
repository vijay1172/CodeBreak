import { searchInput } from '../services/searchInput.js';
import { libraryResult } from '../serializers/library.js';
export function libraryController(repository) {
  return async (req, res) => {
    const text = searchInput(req.query);
    const records = await repository.search(text);
    res.json({ query: text, results: records.map(libraryResult), count: records.length });
  };
}
