# The Ghost Update

## Product context

A course-library search updates its results as a student types. Fast typing sometimes replaces fresh search results with results from an older request.

## How to reproduce

1. Open Live Preview and locate **Search**.
2. Enter `r`, then quickly replace it with `react` before the first search finishes.
3. Wait for both searches; the fixture gives the earlier query a longer response time.
4. Observe that older results can replace the results for the query still in the field.
5. Enter `:offline` to reproduce a failed search, or clear the field to see a successful empty search.

## Expected behavior

Displayed results correspond to the latest query, regardless of request completion order.

- A search accepts a query string and resolves to an ordered array of result-label strings.
- A completed search displays the returned labels in their supplied order.
- An earlier search must not replace the latest query's results.
- A failure produces a visible error, distinct from an empty successful result, and a later search can still succeed.

This frontend interaction uses a supplied asynchronous fixture; it does not require a new endpoint.

## Constraints

- Preserve the search-service interface and asynchronous behavior.
- Do not disable subsequent searches or hardcode the reproduction results.
- Preserve the existing page and do not add dependencies or unrelated controls.

## Success criteria

1. One completed search displays its returned labels.
2. After overlapping searches finish, displayed results belong to the latest query.
3. A failed search is distinguishable from a successful search with no matches.
