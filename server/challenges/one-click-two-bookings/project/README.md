# One Click, Two Bookings

A workshop booking sometimes appears twice after a brief connection interruption. The attendee clicked once and saw one confirmation. Normal bookings work, and refreshing the bookings list confirms that both entries were saved.

## Running the workspace

Use Node.js 20.19 or newer. Run `npm install`, then `npm run start:challenge`. React is built and served by Express on port 3000. The practice profile starts a real isolated MongoDB process. Outside this profile set MONGODB_URI; no production credentials are included.

For client development use `npm run start:client`. Vite proxies /api to Express. Read the pages, hooks, and API modules in client/src alongside the routes, controllers, repositories, and models in server/.

## Expected behavior

- creates and confirms a normal workshop booking.
- replays an existing operation without inserting another booking.
- creates one booking when a committed response is lost and retried.
- keeps independently submitted bookings distinct.
- does not retry a rejected booking request.

The hidden tests check behavior rather than requiring one particular implementation.
