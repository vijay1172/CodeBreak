# The Leaked Password

The user profile page loads correctly and shows the right information. But a security reviewer flagged that something sensitive is being returned from the API that should never reach the frontend.

## Where to look
The profile route and controller live under `server/routes/` and `server/controllers/`; the account schema is `server/models/User.js`.

## Expected behavior
- hides the password hash from the profile response.
- hides the admin flag from the profile response.
- still returns the public profile fields.
- never loads the password hash without an explicit request.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.