# The Room That Won’t Leave

The team room works normally when first opened. After users visit other screens and return a few times, each teammate update produces several notifications. People also receive room notifications after they have left the room.

## Running the workspace

Use Node.js 20.19 or newer. Run `npm install`, then `npm run start:challenge` to build React and start Express on port 3000. The practice profile starts a real, isolated MongoDB process; it does not use your personal database. Outside the practice profile, set MONGODB_URI.

For client development, start `npm run start:client`; Vite proxies /api to Express. Routes, controllers, repositories, and Mongoose models are under server/. React pages, hooks, components, and API clients are under client/src/.

## Expected behavior

- loads the member directory from the API.
- persists a member status change.
- rejects unsupported presence states.
- delivers each valid presence event to an active screen.
- stops delivery after unmount and avoids duplicate subscriptions on return.

Investigate the symptom across the project. The hidden tests check behavior, not a particular implementation. No user data or external credentials are needed inside this practice workspace.
