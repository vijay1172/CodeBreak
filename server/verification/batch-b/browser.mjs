// Maintainer-only: actual Chrome, Vite, Express and isolated MongoDB. No route
// mocks, no developer/Atlas credentials and no edits to repository starters.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getChallenge } from "../../src/challenges.js";
import { fixtureIds, fixtureFor } from "./fixtures.mjs";
import { verificationEnvironment } from "./environment.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(directory, "../../../package.json"));
const { chromium, expect } = require("@playwright/test");
const selected = process.argv.slice(2);
const ids = selected.length ? fixtureIds.filter((id) => selected.includes(id)) : fixtureIds;
assert(ids.length, "No matching Batch B challenge IDs");
const output = process.env.BROKENREPO_BROWSER_OUTPUT || path.join(os.tmpdir(), "brokenrepo-batch-b-browser.json");
const report = { startedAt: new Date().toISOString(), environment: "Real Chrome / Vite / Express / isolated MongoDB; no route mocks", challenges: [] };
const persist = () => fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
const fingerprint = (challenge) => createHash("sha256").update(JSON.stringify(challenge.files)).digest("hex");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const originalEnvironment = { ...process.env };
const safeEnvironment = verificationEnvironment();
for (const key of Object.keys(process.env)) if (!Object.hasOwn(safeEnvironment, key)) delete process.env[key];
const responseFor = (page, pathname, method = "GET") => page.waitForResponse((response) => new URL(response.url()).pathname === pathname && response.request().method() === method);
const json = async (response, status) => { assert.equal(response.status(), status); return response.json(); };

async function observe({ page, context, origin, id, fixed, workspace, scripts, operations }) {
  const api = context.request;
  if (id === "the-penny-gap") {
    await page.getByLabel("Product").selectOption("label");
    await page.getByLabel("Quantity").fill("3");
    const pending = responseFor(page, "/api/invoices/preview", "POST");
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const quote = await json(await pending, 200);
    assert.equal(quote.subtotalCents, fixed ? 87 : 84);
    await expect(page.getByText(`Total: $${fixed ? "0.87" : "0.84"}`, { exact: true })).toBeVisible();
    const savedResponse = responseFor(page, "/api/invoices", "POST");
    await page.getByRole("button", { name: "Save invoice", exact: true }).click();
    const saved = await json(await savedResponse, 201);
    const history = await json(await api.get(origin + "/api/invoices"), 200);
    assert(history.invoices.some((invoice) => invoice._id === saved._id && invoice.subtotalCents === quote.subtotalCents));
    return { subtotalCents: quote.subtotalCents, savedReadBack: true };
  }
  if (id === "a-day-too-early" || id === "the-confused-timezone") {
    const assignment = id === "a-day-too-early";
    const title = assignment ? "Network review" : "Autumn fair";
    const time = page.locator("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).locator("time");
    const correct = assignment ? "March 12, 2028" : "September 20, 2026";
    const incorrect = assignment ? "March 11, 2028" : "September 19, 2026";
    await expect(time).toHaveText(correct);
    await page.getByLabel("Viewing from").selectOption("America/Los_Angeles");
    await expect(time).toHaveText(fixed ? correct : incorrect);
    return { viewer: "America/Los_Angeles", visibleDay: await time.textContent() };
  }
  if (id === "the-split-import") {
    const csv = 'email,name,company,notes\nmaya@example.com,Maya Rivera,Acme,"Call Tuesday\nafter 10am"\nleo@example.com,Leo Chen,Northwind,"Ask about, delivery"\n';
    await page.getByLabel("Spreadsheet export").setInputFiles({ name: "contacts.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    const pending = responseFor(page, "/api/imports", "POST");
    await page.getByRole("button", { name: "Import contacts", exact: true }).click();
    const response = await pending;
    assert.equal(response.status(), fixed ? 201 : 422);
    const contacts = await json(await api.get(origin + "/api/contacts"), 200);
    assert.equal(contacts.contacts.length, fixed ? 2 : 0);
    if (fixed) {
      assert.equal(contacts.contacts.find((contact) => contact.email === "maya@example.com").notes, "Call Tuesday\nafter 10am");
      await expect(page.getByText("Maya Rivera", { exact: true })).toBeVisible();
    } else await expect(page.getByRole("alert")).toBeVisible();
    return { importStatus: response.status(), savedContacts: contacts.contacts.length };
  }
  if (id === "the-room-that-wont-leave") {
    await expect(page.getByRole("heading", { name: "Team room", exact: true })).toBeVisible();
    for (let visit = 0; visit < 3; visit++) {
      await page.getByRole("button", { name: "Project notes", exact: true }).click();
      await page.getByRole("button", { name: "Team room", exact: true }).click();
    }
    await json(await api.patch(origin + "/api/members/leo/status", { data: { status: "away" } }), 200);
    const notifications = page.getByRole("complementary", { name: "Recent notifications" }).getByRole("listitem");
    await expect(notifications).toHaveCount(fixed ? 1 : 4);
    await page.getByRole("button", { name: "Project notes", exact: true }).click();
    await json(await api.patch(origin + "/api/members/leo/status", { data: { status: "online" } }), 200);
    if (!fixed) await expect(notifications).toHaveCount(8);
    else {
      // Delivery is asynchronous; this is an observation window, not a speed threshold.
      await page.waitForTimeout(200);
      await expect(notifications).toHaveCount(1);
    }
    return { notificationsAfterLeaving: await notifications.count() };
  }
  if (id === "the-borrowed-language") {
    await expect(page.getByRole("heading", { name: "Travel mug", exact: true })).toBeVisible();
    const pending = responseFor(page, "/api/products/mug");
    await page.getByLabel("Language").selectOption("fr");
    const product = await json(await pending, 200);
    await expect(page.getByRole("heading", { name: fixed ? "Tasse de voyage" : "Travel mug", exact: true })).toBeVisible();
    assert.equal(product.locale, fixed ? "fr" : "en");
    return { selectedLanguage: "fr", returnedLanguage: product.locale, title: product.title };
  }
  if (id === "the-search-that-guesses") {
    await page.getByLabel("Find a title").fill("Node.js");
    const pending = responseFor(page, "/api/library/search");
    await page.getByRole("button", { name: "Search library", exact: true }).click();
    const result = await json(await pending, 200);
    assert.equal(result.results.some((entry) => entry.code === "node-near"), !fixed);
    await expect(page.getByText("Node.js Handbook", { exact: true })).toBeVisible();
    await expect(page.getByText("NodeXjs Handbook", { exact: true })).toHaveCount(fixed ? 0 : 1);
    return { matchingCodes: result.results.map((entry) => entry.code) };
  }
  if (id === "one-click-two-bookings") {
    // Lose delivery only after a real server response has committed the booking.
    await page.evaluate(() => {
      const original = window.fetch.bind(window);
      let interrupt = true;
      window.fetch = async (input, init) => {
        const response = await original(input, init);
        if (interrupt && new URL(input, location.href).pathname === "/api/registrations" && init?.method === "POST" && response.status === 201) {
          interrupt = false;
          await response.clone().arrayBuffer();
          throw new TypeError("Simulated lost confirmation");
        }
        return response;
      };
    });
    await page.getByLabel("Name", { exact: true }).fill("Browser Learner");
    await page.getByLabel("Email", { exact: true }).fill("browser@example.com");
    await page.getByRole("button", { name: "Book a place", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Booking confirmed", exact: true })).toBeVisible();
    const saved = await json(await api.get(origin + "/api/registrations"), 200);
    const matches = saved.registrations.filter((registration) => registration.attendeeEmail === "browser@example.com");
    assert.equal(matches.length, fixed ? 1 : 2);
    return { committedRegistrationsForOneClick: matches.length };
  }
  if (id === "the-invisible-update") {
    const displayed = page.getByLabel("Displayed name", { exact: true });
    await expect(displayed).toHaveText("Maya Rivera");
    await page.getByLabel("Name", { exact: true }).fill("Browser Learner");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.locator('p[role="status"]')).toHaveText(fixed ? "Saved" : /couldn't save/);
    const stored = await json(await api.get(origin + "/api/user/profile"), 200);
    assert.equal(stored.name, fixed ? "Browser Learner" : "Maya Rivera");
    await expect(displayed).toHaveText("Browser Learner");
    if (fixed) {
      await page.getByLabel("Name", { exact: true }).fill("x");
      await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(page.locator('p[role="status"]')).toHaveText(/couldn't save/);
      await expect(displayed).toHaveText("Browser Learner");
    }
    await page.reload();
    await expect(page.getByLabel("Displayed name", { exact: true })).toHaveText(stored.name);
    return { nameAfterReload: stored.name };
  }
  if (id === "the-duplicate-order") {
    await expect(page.getByRole("button", { name: "Place Order", exact: true })).toBeVisible();
    const options = { headers: { "Idempotency-Key": "browser-operation-001" }, data: { items: [{ sku: "keyboard", quantity: 1 }] } };
    const responses = await Promise.all([api.post(origin + "/api/orders", options), api.post(origin + "/api/orders", options)]);
    assert(responses.every((response) => [200, 201].includes(response.status())));
    const [first, second] = await Promise.all(responses.map((response) => response.json()));
    assert.equal(first.orderId === second.orderId, fixed);
    const count = await workspace.models.Order.countDocuments();
    assert.equal(count, fixed ? 1 : 2);
    return { concurrentOrderCount: count, matchingIdentities: first.orderId === second.orderId };
  }
  if (id === "the-leaked-password") {
    await expect(page.getByText("Sam Student", { exact: true })).toBeVisible();
    const profile = await json(await api.get(origin + "/api/users/student-id"), 200);
    const leaked = Object.hasOwn(profile, "passwordHash") || Object.hasOwn(profile, "isAdmin");
    assert.equal(leaked, !fixed);
    return { publicProfileExposesPrivateFields: leaked };
  }
  if (id === "the-frozen-dropdown") {
    const dropdown = page.getByLabel("Categories", { exact: true });
    await expect(dropdown).toContainText("Notebooks");
    await page.getByRole("button", { name: "Pixel Arcade", exact: true }).click();
    await expect(page.getByText("Browsing Pixel Arcade", { exact: true })).toBeVisible();
    await expect(dropdown).toContainText(fixed ? "Controllers" : "Notebooks");
    if (fixed) {
      await page.getByRole("button", { name: "Empty Emporium", exact: true }).click();
      await expect(dropdown).toContainText("No categories");
    }
    return { categoryOptions: await dropdown.locator("option").allTextContents() };
  }
  if (id === "the-ghost-cart") {
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("button", { name: "Upgrade to premium", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Upgrade complete. Sign in again to refresh your plan.");
    await page.getByRole("button", { name: "Log in as maya@example.com", exact: true }).click();
    await expect(page.locator(".plan-note")).toHaveCount(0);
    await expect(page.getByText(fixed ? "Premium features unlocked." : "Upgrade to unlock premium features.", { exact: true })).toBeVisible();
    return { freshLoginShowsPremium: fixed };
  }
  if (id === "the-runaway-query") {
    await expect(page.locator("table tbody tr")).toHaveCount(fixed ? 50 : 200);
    const response = await json(await api.get(origin + "/api/admin/users?page=2&limit=20", { headers: { "x-admin-key": "level-9-clearance" } }), 200);
    assert.equal(response.users.length, fixed ? 20 : 200);
    return { defaultRows: await page.locator("table tbody tr").count(), requestedPageRows: response.users.length };
  }
  if (id === "the-missing-notification") {
    await expect(page.getByText("12 in stock", { exact: true })).toBeVisible();
    await page.getByLabel("Quantity", { exact: true }).fill("99");
    const pending = responseFor(page, "/api/orders", "POST");
    await page.getByRole("button", { name: "Place order", exact: true }).click();
    const response = await pending;
    assert.equal(response.status(), fixed ? 500 : 201);
    if (fixed) await expect(page.getByRole("alert")).toBeVisible();
    else await expect(page.getByRole("status")).toContainText("placed");
    const stock = await json(await api.get(origin + "/api/orders/stock/lamp"), 200);
    assert.equal(stock.stock, 12);
    return { insufficientStockStatus: response.status(), stock: stock.stock };
  }
  if (id === "the-public-secret") {
    await expect(page.getByRole("button", { name: "Start payment", exact: true })).toBeVisible();
    const delivered = (await Promise.all(scripts)).join("\n");
    const exposed = ["sk_test_51H8xQmVbBrokenRepoSecret", "mongodb+srv://cluster0.brokenrepo.mongodb.net/shop"].some((sentinel) => delivered.includes(sentinel));
    assert.equal(exposed, !fixed);
    if (fixed) {
      await page.getByRole("button", { name: "Start payment", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Intent requires_payment_method for 1200 cents.");
    }
    return { deliveredScriptExposesSyntheticCredential: exposed, configuredPaymentVerified: fixed };
  }
  if (id === "the-slow-search") {
    operations.sellerReads = 0;
    await page.getByLabel("Search", { exact: true }).fill("Widget");
    const pending = responseFor(page, "/api/products/search");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const response = await json(await pending, 200);
    assert.equal(response.results.length, 50);
    assert(response.results.every((product) => typeof product.seller === "string"));
    await expect(page.locator("article")).toHaveCount(50);
    const indexed = workspace.models.Product.schema.indexes().some(([fields]) => Object.hasOwn(fields, "name"));
    assert.equal(indexed, fixed);
    assert.equal(operations.sellerReads <= 1, fixed);
    return { resultCount: response.results.length, indexed, sellerReads: operations.sellerReads };
  }
  throw new Error(`No browser observation for ${id}`);
}

async function verifyVariant(challenge, variant) {
  const project = path.resolve(directory, "../../challenges", challenge.id, "project");
  // macOS exposes its temporary directory through a symlink. Vite 7 requires
  // a canonical root to keep emitted HTML paths inside the project.
  const temporary = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "brokenrepo-batch-b-browser-")));
  let workspace, context;
  const previousSecret = process.env.STRIPE_SECRET_KEY;
  try {
    process.env.STRIPE_SECRET_KEY = "sk_test_batch_b_server_only";
    for (const file of challenge.files) {
      const target = path.join(temporary, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, variant.files[file.path] ?? file.content);
    }
    await fs.symlink(path.join(project, "node_modules"), path.join(temporary, "node_modules"), "dir");
    const helpers = await import(pathToFileURL(path.join(temporary, "tests/helpers.js")));
    workspace = await helpers.workspace();
    await workspace.reset();
    const operations = { sellerReads: 0 };
    if (challenge.id === "the-slow-search") workspace.models.Product.db.set("debug", (collection, method) => {
      if (collection === workspace.models.User.collection.name && /^(?:find|aggregate)/.test(method)) operations.sellerReads++;
    });
    const { build } = await import(pathToFileURL(require.resolve("vite", { paths: [project] })));
    // Match integrated Daytona previews: build with this project's pinned Vite
    // and serve its real production dist through the existing Express app.
    await build({ root: temporary, configFile: path.join(temporary, "vite.config.js"), logLevel: "silent", build: { outDir: path.join(temporary, "dist"), emptyOutDir: true } });
    const origin = workspace.baseURL;
    context = await browser.newContext();
    const page = await context.newPage();
    const errors = [], scripts = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (challenge.id === "the-public-secret" && /javascript/.test(response.headers()["content-type"] || "")) scripts.push(response.text());
    });
    const streamReady = challenge.id === "the-room-that-wont-leave" ? responseFor(page, "/api/presence/events") : null;
    const response = await page.goto(origin);
    assert.equal(response.status(), 200);
    if (streamReady) assert.equal((await streamReady).status(), 200);
    const observation = await observe({ page, context, origin, id: challenge.id, fixed: variant.fixed, workspace, scripts, operations });
    assert.deepEqual(errors, [], "No unrelated uncaught application errors");
    return { name: variant.name, pageErrors: errors, observation };
  } finally {
    if (context) await context.close();
    if (workspace) await workspace.close();
    if (previousSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecret;
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

try {
  for (const id of ids) {
    const challenge = await getChallenge(id);
    const fixture = fixtureFor(challenge);
    const entry = { id, sourceHash: fingerprint(challenge), cases: [], verified: false };
    report.challenges.push(entry);
    try {
      const variants = [{ name: "starter", files: {}, fixed: false }, ...fixture.fixes.map((fix, index) => ({ name: `fix-${index + 1}`, files: fix.files, fixed: true }))];
      for (const variant of variants) {
        const result = await verifyVariant(challenge, variant);
        entry.cases.push(result);
        await persist();
        console.log("BROWSER", id, variant.name, "PASS", JSON.stringify(result.observation));
      }
      assert.equal(fingerprint(await getChallenge(id)), entry.sourceHash, "Browser verification must not modify repository starters");
      entry.verified = true;
    } catch (error) { entry.error = error.message; console.error("BROWSER FAILED", id, error.message); }
    await persist();
  }
} finally {
  await browser.close();
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(originalEnvironment, key)) delete process.env[key];
  Object.assign(process.env, originalEnvironment);
}
report.completedAt = new Date().toISOString();
report.verified = report.challenges.every((challenge) => challenge.verified);
await persist();
console.log("BROWSER REPORT", output, report.verified ? "PASS" : "FAIL");
if (!report.verified) process.exitCode = 1;
