# The Ghost Update

Fast typing sometimes replaces fresh search results with results from an older request.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- shows results for a single completed search.
- keeps results for the most recent query.
- rejects when the search service fails.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
