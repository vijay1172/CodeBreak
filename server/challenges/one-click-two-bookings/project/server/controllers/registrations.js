import { bookWorkshop } from '../services/bookWorkshop.js';
export function registrationController(repository) {
  return {
    workshops: async (_req, res) => res.json({ workshops: await repository.workshops() }),
    list: async (_req, res) => res.json({ registrations: await repository.list() }),
    create: async (req, res) => res.status(201).json(await bookWorkshop(req.body, req.get('Idempotency-Key'), repository)),
  };
}
