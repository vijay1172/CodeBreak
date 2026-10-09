# The Ghost Cart

A user upgrades their account to premium. They log out and log back in. The app still shows them the free tier interface and blocks premium features — even though their account is definitely upgraded in the database.

## Where to look
Login lives in `server/controllers/authController.js`, the upgrade route under `server/controllers/`, and the plan claim is stamped into the token by the token service.

## Expected behavior
- issues a login token carrying the stored plan.
- reflects an upgrade in the next login token.
- accepts the upgraded token on premium routes.
- rejects a pre-upgrade token on premium routes.
- rejects a login for an unknown account.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.