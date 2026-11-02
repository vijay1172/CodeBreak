// Optional interaction/regression check against a running local frontend.
// All backend traffic is mocked. No account, database, Daytona or Gemini call.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.BROKENREPO_TEST_URL || "http://localhost:5174";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const output = new URL("../outputs/coach/", import.meta.url);
await mkdir(output, { recursive: true });
const fixtureFiles = [
  "client/src/App.jsx", "client/src/extra.js", "client/src/helpers.js", "client/src/styles.css", "server/app.js", "README.md", ".env", "node_modules/hidden.js",
].map((path) => ({ path, content: path.endsWith("css") ? "body { margin: 0; }" : "export const observation = 1;", editable: !path.endsWith("md") }));
const challenge = { id: "the-stubborn-counter", title: "The Stubborn Counter", category: "Frontend state bug", difficulty: "beginner", stack: "MERN", previewEnabled: true, runtimeKind: "frontend", problemStatement: "A counter loses rapid updates. Reproduce the behavior and inspect the evidence.", criteria: [{ id: "behavior", title: "handles the observed behavior" }], hints: { tier1: "Investigate the evidence", tier2: "Compare observations", tier3: "TEST-ONLY HINT: NEVER SEND" }, debrief: { rootCause: "TEST-ONLY SOLUTION: NEVER SEND", realWorldContext: "Fixture", patternToWatch: "Fixture" }, files: fixtureFiles };
const id = "ca5735a3-b641-4d50-a161-5f09d06954f5";
const responseText = "A TypeError describes an operation receiving a value it cannot use. What did you observe? <img src=x onerror=alert(1)>";

async function fixture(context) {
  const state = { asks: [], saves: 0, runs: 0, stopwatch: 0, errorOnce: true };
  await context.addInitScript(() => {
    localStorage.setItem("brokenrepo-theme", "dark");
    // Page-close beacons can outlive routing in a closing browser context.
    // Stub this test-only cleanup to keep even unload traffic off real APIs.
    navigator.sendBeacon = () => true;
  });
  await context.route("**/api/backend/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    const path = url.pathname.replace("/api/backend", "");
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/auth/me") return json({ user: { id: "test-user", email: "test@example.invalid" } });
    if (path === "/track") return route.fulfill({ status: 204 });
    if (path === "/sessions" && req.method() === "POST") return json({ sessionId: id, status: "provisioning", challenge, starterFiles: fixtureFiles, stopwatch: { elapsedMs: 0, running: false, started: false } }, 202);
    if (path.endsWith("/coach")) {
      const payload = req.postDataJSON();
      state.asks.push(payload);
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (state.errorOnce) { state.errorOnce = false; return json({ error: "The coach couldn’t respond. Please try again." }, 502); }
      return json({ reply: responseText });
    }
    if (path.endsWith("/preview")) return json({ url: `${base}/__coach_test_preview`, expiresAt: "2099-01-01T00:00:00Z" });
    if (path.endsWith("/logs/stream")) return route.fulfill({ status: 200, contentType: "text/event-stream", body: 'event: log\ndata: {"channel":"stdout","message":"Fixture server ready","timestamp":"2026-11-01T00:00:00Z"}\n\nevent: network\ndata: {"method":"GET","endpoint":"/api/example","status":200,"durationMs":3,"timestamp":"2026-11-01T00:00:00Z","responseBody":"{\\"ok\\":true}"}\n\n' });
    if (path.endsWith("/files")) { state.saves++; return json({ message: "Your code is saved and the preview is refreshed.", previewUpdated: true }); }
    if (path.endsWith("/run")) { state.runs++; return json({ phase: "test", exitCode: 0, stdout: "", stderr: "", diagnostics: [], tests: [{ id: "behavior", title: "handles the observed behavior", status: "passed", durationMs: 1, error: null }], summary: { passed: 1, failed: 0, total: 1 }, allPassed: true }); }
    if (path === "/progress/stopwatch") { state.stopwatch++; return json({ elapsedMs: 0, running: true, started: true }); }
    if (req.method() === "DELETE" || path.endsWith("/end")) return route.fulfill({ status: 204 });
    if (path === `/sessions/${id}`) return json({ sessionId: id, challengeId: challenge.id, status: "ready", files: {}, error: null, lastRun: null });
    if (path === "/progress") return json({ progress: [] });
    throw new Error(`Unmocked application route: ${path}`);
  });
  await context.route("**/__coach_test_preview", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body style='background:#14202d;color:#e0e8f2;font-family:system-ui'><h1>Counter preview fixture</h1><button>Rapid +3</button></body></html>" }));
  return state;
}

async function editorGeometry(page) {
  // Autofocus may scroll the document. Compare layout in document coordinates,
  // while still detecting any movement, resizing or editor-width regression.
  return page.locator(".workspace-editor-column").evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x: x + window.scrollX, y: y + window.scrollY, width, height };
  });
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const state = await fixture(desktop);
  const page = await desktop.newPage();
  await page.goto(`${base}/lab/the-stubborn-counter`);
  await expect(page.getByText("Sandbox ready", { exact: true })).toBeVisible();
  for (const tab of ["Preview", "Console", "Runtime Logs", "Network", "Tests"]) await expect(page.getByRole("tab", { name: tab, exact: true })).toBeAttached();
  const launcher = page.getByRole("button", { name: "AI Coach", exact: true });
  const sidebar = page.getByRole("complementary", { name: "AI Debugging Coach", exact: true });
  const editorBefore = await editorGeometry(page);
  await expect(launcher).toBeVisible();
  await page.screenshot({ path: new URL("desktop-launcher.png", output).pathname, fullPage: true });
  // The launcher is pinned outside the horizontally scrolling runtime tabs.
  await page.locator(".right-panel-tabs").evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  const launcherBox = await launcher.boundingBox(), runtimeBox = await page.locator(".right-panel").boundingBox();
  assert.ok(launcherBox.x >= runtimeBox.x && launcherBox.x + launcherBox.width <= runtimeBox.x + runtimeBox.width);
  await launcher.click();
  await expect(sidebar).toBeVisible();
  await expect(page.getByText("Let’s follow the evidence.", { exact: true })).toBeVisible();
  const resize = page.getByRole("separator", { name: "Resize AI Coach", exact: true });
  const initialBox = await sidebar.boundingBox(), handle = await resize.boundingBox();
  const initialWidth = Math.round(initialBox.width);
  await page.screenshot({ path: new URL("desktop-welcome.png", output).pathname, fullPage: true });
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 - 120, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();
  assert.equal(await page.locator("body").evaluate((element) => element.classList.contains("coach-is-resizing")), false);
  assert.ok((await sidebar.boundingBox()).width >= initialBox.width + 110, "Dragging the left edge must widen the Coach");
  assert.deepEqual(await editorGeometry(page), editorBefore, "Opening/resizing Coach must not change the editor geometry");
  await resize.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(Number(await resize.getAttribute("aria-valuenow")), initialWidth + 96);
  await page.keyboard.press("Escape");
  await expect(sidebar).toBeHidden();
  await expect(launcher).toBeFocused();
  await launcher.click();
  assert.equal(Math.round((await sidebar.boundingBox()).width), initialWidth + 96, "Width must survive closing and reopening");
  await resize.dblclick();
  assert.equal(Number(await resize.getAttribute("aria-valuenow")), initialWidth);
  await page.getByRole("button", { name: "How can I verify a fix?", exact: true }).click();
  const question = page.getByRole("textbox", { name: "Your question", exact: true });
  await expect(question).toHaveValue("How can I verify a fix?");
  assert.equal(state.asks.length, 0, "Starter questions must not auto-send");
  await question.fill("What is a TypeError? @");
  const picker = page.getByRole("group", { name: "Choose workspace attachments", exact: true });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: ".env", exact: true })).toHaveCount(0);
  await expect(picker.getByRole("button", { name: "hidden.js", exact: true })).toHaveCount(0);
  for (const name of ["App.jsx", "extra.js", "helpers.js", "styles.css", "app.js"]) await picker.getByRole("button", { name, exact: true }).click();
  await picker.getByRole("button", { name: "README.md", exact: true }).click();
  await expect(page.getByText("You can attach up to five files. Remove one to choose another.")).toBeVisible();
  await expect(picker.getByRole("button", { name: "App.jsx", exact: true })).toHaveAttribute("aria-pressed", "true");
  const popupBox = await picker.boundingBox(), panelBox = await page.locator(".debugging-coach").boundingBox();
  assert.ok(popupBox.y >= panelBox.y && popupBox.y + popupBox.height <= panelBox.y + panelBox.height, "File picker must fit inside the Coach panel");
  await page.screenshot({ path: new URL("desktop-picker.png", output).pathname, fullPage: true });
  await page.getByRole("button", { name: "Done selecting", exact: true }).click();
  for (const path of ["client/src/extra.js", "client/src/helpers.js", "server/app.js"]) await page.getByRole("button", { name: `Remove ${path}`, exact: true }).click();
  await expect(page.getByRole("list", { name: "Attached workspace files", exact: true }).getByRole("listitem")).toHaveCount(2);
  await page.locator(".cm-content").fill("export const changedObservation = 2;");
  await expect(page.getByText("Save your code before sending: an attached file has unsaved changes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Save code", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Choosing a next investigation step…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry question", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove client/src/styles.css", exact: true }).click();
  await page.getByRole("button", { name: "Retry question", exact: true }).click();
  await expect(page.getByText(responseText, { exact: true })).toBeVisible();
  await expect(page.locator(".coach-conversation img")).toHaveCount(0);
  await expect(page.locator(".coach-turn-user")).toHaveCount(1);
  assert.equal(state.asks.length, 2);
  assert.deepEqual(state.asks[0], { messages: [{ role: "user", text: "What is a TypeError?" }], fileIds: ["client/src/App.jsx", "client/src/styles.css"] });
  assert.deepEqual(state.asks[1], { messages: [{ role: "user", text: "What is a TypeError?" }], fileIds: ["client/src/App.jsx"] });
  assert.doesNotMatch(JSON.stringify(state.asks), /NEVER SEND|changedObservation|"content"|apiKey/);
  await page.screenshot({ path: new URL("desktop-conversation.png", output).pathname, fullPage: true });

  // A follow-up replays only the current session's text, including the coach's
  // previous reply. Attachment identifiers are current selections, not history.
  await question.fill("The request returned 500. How should I interpret that?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".coach-turn-coach")).toHaveCount(2);
  await expect(page.locator(".coach-turn-user")).toHaveCount(2);
  assert.equal(state.asks.length, 3);
  assert.deepEqual(state.asks[2], {
    messages: [
      { role: "user", text: "What is a TypeError?" },
      { role: "coach", text: responseText },
      { role: "user", text: "The request returned 500. How should I interpret that?" },
    ],
    fileIds: ["client/src/App.jsx"],
  });
  await expect(page.locator(".coach-conversation img")).toHaveCount(0);
  assert.equal(await page.evaluate((reply) => Object.values(localStorage).some((value) => value.includes(reply)), responseText), false, "Conversation text must not be persisted in localStorage");

  // Additive integration: each existing runtime surface and action still works.
  await page.getByRole("button", { name: "Close AI Coach", exact: true }).click();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(page.getByTitle("App Live Preview", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Console", exact: true }).click();
  await expect(page.locator("#right-console-panel")).toBeVisible();
  await page.getByRole("tab", { name: "Runtime Logs", exact: true }).click();
  await expect(page.getByText("Fixture server ready").first()).toBeVisible();
  await page.getByRole("tab", { name: "Network", exact: true }).click();
  await expect(page.locator("#right-network-panel").getByText("/api/example", { exact: true }).first()).toBeVisible();
  await page.getByRole("timer", { name: "Solve stopwatch" }).getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByRole("timer", { name: "Solve stopwatch" }).getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Tests", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("All tests passed.", { exact: true })).toBeVisible();
  await launcher.click();
  await expect(page.getByText(responseText, { exact: true }).first()).toBeVisible();
  assert.equal(state.saves, 1); assert.equal(state.runs, 1); assert.equal(state.stopwatch, 1);
  await page.reload();
  await expect(page.getByText("Sandbox ready", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tests", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "AI Coach", exact: true }).click();
  await expect(page.locator(".coach-turn-user")).toHaveCount(0);
  assert.equal(await page.locator('input[type="file"]').count(), 0);
  await desktop.close();

  const laptop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await fixture(laptop);
  const compact = await laptop.newPage();
  await compact.goto(`${base}/lab/the-stubborn-counter`);
  await expect(compact.getByText("Sandbox ready", { exact: true })).toBeVisible();
  const compactLauncher = compact.getByRole("button", { name: "AI Coach", exact: true });
  const compactLauncherBox = await compactLauncher.boundingBox();
  assert.ok(compactLauncherBox.x >= 0 && compactLauncherBox.x + compactLauncherBox.width <= 1280, "Pinned Coach button must fit a 13-inch laptop viewport");
  await compactLauncher.click();
  const compactResize = compact.getByRole("separator", { name: "Resize AI Coach", exact: true });
  await compactResize.focus();
  await compact.keyboard.press("Home");
  await expect(compactResize).toHaveAttribute("aria-valuenow", "320");
  await compact.keyboard.press("ArrowRight");
  await expect(compactResize).toHaveAttribute("aria-valuenow", "320");
  await compact.keyboard.press("End");
  await expect(compactResize).toHaveAttribute("aria-valuenow", "720");
  await compact.keyboard.press("ArrowLeft");
  await expect(compactResize).toHaveAttribute("aria-valuenow", "720");
  await compactResize.dblclick();
  await compact.screenshot({ path: new URL("laptop-welcome.png", output).pathname, fullPage: true });
  await laptop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await fixture(mobile);
  const phone = await mobile.newPage();
  await phone.goto(`${base}/lab/the-stubborn-counter`);
  await expect(phone.getByText("Sandbox ready", { exact: true })).toBeVisible();
  await phone.getByRole("button", { name: "AI Coach", exact: true }).click();
  await phone.getByRole("textbox", { name: "Your question", exact: true }).scrollIntoViewIfNeeded();
  await phone.getByRole("button", { name: "@file", exact: true }).click();
  await expect(phone.getByRole("group", { name: "Choose workspace attachments", exact: true })).toBeVisible();
  const phoneBox = await phone.getByRole("complementary", { name: "AI Debugging Coach" }).boundingBox();
  assert.ok(phoneBox.x >= 0 && phoneBox.x + phoneBox.width <= 390, "Coach must fit the phone viewport");
  await phone.screenshot({ path: new URL("mobile-picker.png", output).pathname, fullPage: true });
  await mobile.close();
  console.log("PASS: Pinned Coach access, pointer/keyboard resize, width persistence, unchanged editor geometry, starter questions, attachments, limits, save boundary, loading/error/retry, learner and coach conversation history, plain-text rendering, ephemeral session reset, mobile layout, and existing editor/preview/console/logs/network/tests/stopwatch interactions.");
} finally { await browser.close(); }
