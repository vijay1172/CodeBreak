# The Vanishing Last Item

Each full products page is missing its final item even though page boundaries otherwise look correct.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- starts the first page with the first product.
- returns every item requested for a full page.
- starts the second page at the correct offset.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
