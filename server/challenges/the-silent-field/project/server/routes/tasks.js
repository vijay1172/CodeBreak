export function serializeTask(task) {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.due_date ?? null,
  };
}
