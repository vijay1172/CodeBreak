# One Click, Two Bookings

A workshop booking sometimes appears twice after a brief connection interruption. The attendee clicked once and saw one confirmation. Normal bookings work, and refreshing the bookings list confirms that both entries were saved.

## Where to look

Routes, controllers, repositories, and Mongoose models live under `server/`. React pages, hooks, components, and API clients live under `client/src/`.

## Expected behavior

- creates and confirms a normal workshop booking.
- replays an existing operation without inserting another booking.
- creates one booking when a committed response is lost and retried.
- keeps independently submitted bookings distinct.
- does not retry a rejected booking request.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.
