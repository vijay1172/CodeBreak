// Maintainer-only verification fixtures. This directory is outside all sandbox
// projects and must never be included in learner or coach context.
import assert from "node:assert/strict";

const cases = [
  ["the-missing-name", ["renders-name"], [
    ["client/src/components/UserProfile.jsx", "user.name", "user.fullName"],
    ["server/routes/user.js", "{ id: user.id, fullName: user.fullName }", "{ id: user.id, fullName: user.fullName, name: user.fullName }"],
  ]],
  ["the-ghost-update", ["latest-search"], [
    ["client/src/components/SearchBox.jsx", "  return {\n    async run(query) {\n      const results = await search(query);\n      setResults(results);\n    },\n  };", "  let generation = 0;\n  return {\n    async run(query) {\n      const current = ++generation;\n      const results = await search(query);\n      if (current === generation) setResults(results);\n    },\n  };"],
    ["client/src/components/SearchBox.jsx", "  return {\n    async run(query) {\n      const results = await search(query);\n      setResults(results);\n    },\n  };", "  let latest;\n  return {\n    async run(query) {\n      const request = search(query);\n      latest = request;\n      const results = await request;\n      if (latest === request) setResults(results);\n    },\n  };"],
  ]],
  ["the-silent-field", ["returns-date"], [
    ["server/routes/tasks.js", "task.due_date", "task.dueDate"],
    ["server/routes/tasks.js", "task.due_date ?? null", 'Reflect.get(task, "dueDate") ?? null'],
  ]],
  ["locked-out-sometimes", ["client-server-contract"], [
    ["client/src/api/apiClient.js", '"x-auth-token": token', 'Authorization: `Bearer ${token}`'],
    ["server/middleware/auth.js", "const value = req.headers.authorization;", 'const value = req.headers.authorization ?? (req.headers["x-auth-token"] ? `Bearer ${req.headers["x-auth-token"]}` : undefined);'],
  ]],
  ["the-stubborn-counter", ["rapid-clicks", "immutable-state"], [
    ["client/src/components/LikeButton.jsx", "setCount(count + 1)", "setCount((previous) => previous + 1)"],
    ["client/src/components/LikeButton.jsx", "setCount(count + 1)", "setCount(function increment(current) { return current + 1; })"],
  ]],
  ["works-on-my-machine", ["dashboard-path", "environment-url", "trailing-slash"], [
    ["client/src/api/apiClient.js", '  void env;\n  return "http://localhost:5000";', '  return env.VITE_API_BASE_URL || "http://localhost:5000";'],
    ["client/src/api/apiClient.js", '  void env;\n  return "http://localhost:5000";', '  const configured = env?.VITE_API_BASE_URL;\n  return typeof configured === "string" && configured.length ? configured : "http://localhost:5000";'],
  ]],
  ["the-vanishing-last-item", ["full-page", "next-page"], [
    ["server/routes/products.js", "start + limit - 1", "start + limit"],
    ["server/routes/products.js", "  const end = start + limit - 1;\n  return products.slice(start, end);", "  return products.slice(start).slice(0, limit);"],
  ]],
  ["the-silent-crash", ["forwards-error", "no-false-success"], [
    ["server/routes/orders.js", ".catch(() => {});", ".catch((error) => _next(error));"],
    ["server/routes/orders.js", ".catch(() => {});", ".catch(_next);"],
  ]],
];

export const fixtureIds = cases.map(([id]) => id);
export function fixtureFor(challenge) {
  const [, expectedFailures, transformations] = cases.find(([id]) => id === challenge.id);
  return {
    expectedFailures,
    fixes: transformations.map(([filename, before, after], index) => {
      const original = challenge.files.find((file) => file.path === filename)?.content;
      assert(original?.includes(before), `${challenge.id}: verification fixture no longer matches the starter`);
      return { name: `correct implementation ${index + 1}`, files: { [filename]: original.replace(before, after) } };
    }),
  };
}
