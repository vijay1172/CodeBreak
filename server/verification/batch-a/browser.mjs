// Maintainer-only real-browser checks. Never copy this directory into a sandbox
// or learner/coach context: fixtures describe correct implementations.
// Run: node server/verification/batch-a/browser.mjs [challenge-id ...]
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { once } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getChallenge } from "../../src/challenges.js";
import { fixtureIds, fixtureFor } from "./fixtures.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(directory, "../../..");
const require = createRequire(path.join(repo, "package.json"));
const { chromium, expect } = require("@playwright/test");
const requested = process.argv.slice(2);
const ids = requested.length ? fixtureIds.filter((id) => requested.includes(id)) : fixtureIds;
assert(ids.length, "No matching Batch A challenge IDs");
const output = process.env.BROKENREPO_BROWSER_OUTPUT || path.join(os.tmpdir(), "brokenrepo-batch-a-browser.json");
const report = {
  startedAt: new Date().toISOString(),
  environment: "Real Chrome / Vite preview / Express HTTP; no request mocks",
  challenges: [],
};
const persist = () => fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
const hash = (challenge) => createHash("sha256").update(JSON.stringify(challenge.files)).digest("hex");
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function observe(page, context, origin, id, fixed) {
  const result = {};
  const list = () => page.getByRole("listitem");
  if (id === "the-missing-name") {
    const profile = page.getByRole("region", { name: "User profile" });
    await expect(profile).toBeVisible();
    await expect(profile.locator("h2")).toHaveText(fixed ? "Priya Sharma" : "");
    result.displayedName = await profile.locator("h2").textContent();
  } else if (id === "the-ghost-update") {
    const input = page.getByRole("textbox", { name: "Search", exact: true });
    await input.fill("r");
    await input.fill("react");
    await expect(list()).toHaveCount(2);
    // Wait longer than the documented slow fixture, not a performance assertion.
    await page.waitForTimeout(950);
    await expect(list()).toHaveCount(fixed ? 2 : 4);
    await expect(input).toHaveValue("react");
    result.finalResults = await list().allTextContents();
    await input.fill(":offline");
    await expect(page.getByRole("alert")).toHaveText("Search is unavailable. Try another query.");
    await input.fill("");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText("No matching courses", { exact: true })).toBeVisible();
  } else if (id === "the-silent-field") {
    await expect(page.getByRole("button", { name: "Reload tasks" })).toBeEnabled();
    await page.getByLabel("Task title").fill("Submit lab");
    await page.getByLabel("Due date").fill("2026-10-01");
    const created = page.waitForResponse((response) => response.url() === origin + "/api/tasks" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create task" }).click();
    const creation = await created;
    assert.equal(creation.status(), 201);
    const stored = await creation.json();
    assert.equal(stored.dueDate, "2026-10-01");
    const expected = fixed ? "Submit lab — 2026-10-01" : "Submit lab — No due date";
    await expect(list()).toHaveText([expected]);
    await page.getByRole("button", { name: "Reload tasks" }).click();
    await expect(page.getByRole("button", { name: "Reload tasks" })).toBeEnabled();
    await expect(list()).toHaveText([expected]);
    await page.reload();
    await expect(list()).toHaveText([expected]);
    result.taskAfterReload = await list().allTextContents();
  } else if (id === "locked-out-sometimes") {
    if (fixed) {
      await expect(page.locator(".dashboard-card")).toContainText("Welcome back");
      await expect(page.getByRole("alert")).toHaveCount(0);
    } else {
      await expect(page.getByRole("alert")).toHaveText("Authentication required");
    }
    const denied = await context.request.get(origin + "/api/dashboard");
    assert.equal(denied.status(), 401);
    assert.deepEqual(await denied.json(), { message: "Authentication required" });
    const allowed = await context.request.get(origin + "/api/dashboard", {
      headers: { Authorization: "Bearer valid-token" },
    });
    assert.equal(allowed.status(), 200);
    assert.deepEqual(await allowed.json(), { message: "Welcome back", userId: "student-42" });
    result.dashboard = fixed ? "Welcome back" : "Authentication required";
  } else if (id === "the-stubborn-counter") {
    await expect(page.locator("output strong")).toHaveText("0");
    await page.getByRole("button", { name: "Add one", exact: true }).click();
    await expect(page.locator("output strong")).toHaveText("1");
    await page.getByRole("button", { name: "Rapid +3", exact: true }).click();
    await expect(page.locator("output strong")).toHaveText(fixed ? "4" : "2");
    result.displayedCount = Number(await page.locator("output strong").textContent());
  } else if (id === "works-on-my-machine") {
    if (fixed) {
      await expect(page.locator(".dashboard-card")).toContainText("Welcome back");
      await expect(page.getByRole("alert")).toHaveCount(0);
    } else {
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).not.toHaveText("");
    }
    const response = await context.request.get(origin + "/api/dashboard", {
      headers: { Authorization: "Bearer valid-token" },
    });
    assert.equal(response.status(), 200);
    assert.deepEqual(await response.json(), { message: "Welcome back", userId: "student-42" });
    result.dashboard = fixed ? "Welcome back" : await page.getByRole("alert").textContent();
  } else if (id === "the-vanishing-last-item") {
    const expected = fixed
      ? [["Product 1", "Product 2", "Product 3", "Product 4", "Product 5"], ["Product 6", "Product 7", "Product 8", "Product 9", "Product 10"], ["Product 11", "Product 12"]]
      : [["Product 1", "Product 2", "Product 3", "Product 4"], ["Product 6", "Product 7", "Product 8", "Product 9"], ["Product 11", "Product 12"]];
    result.pageSizes = [];
    for (let index = 0; index < expected.length; index += 1) {
      await expect(list()).toHaveText(expected[index]);
      result.pageSizes.push(await list().count());
      if (index < expected.length - 1) await page.getByRole("button", { name: "Next page" }).click();
    }
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  } else if (id === "the-silent-crash") {
    if (fixed) {
      await expect(page.getByRole("alert")).toHaveText("Something went wrong");
      await expect(page.getByRole("status")).toHaveCount(0);
      result.requestState = "Controlled error; loading ended";
    } else {
      await expect(page.getByRole("status")).toHaveText("Loading orders…");
      await page.waitForTimeout(250);
      await expect(page.getByRole("status")).toHaveText("Loading orders…");
      await expect(page.getByRole("alert")).toHaveCount(0);
      result.requestState = "Pending request; loading remains";
    }
  } else throw new Error("Missing browser scenario");
  return result;
}

async function verifyVariant(challenge, variant) {
  const project = path.resolve(directory, "../../challenges", challenge.id, "project");
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "brokenrepo-batch-a-browser-"));
  let api, vite, context;
  try {
    for (const file of challenge.files) {
      const target = path.join(temporary, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, variant.files[file.path] ?? file.content);
    }
    await fs.symlink(path.join(project, "node_modules"), path.join(temporary, "node_modules"), "dir");
    const applicationModule = await import(pathToFileURL(path.join(temporary, "server/app.js")));
    const app = applicationModule.createApp ? applicationModule.createApp() : applicationModule.app;
    api = app.listen(0, "127.0.0.1");
    await once(api, "listening");
    const apiOrigin = "http://127.0.0.1:" + api.address().port;
    const { createServer } = await import(pathToFileURL(require.resolve("vite", { paths: [project] })));
    vite = await createServer({
      root: temporary, configFile: false, cacheDir: path.join(temporary, ".vite"),
      esbuild: { jsx: "automatic" },
      server: { host: "127.0.0.1", port: 0, proxy: { "/api": apiOrigin } },
    });
    await vite.listen();
    const origin = "http://127.0.0.1:" + vite.httpServer.address().port;
    context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [], failedRequests = [], apiRequests = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => failedRequests.push({
      url: request.url(), error: request.failure()?.errorText,
    }));
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
    });
    const response = await page.goto(origin);
    assert.equal(response.status(), 200);
    const observation = await observe(page, context, origin, challenge.id, variant.fixed);
    assert.deepEqual(pageErrors, [], "No uncaught browser runtime errors");
    const expectedFailure = challenge.id === "works-on-my-machine" && !variant.fixed;
    assert.deepEqual(failedRequests.filter((request) => !(expectedFailure && request.url === "http://localhost:5000/api/dashboard")), [], "No unexpected browser network failures");
    if (challenge.id === "works-on-my-machine") {
      assert(apiRequests.includes(variant.fixed ? origin + "/api/dashboard" : "http://localhost:5000/api/dashboard"));
    }
    return { name: variant.name, verified: true, htmlStatus: 200, pageErrors, failedRequests, observation };
  } finally {
    if (context) await context.close();
    if (vite) await vite.close();
    if (api) {
      api.closeAllConnections();
      await new Promise((resolve) => api.close(resolve));
    }
    // Remove only the exact mkdtemp-created verification copy, never a starter.
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

try {
  for (const id of ids) {
    const challenge = await getChallenge(id);
    const sourceHash = hash(challenge);
    const fixture = fixtureFor(challenge);
    const entry = { id, sourceHash, cases: [], verified: false };
    report.challenges.push(entry);
    try {
      const variants = [
        { name: "starter", files: {}, fixed: false },
        ...fixture.fixes.map((fix, index) => ({ name: "fix-" + (index + 1), files: fix.files, fixed: true })),
      ];
      for (const variant of variants) {
        const result = await verifyVariant(challenge, variant);
        entry.cases.push(result);
        await persist();
        console.log("BROWSER", id, variant.name, "PASS", JSON.stringify(result.observation));
      }
      entry.verified = true;
    } catch (error) {
      entry.error = error.message;
      console.error("BROWSER FAILED", id, error.message);
    } finally {
      try {
        assert.equal(hash(await getChallenge(id)), sourceHash, "Browser verification must not alter any repository starter file");
        entry.sourceUnchanged = true;
      } catch (error) { entry.sourceUnchanged = false; entry.verified = false; entry.sourceError = error.message; }
      await persist();
    }
  }
} finally { await browser.close(); }
report.completedAt = new Date().toISOString();
report.verified = report.challenges.every((challenge) => challenge.verified && challenge.sourceUnchanged);
await persist();
console.log("BROWSER REPORT", output, report.verified ? "PASS" : "FAIL");
if (!report.verified) process.exitCode = 1;
