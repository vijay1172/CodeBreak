export type Challenge = {
  id: string;
  number: string;
  title: string;
  category: string;
  difficulty: "Beginner" | "Intermediate";
  statement: string;
  files: Record<string, string>;
  hints: [string, string, string];
  tests: [string, string, string];
  validate: (files: Record<string, string>) => boolean;
  debrief: { rootCause: string; realWorldContext: string; patternToWatch: string };
};

export const challenges: Challenge[] = [
  {
    id: "missing-name", number: "01", title: "The Missing Name", category: "API contract", difficulty: "Beginner",
    statement: "The profile page should show the signed-in user's name, but it displays “undefined”. Everything else works.",
    files: {
      "client/src/components/UserProfile.jsx": `import { useEffect, useState } from "react";

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(\`/api/user/\${userId}\`)
      .then((res) => res.json())
      .then(({ name, role }) => setUser({ name, role }));
  }, [userId]);

  if (!user) return <p>Loading…</p>;
  return <section><h1>{user.name}</h1><p>{user.role}</p></section>;
}`,
      "server/routes/user.js": `router.get("/api/user/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json({ fullName: user.fullName, role: user.role });
});`,
      "tests/UserProfile.test.jsx": `it("renders the returned name", async () => {
  server.use(mockUser({ fullName: "Maya Rao" }));
  render(<UserProfile userId="42" />);
  expect(await screen.findByText("Maya Rao")).toBeVisible();
});`,
    },
    hints: ["Follow the data from the API response into the profile component.", "Compare the field used in UserProfile.jsx with the response in server/routes/user.js.", "The server sends fullName, but the component reads name. Align the contract on either side without removing the role field."],
    tests: ["GET /api/user/:id returns a successful response", "UserProfile renders the returned display name", "UserProfile preserves the user's role"],
    validate: (files) => /fullName/.test(files["client/src/components/UserProfile.jsx"] || "") || /name\s*:\s*user\.fullName/.test(files["server/routes/user.js"] || ""),
    debrief: { rootCause: "The backend renamed name to fullName, while the frontend continued destructuring the old field.", realWorldContext: "Small response-shape changes often break distant consumers without producing a clear error.", patternToWatch: "When data becomes undefined, compare the producer and consumer contracts before changing rendering logic." },
  },
  {
    id: "ghost-update", number: "02", title: "The Ghost Update", category: "Async race", difficulty: "Intermediate",
    statement: "Fast typing sometimes replaces fresh search results with older ones. The list must always match the latest query.",
    files: {
      "client/src/components/SearchBox.jsx": `useEffect(() => {
  searchUsers(query).then((results) => setResults(results));
}, [query]);`,
      "tests/SearchBox.test.jsx": `it("ignores an older response", async () => {
  await typeQuickly("react");
  expect(resultList()).toMatchQuery("react");
});`,
    },
    hints: ["Consider what happens when two requests finish in a different order than they started.", "The useEffect in SearchBox.jsx applies every response, even when its query is stale.", "Add cleanup with an ignore flag or AbortController, and only apply the latest response."],
    tests: ["Search sends the current query", "Latest result wins", "Empty query clears results"],
    validate: (files) => /AbortController|ignore\s*=|cancelled\s*=|latestRequest/i.test(files["client/src/components/SearchBox.jsx"] || ""),
    debrief: { rootCause: "An older request could resolve last and overwrite newer state.", realWorldContext: "Autocomplete and live search frequently expose this timing bug on slower networks.", patternToWatch: "Every async effect needs a plan for stale work and cleanup." },
  },
  {
    id: "silent-field", number: "03", title: "The Silent Field", category: "Schema mismatch", difficulty: "Beginner",
    statement: "Tasks save correctly, but their due dates never appear in the list.",
    files: {
      "server/routes/tasks.js": `router.get("/tasks", async (_req, res) => {
  const tasks = await Task.find();
  res.json(tasks.map((task) => ({ title: task.title, dueDate: task.due_date })));
});`,
      "server/models/Task.js": `const taskSchema = new Schema({ title: String, dueDate: Date });`,
    },
    hints: ["Trace the due-date field from the schema to the API response.", "Compare Task.js with the mapping in tasks.js.", "The schema uses dueDate, while the route reads due_date. Align the field names."],
    tests: ["Returns saved tasks", "Serializes due dates", "Keeps titles unchanged"],
    validate: (files) => /dueDate:\s*task\.dueDate/.test(files["server/routes/tasks.js"] || ""),
    debrief: { rootCause: "The route referenced the pre-migration field name due_date.", realWorldContext: "Partial schema migrations create valid-looking objects with quietly missing values.", patternToWatch: "Search every read and write site when renaming a persisted field." },
  },
  {
    id: "locked-out", number: "04", title: "Locked Out, Sometimes", category: "Auth middleware", difficulty: "Intermediate",
    statement: "Some dashboard requests return 401 even though the user has a valid session.",
    files: {
      "client/src/api/apiClient.js": `export const getDashboard = (token) => fetch("/api/dashboard", {
  headers: { "x-auth-token": token },
});`,
      "server/middleware/auth.js": `export function auth(req, res, next) {
  const value = req.headers.authorization;
  if (!value?.startsWith("Bearer ")) return res.sendStatus(401);
  req.token = value.slice(7); next();
}`,
    },
    hints: ["Compare how the client sends the token with how the server looks for it.", "Inspect the header in apiClient.js and the header read by auth.js.", "Send a standard Authorization: Bearer header, or make both sides intentionally agree."],
    tests: ["Rejects missing tokens", "Accepts dashboard token", "Forwards verified requests"],
    validate: (files) => /authorization["']?\s*:\s*[`"']Bearer/i.test(files["client/src/api/apiClient.js"] || ""),
    debrief: { rootCause: "The client and middleware used different header contracts.", realWorldContext: "Duplicated request setup makes authentication failures feel intermittent.", patternToWatch: "Centralize auth-header creation and test the complete request boundary." },
  },
  {
    id: "stubborn-counter", number: "05", title: "The Stubborn Counter", category: "React state", difficulty: "Beginner",
    statement: "Rapid clicks on Like do not all register. The count ends lower than the number of clicks.",
    files: {
      "client/src/components/LikeButton.jsx": `export function LikeButton() {
  const [count, setCount] = useState(0);
  const handleLike = () => setCount(count + 1);
  return <button onClick={handleLike}>{count} likes</button>;
}`,
      "tests/LikeButton.test.jsx": `it("counts every rapid click", async () => {
  await clickRapidly(screen.getByRole("button"), 5);
  expect(screen.getByRole("button")).toHaveTextContent("5 likes");
});`,
    },
    hints: ["Think about which count value several queued updates can see.", "Inspect the argument passed to setCount in LikeButton.jsx.", "Use React's functional updater so every increment receives the latest state."],
    tests: ["Starts at zero", "Counts a single click", "Counts rapid clicks"],
    validate: (files) => /setCount\s*\(\s*\w+\s*=>\s*\w+\s*\+\s*1\s*\)/.test(files["client/src/components/LikeButton.jsx"] || ""),
    debrief: { rootCause: "Each update read the same captured count value.", realWorldContext: "Batched UI updates make stale closure bugs easy to miss during casual testing.", patternToWatch: "Use a functional update whenever next state depends on previous state." },
  },
  {
    id: "works-on-my-machine", number: "06", title: "Works On My Machine", category: "Environment config", difficulty: "Beginner",
    statement: "The deployed app cannot load data, although the same feature works locally.",
    files: {
      "client/src/api/apiClient.js": `const API_URL = "http://localhost:5000";
export const getProducts = () => fetch(\`\${API_URL}/api/products\`).then((r) => r.json());`,
      "client/.env.example": `# Add public client configuration here
`,
    },
    hints: ["Ask whether the API address makes sense outside the developer's laptop.", "apiClient.js uses a fixed base URL instead of deployment configuration.", "Read the API URL from an environment variable and document the same key in .env.example."],
    tests: ["Builds locally", "Reads configured API URL", "Documents required config"],
    validate: (files) => /process\.env|import\.meta\.env/.test(files["client/src/api/apiClient.js"] || "") && /API/.test(files["client/.env.example"] || ""),
    debrief: { rootCause: "The production bundle still pointed to localhost.", realWorldContext: "Environment assumptions are a common reason an app works only for its author.", patternToWatch: "Deploy-time addresses belong in configuration, with an example file kept in sync." },
  },
  {
    id: "vanishing-item", number: "07", title: "The Vanishing Last Item", category: "Off-by-one", difficulty: "Intermediate",
    statement: "Pagination skips the first page and duplicates items around page boundaries.",
    files: {
      "server/routes/products.js": `router.get("/products", async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const start = page * limit;
  const products = await Product.find().skip(start).limit(limit);
  res.json(products);
});`,
      "tests/products.test.js": `expect(await getPage(1, 10)).toEqual(products.slice(0, 10));
expect(await getPage(2, 10)).toEqual(products.slice(10, 20));`,
    },
    hints: ["Write out the first index for pages 1 and 2 by hand.", "Inspect the start calculation in products.js.", "The zero-based start is (page - 1) * limit; keep the page input one-based."],
    tests: ["Page one starts at item zero", "Pages do not overlap", "Last partial page is returned"],
    validate: (files) => /\(\s*page\s*-\s*1\s*\)\s*\*\s*limit/.test(files["server/routes/products.js"] || ""),
    debrief: { rootCause: "A one-based page number was used as a zero-based offset.", realWorldContext: "Boundary bugs often survive tests that only cover middle pages.", patternToWatch: "Trace first, last, empty, and exact-multiple cases for all pagination math." },
  },
  {
    id: "silent-crash", number: "08", title: "The Silent Crash", category: "Error handling", difficulty: "Intermediate",
    statement: "When the database is unavailable, the order request hangs instead of returning a normal error.",
    files: {
      "server/routes/orders.js": `router.get("/orders", async (req, res) => {
  const orders = await Order.find({ userId: req.user.id });
  res.json(orders);
});`,
      "server/middleware/errorHandler.js": `export function errorHandler(err, _req, res, _next) {
  res.status(500).json({ message: "Something went wrong" });
}`,
    },
    hints: ["Follow what happens when the awaited database operation rejects.", "The async handler in orders.js has no error path.", "Catch the rejected query and pass the error to Express middleware with next(err), or return a deliberate error response."],
    tests: ["Returns orders", "Forwards database failure", "Sends a stable error shape"],
    validate: (files) => /try\s*{|catch\s*\(|\.catch\s*\(/.test(files["server/routes/orders.js"] || ""),
    debrief: { rootCause: "The async route had no path for a rejected database promise.", realWorldContext: "Unhandled failures can hang requests or terminate a Node process under load.", patternToWatch: "Every network and database await needs an explicit failure path." },
  },
];
