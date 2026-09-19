# The Silent Field

Task due dates are stored, but they disappear when the task list is serialized for the client.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- stores the supplied due date on a new task.
- returns the stored due date in the task-list response.
- uses null when a task has no due date.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
