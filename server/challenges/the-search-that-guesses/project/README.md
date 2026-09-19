# The Search That Guesses

The internal library search works for ordinary words, but searching for exact tool names such as “Node.js” returns unrelated titles. Some names containing punctuation do not produce results at all. Users expect the search box to find the text they typed.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- finds ordinary words without case sensitivity.
- treats punctuation in search text as literal characters.
- excludes archived library entries.
- returns a stable default list for an empty query.
- rejects overlong search input.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
