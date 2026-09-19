# Locked Out, Sometimes

Some logged-in users can open the dashboard, while others receive a 401 even though their token is valid.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- rejects requests without a token.
- client and middleware agree on the authentication header.
- accepts a valid bearer token and forwards the request.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
