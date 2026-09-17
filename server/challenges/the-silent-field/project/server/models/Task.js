let nextId = 1;

export function createTask({ title, dueDate }) {
  return { id: `task-${nextId++}`, title, dueDate };
}
