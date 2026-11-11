// Phase 3 UI verification against a running local frontend. Backend traffic is
// intercepted; this test never creates an account, payment, or Daytona session.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.BROKENREPO_TEST_URL || "http://localhost:5174";
const output = new URL("../outputs/machine-coding/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function prepare(context) {
  await context.route("**/api/backend/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/track")) return route.fulfill({ status: 204 });
    if (url.pathname.endsWith("/auth/me")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "browser-test-user", email: "learner@example.test" } }) });
    if (url.pathname.endsWith("/premium-exercise")) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "A Machine Coding pass is required for this exercise." }) });
    if (url.pathname.endsWith("/challenges/the-shared-draft")) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "A BrokenRepo premium pass is required for this challenge." }) });
    return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Login required" }) });
  });
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await prepare(desktop);
  const page = await desktop.newPage();
  await page.goto(base);
  await expect(page.getByRole("link", { name: /Machine Coding/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Debug the real thing/ })).toBeVisible();
  await expect(page.locator(".seasonal-snow canvas")).toBeAttached();
  await page.screenshot({ path: new URL("home-desktop.png", output).pathname, fullPage: true });

  await page.goto(`${base}/machine-coding`);
  await expect(page.getByRole("heading", { name: "Choose an exercise" })).toBeVisible();
  await expect(page.locator(".mc-exercise-card")).toHaveCount(3);
  await expect(page.locator(".mc-access-tag.free")).toHaveCount(2);
  await expect(page.locator(".mc-access-tag.premium")).toHaveCount(1);
  // The landing markup is server-rendered; wait for the client event handlers
  // before exercising the modal interaction.
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /View premium access/ }).click();
  await expect(page.getByRole("dialog")).toContainText("₹299");
  await expect(page.getByRole("dialog")).toContainText("12 months");
  await page.screenshot({ path: new URL("premium-modal.png", output).pathname, fullPage: true });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: /Start exercise/ }).first().click();
  await expect(page).toHaveURL(`${base}/machine-coding/parking-lot`);
  await expect(page.getByRole("complementary", { name: "Exercise brief" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Machine Coding editor" })).toBeVisible();
  await expect(page.locator(".mc-editor-panel .cm-editor")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Scenario and console output" })).toBeVisible();
  await expect(page.getByRole("timer", { name: "Practice timer" })).toContainText("00:00");
  await expect(page.getByRole("heading", { name: "Core requirements" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow-up requirement" })).toBeVisible();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".mc-scenario-result")).toHaveCount(9);
  await expect(page.locator(".mc-scenario-result.failed")).toHaveCount(9);
  await expect(page.locator(".mc-score")).toContainText("0/9");
  await page.screenshot({ path: new URL("workspace-desktop.png", output).pathname, fullPage: true });

  await page.goto(`${base}/machine-coding/movie-ticket-booking`);
  await expect(page.getByRole("heading", { name: "Movie Ticket Booking" })).toBeVisible();
  await expect(page.getByRole("button", { name: /View 12-month access/ })).toBeVisible();
  assert.equal((await page.content()).includes("promotes the oldest satisfiable waitlist request"), false, "Premium scenarios must not be rendered into the locked route");
  await page.getByRole("button", { name: /View 12-month access/ }).click();
  await expect(page.getByRole("dialog")).toContainText("₹299");
  await page.goto(`${base}/lab/the-shared-draft`);
  await expect(page.getByRole("heading", { name: "Unlock challenges 28–30" })).toBeVisible();
  await expect(page.getByRole("button", { name: /View 12-month access/ })).toBeVisible();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await prepare(mobile);
  const phone = await mobile.newPage();
  await phone.goto(`${base}/machine-coding`);
  await expect(phone.locator(".mc-exercise-card")).toHaveCount(3);
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "Machine Coding landing must not overflow horizontally");
  await phone.screenshot({ path: new URL("landing-mobile.png", output).pathname, fullPage: true });
  await phone.goto(`${base}/machine-coding/car-pooling`);
  await expect(phone.getByRole("region", { name: "Machine Coding editor" })).toBeVisible();
  await expect(phone.locator(".mc-editor-panel .cm-editor")).toBeVisible();
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "Machine Coding workspace must not overflow horizontally");
  await phone.screenshot({ path: new URL("workspace-mobile.png", output).pathname, fullPage: true });
  await mobile.close();
  console.log("PASS: homepage discovery, seasonal snowfall, three exercise cards, free/premium labels, upgrade modal, desktop workspace layout, and mobile responsiveness.");
} finally {
  await browser.close();
}

