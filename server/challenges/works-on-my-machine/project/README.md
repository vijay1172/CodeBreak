# Works On My Machine

The dashboard works locally but production still sends API requests to localhost.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- builds the dashboard endpoint correctly.
- uses the deployment API URL supplied by the environment.
- removes a trailing slash before appending a route.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
