# The Public Secret

The app works correctly in all environments. But a routine security check found that sensitive backend credentials are visible inside the compiled JavaScript bundle served to the browser.

## Where to look
The client configuration is `client/src/config/constants.js`; the payment route and controller live under `server/`.

## Expected behavior
- keeps the processor secret out of the browser config.
- reads the payment secret from the server environment.
- keeps the database connection string off the client.
- rejects payment intents outside the allowed range.
- stops sourcing browser configuration from import.meta.env.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.