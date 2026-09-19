# The Silent Crash

When the orders database fails, the request hangs without reaching Express error handling.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- returns orders when the database succeeds.
- forwards database errors to Express error middleware.
- does not send a success response after a database failure.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
