import { validateAssignment } from '../services/validateAssignment.js';
export function assignmentController(repository) {
  return {
    list: async (_req, res) => res.json({ assignments: await repository.list() }),
    get: async (req, res) => {
      const assignment = await repository.find(req.params.slug);
      if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
      res.json(assignment);
    },
    save: async (req, res) => res.status(201).json(await repository.save(validateAssignment(req.body))),
  };
}
