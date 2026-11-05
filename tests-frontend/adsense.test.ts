import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADSENSE_CLIENT_ID, isMonetizedRoute } from "../lib/adsense.ts";

test("AdSense is enabled only on approved public content routes", () => {
  for (const pathname of ["/", "/challenges", "/challenges/the-missing-name", "/incidents", "/incidents/example-bug"]) {
    assert.equal(isMonetizedRoute(pathname), true, pathname);
  }

  for (const pathname of ["/lab/the-missing-name", "/login", "/signup", "/progress", "/contact", "/admin", "/api/backend/session"]) {
    assert.equal(isMonetizedRoute(pathname), false, pathname);
  }
});

test("the publisher metadata and route-aware loader use the approved account", () => {
  const layout = fs.readFileSync(path.resolve("app/layout.tsx"), "utf8");
  const loader = fs.readFileSync(path.resolve("components/adsense-loader.tsx"), "utf8");
  assert.equal(ADSENSE_CLIENT_ID, "ca-pub-6116683724702543");
  assert.match(layout, /"google-adsense-account": ADSENSE_CLIENT_ID/);
  assert.match(layout, /<AdSenseLoader\/>/);
  assert.match(loader, /isMonetizedRoute\(pathname\)/);
  assert.match(loader, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
  assert.match(loader, /crossOrigin = "anonymous"/);
});

test("ads.txt authorizes the same direct Google seller account", () => {
  const adsTxt = fs.readFileSync(path.resolve("public/ads.txt"), "utf8").trim();
  assert.equal(adsTxt, "google.com, pub-6116683724702543, DIRECT, f08c47fec0942fa0");
});
