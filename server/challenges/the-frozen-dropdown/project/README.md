# The Frozen Dropdown

The category filter dropdown loads correctly the first time you visit the products page. But navigating to another shop and coming back leaves the dropdown permanently empty or stuck in a loading state.

## Where to look
The dropdown data flows through client/src/hooks/useCategories.js from `server/routes/` and `server/controllers/`.

## Expected behavior
- loads the category list for the first shop.
- reloads categories when the shop changes.
- resolves the final shop when switches come quickly.
- serves a distinct catalogue per shop.
- answers an empty list for a shop without categories.

Investigate the symptom across the project. The hidden tests run inside the practice workspace when you use Run Tests — they check behavior rather than requiring one particular implementation.