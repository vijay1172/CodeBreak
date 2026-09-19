# The Missing Name

The profile endpoint returns a user, but the student's name is blank in the React UI.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- returns the requested user from the API.
- shows the user's name from the live API response.
- returns 404 for an unknown user.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
