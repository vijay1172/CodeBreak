# The Invisible Update

A user edits their profile name and hits Save. The page immediately shows the updated name. But refreshing the page shows the old name — the change never actually saved.

## Where to look
Routes and controllers live under `server/`. The profile form, its save hook, and the API client live under `client/src/`.

## Expected behavior
- updates the stored name through the current profile endpoint.
- answers the retired profile path with a 404.
- sends profile saves to the current endpoint.
- reverts the shown name when a save fails.
- rejects blank or oversized profile names.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.