# The Stubborn Counter

Rapid clicks are batched, but the like counter increases only once instead of once per click.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- increments once for one click.
- counts every rapid click in one render batch.
- does not mutate the captured count value.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
