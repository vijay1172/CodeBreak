# The Silent Field

## Product context

A task list records task titles and optional due dates. Task due dates are stored, but they disappear when the task list is serialized for the client.

## How to reproduce

1. Open Live Preview and find the task form.
2. Set **Task title** to `Submit lab` and **Due date** to October 1, 2026.
3. Click **Create task**, then **Reload tasks** after creation succeeds.
4. Observe that the task appears without its due date. It should retain October 1, 2026.

## Expected behavior

A task's title and optional due date survive creation and subsequent reads.

- Authentication: the supplied demo session; missing or invalid credentials return `401` with a string `message`.
- `POST /api/tasks` accepts `title: string` and optional `dueDate: string | null`; a supplied date string uses the `YYYY-MM-DD` format.
- Creation returns `201` with `id: string`, `title: string`, and `dueDate: string | null`.
- A missing/blank title, incorrectly typed due date, or date string outside that format returns `400` with a string `message`, without inserting a task. This fixture checks the date's format, not calendar validity.
- `GET /api/tasks` returns `200` with a `tasks` array containing the same task fields.
- `GET /api/tasks/:id` returns `200` with the task, or `404` with a string `message` for an unknown task.
- An undated task returns `dueDate: null`, not an omitted field.

Records are retained for the current server run only; restarting the fixture resets them.

## Constraints

- Preserve task identifiers, titles and supplied date values.
- Do not discard dated tasks or substitute a fixed date.
- Do not add a database, restart-durability requirement or dependency.

## Success criteria

1. Creating a dated task stores its submitted date, confirmed by a subsequent request; invalid submissions insert no task.
2. Listing tasks returns the saved due date for display in the preview.
3. Tasks without a due date remain valid and return `dueDate: null`.
