import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PREVIEW_PROXY_DOMAIN_SUFFIX = "preview.brokenrepo.tech";
process.env.PREVIEW_PROXY_SECRET = "test-secret";

const { __testables, signPreviewToken } = await import("../src/preview-proxy.js");

test("signed preview tokens verify and expire", () => {
  const sessionId = "8d8c2674-ce7f-438e-98d5-e284ce8d4f78";
  const token = signPreviewToken(sessionId, 60);
  assert.equal(__testables.verifyPreviewToken(sessionId, token), true);
  assert.equal(__testables.verifyPreviewToken("other-session", token), false);
  assert.equal(__testables.verifyPreviewToken(sessionId, `${token.slice(0, -13)}0000000000`), false);
  const expired = signPreviewToken(sessionId, -10);
  assert.equal(__testables.verifyPreviewToken(sessionId, expired), false);
});

test("preview host detection and session extraction", () => {
  const sessionId = "46d6a3fa-42dc-42d4-89d5-1bb74ed60833";
  assert.equal(__testables.isPreviewHost(`${sessionId}.preview.brokenrepo.tech`), true);
  assert.equal(__testables.isPreviewHost("codebreak-api.onrender.com"), false);
  assert.equal(__testables.isPreviewHost("evil.preview.brokenrepo.tech.evil.com"), false);
  assert.equal(__testables.sessionIdFromHost(`${sessionId}.preview.brokenrepo.tech`), sessionId);
  assert.equal(__testables.sessionIdFromHost("preview.brokenrepo.tech"), null);
  assert.equal(__testables.sessionIdFromHost(`../etc.preview.brokenrepo.tech`), null);
});

test("page navigation detection drives the SPA fallback", () => {
  const { isPageNavigation } = __testables;
  assert.equal(isPageNavigation("/dashboard", "text/html,application/xhtml+xml"), true);
  assert.equal(isPageNavigation("/", "*/*"), false);
  assert.equal(isPageNavigation("/assets/index-abc.js", "text/html"), false);
  assert.equal(isPageNavigation("/api/orders", "application/json"), false);
  assert.equal(isPageNavigation("/logo.png", "image/png"), false);
});
test("upstream URL building never doubles the query string", () => {
  const { buildUpstreamUrl } = __testables;
  const upstream = new URL("https://upstream.example:3000");
  assert.equal(buildUpstreamUrl(upstream, "/?probe=1").href, "https://upstream.example:3000/?probe=1");
  assert.equal(buildUpstreamUrl(upstream, "/cart?x=1&y=2").href, "https://upstream.example:3000/cart?x=1&y=2");
  assert.equal(buildUpstreamUrl(upstream, "/").href, "https://upstream.example:3000/");
  assert.equal(buildUpstreamUrl(upstream, "/no-query").href, "https://upstream.example:3000/no-query");
});
