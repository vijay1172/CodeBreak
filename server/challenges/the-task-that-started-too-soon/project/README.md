# The Task That Started Too Soon

## Product context

A project board allows tasks to depend on other tasks. A task should not be completed until every prerequisite is complete, while circular dependencies and dependencies from another account should be rejected.

## How to reproduce

1. Select Alice and create two prerequisite tasks with empty dependency lists.
2. Create a third task whose dependency list contains both prerequisite IDs.
3. Complete only the first prerequisite, then complete the third task. It is marked done even though the second prerequisite is still pending.

## Expected behavior

With a demo bearer token, `POST /api/tasks` accepts a nonblank `title` and optional `dependsOn` array of distinct task IDs owned by the same account. It returns `201` with `{ "item": { "id": string, "title": string, "dependsOn": string[], "status": "pending"|"done" } }`. `PATCH /api/tasks/:id` changes dependencies on a pending task; it rejects self-reference or a cycle. `POST /api/tasks/:id/complete` returns `200` with the done item only when all dependencies are done; otherwise `409`. `GET /api/tasks` and `GET /api/tasks/:id` return `{ "items": [...] }` and `{ "item": ... }`. Invalid titles/dependencies return `400`, inaccessible tasks `404`, and missing auth `401`.

## Constraints

Keep the existing route shapes, account ownership, task statuses, and dependency IDs. Do not add a dependency or allow completed tasks to be edited.

## Success criteria

1. A task is created and read back with its dependency list.
2. A task with multiple prerequisites remains pending until all are done.
3. A ready task completes and stays done after a fresh read.
4. Invalid, foreign, self-referential, and cyclic dependencies are rejected.
5. Another account and unauthenticated callers cannot complete Alice's tasks.
