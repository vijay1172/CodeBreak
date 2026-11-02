# The Stubborn Counter

## Product context

A learning app includes a like counter with single and grouped actions. Rapid clicks are batched, but the like counter increases only once instead of once per click.

## How to reproduce

1. Open Live Preview and note the **Likes** count, initially `0`.
2. Click **Add one**; the count should increase by one.
3. Click **Rapid +3** once.
4. Observe that the count increases by only one; it should increase by three.

## Expected behavior

Each requested increment is reflected in the rendered total.

- Initial count: `0`.
- **Add one** increases the current count by `1`.
- **Rapid +3** increases the current count by `3`.
- Repeated and mixed actions accumulate from the current total.

This frontend interaction does not require a persistence endpoint.

## Constraints

- Preserve the controls and their meaning.
- Do not replace the supplied grouped interaction with a different action that bypasses its behavior.
- Do not hardcode totals or introduce a backend dependency.

## Success criteria

1. A single-increment action increases the displayed total by one.
2. A grouped action increases the displayed total by three.
3. Successive grouped and single actions remain cumulative.
