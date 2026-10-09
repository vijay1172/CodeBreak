# The Confused Timezone

Events show the correct date to the person who created them, but other users in different timezones see the same event listed one day earlier or one day later.

## Where to look
Event storage lives in `server/models/Event.js` and `server/controllers/eventController.js`; the calendar label is rendered by `client/src/utils/dateUtils.js`.

## Expected behavior
- stores the chosen day as a UTC timestamp.
- renders the same calendar day in every timezone.
- returns the submitted day on read-back.
- rejects impossible calendar days.
- lists events in calendar order.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.