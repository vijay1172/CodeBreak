# The Runaway Query

The admin users page works perfectly with a small dataset. But when tested with a realistic data volume it becomes extremely slow, unresponsive, or crashes entirely.

## Where to look
The directory query lives in `server/controllers/adminController.js` behind the route in `server/routes/admin.js`; the guard is `server/middleware/adminOnly.js`.

## Expected behavior
- caps the default directory page at fifty users.
- serves the requested page at the requested size.
- includes paging metadata for the table.
- requires the admin key for the directory.
- honors a larger request without lifting the cap.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.