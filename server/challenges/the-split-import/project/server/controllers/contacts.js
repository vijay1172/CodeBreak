import { importContacts } from '../services/importContacts.js';
export function contactController(repository) {
  return {
    list: async (_req, res) => res.json({ contacts: await repository.list() }),
    batches: async (_req, res) => res.json({ batches: await repository.batches() }),
    import: async (req, res) => res.status(201).json(await importContacts(req.file, repository)),
  };
}
