// Phase 2 cross-engine verification. This hits only the local diagnostic route;
// it does not call MongoDB, Daytona, the backend, or any external service.
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "@playwright/test";

const base = process.env.BROKENREPO_TEST_URL || "http://localhost:5174";
const requestedEngine = process.argv[2]?.toLowerCase();
const engines = [
  ["Chrome", chromium, { channel: "chrome" }],
  ["Firefox", firefox, {}],
  ["WebKit", webkit, {}],
].filter(([name]) => !requestedEngine || name.toLowerCase() === requestedEngine);

if (engines.length === 0) throw new Error("Choose Chromium, Firefox, or WebKit.");

for (const [name, browserType, launchOptions] of engines) {
  let browser;
  try {
    browser = await browserType.launch({ headless: true, ...launchOptions });
    const page = await browser.newPage();
    await page.goto(`${base}/machine-coding/engine-test`);
    await page.locator('[data-testid="engine-diagnostics"][data-status="passed"]').waitFor({ timeout: 30_000 });
    const checks = await page.locator('[data-testid="engine-diagnostics"] li').evaluateAll((items) => items.map((item) => ({ name: item.querySelector("strong")?.textContent, passed: item.getAttribute("data-passed") })));
    assert.equal(checks.length, 8, `${name} must run all eight execution checks`);
    assert.ok(checks.every((check) => check.passed === "true"), `${name} reported a failed isolation check`);
    console.log(`PASS ${name}: ${checks.map((check) => check.name).join("; ")}`);
  } finally {
    await browser?.close();
  }
}

