import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { getSandboxPreviewUrl } from "./daytona.js";
import { getSessionRecord } from "./session-store.js";

const SKIP_WARNING_HEADERS = { "x-daytona-skip-preview-warning": "true" };
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_HTML_BUFFER = 1_000_000;

// Injected into every proxied HTML page. It (a) reports route changes to the
// lab pane, (b) captures the page's console output and runtime errors and
// batches them back to the pane, and (c) executes back/forward/navigate
// commands from it — the iframe is cross-origin, so this cooperation is the
// only way for the pane to mirror and steer client-side navigation.
const previewCompanionSource = `
(function () {
  var SESSION = ${JSON.stringify("__SESSION_ID__")};
  var MAX_QUEUE = 200;
  var queue = [];
  var truncated = false;
  var sendLocation = function () {
    try { parent.postMessage({ type: "brokenrepo:location", path: location.pathname + location.search, session: SESSION }, "*"); } catch (e) {}
  };
  function formatValue(value) {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.name + ": " + value.message;
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "object") { try { return JSON.stringify(value); } catch (e) { return String(value); } }
    return String(value);
  }
  function slimValue(value, depth) {
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return String(value);
    if (value instanceof Error) return { name: value.name, message: value.message, stack: String(value.stack || "") };
    if (typeof value !== "object") return value;
    if (depth > 2) return "[depth limit]";
    var out = {};
    var keys = Object.keys(value).slice(0, 50);
    for (var i = 0; i < keys.length; i++) out[keys[i]] = slimValue(value[keys[i]], depth + 1);
    return out;
  }
  function capture(level, args) {
    if (queue.length >= MAX_QUEUE) {
      if (!truncated) { truncated = true; queue.push({ level: "warn", text: "Console output truncated — too many messages were generated.", timestamp: Date.now() }); }
      return;
    }
    var entry = { level: level, text: args.map(formatValue).join(" "), timestamp: Date.now(), route: location.pathname };
    var objects = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] !== null && typeof args[i] === "object") objects.push(slimValue(args[i], 0));
    }
    if (objects.length) entry.data = objects.length === 1 ? objects[0] : objects;
    for (var j = 0; j < args.length; j++) {
      if (args[j] instanceof Error) { entry.stack = String(args[j].stack || ""); break; }
    }
    queue.push(entry);
  }
  ["log", "info", "warn", "error", "debug"].forEach(function (level) {
    var original = console[level];
    if (typeof original !== "function") return;
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      try { capture(level, args); } catch (e) {}
      return original.apply(console, args);
    };
  });
  window.addEventListener("error", function (event) {
    try { capture("error", [event.message || "Script error"]); var entry = queue[queue.length - 1]; if (entry && event.error && event.error.stack) entry.stack = String(event.error.stack); } catch (e) {}
  });
  window.addEventListener("unhandledrejection", function (event) {
    try {
      var reason = event.reason;
      capture("error", ["Unhandled rejection: " + (reason && reason.message ? reason.message : String(reason))]);
      var entry = queue[queue.length - 1];
      if (entry && reason && reason.stack) entry.stack = String(reason.stack);
    } catch (e) {}
  });
  var flush = function () {
    if (!queue.length) return;
    var payload = { type: "brokenrepo:console", session: SESSION, entries: queue, truncated: truncated };
    queue = [];
    truncated = false;
    try { parent.postMessage(payload, "*"); } catch (e) {}
  };
  setInterval(flush, 200);
  var push = history.pushState;
  var replace = history.replaceState;
  history.pushState = function () { var r = push.apply(history, arguments); sendLocation(); return r; };
  history.replaceState = function () { var r = replace.apply(history, arguments); sendLocation(); return r; };
  window.addEventListener("popstate", sendLocation);
  window.addEventListener("hashchange", sendLocation);
  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type === "brokenrepo:navigate" && typeof data.path === "string") { location.assign(data.path); }
    else if (data.type === "brokenrepo:history" && typeof data.delta === "number") { history.go(data.delta); }
  });
  sendLocation();
})();
`;
const UPSTREAM_GRACE_MS = 120_000;

// Session id -> signed upstream URL cache. Signing hits the Daytona API, and
// every module of the student app streams through here, so reuse while valid.
const upstreamCache = new Map();

export function previewProxyConfigured() {
  return Boolean(config.previewProxyDomainSuffix && config.previewProxySecret);
}

export function previewHostForSession(sessionId) {
  return `${sessionId}.${config.previewProxyDomainSuffix}`;
}

export function signPreviewToken(sessionId, ttlSeconds = 3600) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const mac = createHmac("sha256", config.previewProxySecret).update(`${sessionId}.${expiresAt}`).digest("base64url");
  return `${mac}.${expiresAt}`;
}

export function verifyPreviewToken(sessionId, token) {
  const [mac, expiresAt] = String(token || "").split(".");
  const expiry = Number(expiresAt);
  if (!mac || !Number.isInteger(expiry) || expiry * 1000 < Date.now()) return false;
  const expected = createHmac("sha256", config.previewProxySecret).update(`${sessionId}.${expiry}`).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isPreviewHost(hostname) {
  return Boolean(
    config.previewProxyDomainSuffix &&
    hostname.endsWith(`.${config.previewProxyDomainSuffix}`),
  );
}

export function sessionIdFromHost(hostname) {
  const label = hostname.slice(0, -(config.previewProxyDomainSuffix.length + 1));
  if (!/^[a-z0-9-]{8,64}$/.test(label)) return null;
  return label;
}

async function resolveUpstream(sessionId) {
  const cached = upstreamCache.get(sessionId);
  if (cached && cached.urlExpiresAt - UPSTREAM_GRACE_MS > Date.now()) return cached;
  const record = await getSessionRecord(sessionId);
  if (!record || !["ready", "running"].includes(record.status) || !record.sandboxId) return null;
  const preview = await getSandboxPreviewUrl({ sandboxId: record.sandboxId, port: record.previewPort || 3000 });
  const entry = {
    url: preview.url,
    urlExpiresAt: Date.parse(preview.expiresAt),
  };
  upstreamCache.set(sessionId, entry);
  return entry;
}

// A "page navigation" is a request that should fall back to the app document
// when the challenge app has no route for it: HTML-accepting requests whose
// final path segment carries no file extension. Scripts, fetches, and assets
// keep their real responses.
function isPageNavigation(pathname, acceptHeader) {
  const lastSegment = pathname.split("?")[0].split("/").pop() || "";
  if (lastSegment.includes(".")) return false;
  return String(acceptHeader || "").includes("text/html");
}

function proxyResponseHeaders(upstreamResponse) {
  const headers = {};
  for (const name of ["content-type", "content-length", "cache-control", "etag", "last-modified", "accept-ranges", "content-range"]) {
    const value = upstreamResponse.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

// helmet() has already stamped our API's defaults onto this response; the
// streamed document is a different origin's app and must be frameable there.
const STRIPPED_HEADERS = ["x-frame-options", "content-security-policy", "cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy", "origin-agent-cluster"];

// pathWithQuery must already carry its own query string ("/route?x=1"); the
// URL constructor resolves it against the upstream origin exactly once, so a
// query never gets appended twice.
function buildUpstreamUrl(upstreamUrl, pathWithQuery) {
  return new URL(pathWithQuery, upstreamUrl.origin);
}

async function proxyRequest(req, res, upstreamEntry, pathAndQuery) {
  const target = pathAndQuery.startsWith("/") ? pathAndQuery : "/" + pathAndQuery;

  const attempt = async (entry, pathWithQuery) => {
    const upstreamUrl = new URL(entry.url);
    const body = req.rawBody && req.rawBody.length ? req.rawBody : undefined;
    return fetch(buildUpstreamUrl(upstreamUrl, pathWithQuery), {
      method: req.method,
      headers: {
        accept: req.headers.accept || "*/*",
        ...(req.headers["content-type"] ? { "content-type": req.headers["content-type"] } : {}),
        ...(body ? { "content-length": String(body.length) } : {}),
        ...SKIP_WARNING_HEADERS,
      },
      body: req.method === "HEAD" ? undefined : body,
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };

  let upstreamResponse;
  try {
    upstreamResponse = await attempt(upstreamEntry, target);
    if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
      // The signed preview URL expired mid-flight — re-sign once and retry.
      upstreamCache.delete(upstreamEntry.sessionId);
      const fresh = await resolveUpstream(upstreamEntry.sessionId);
      if (!fresh) return res.status(502).json({ error: "The lab preview is no longer running. Reopen the exercise to start a new sandbox." });
      upstreamResponse = await attempt(fresh, target);
    }
    // SPA fallback: a page navigation the challenge app does not route (a deep
    // link to an unknown client route) gets the app document instead of a 404,
    // so client-routed apps can be deep-linked. Assets, API calls, and other
    // non-page requests keep their real 404.
    if (upstreamResponse.status === 404 && isPageNavigation(target, req.headers.accept)) {
      upstreamResponse = await attempt(upstreamEntry, "/");
    }
  } catch (error) {
    if (!res.headersSent) res.status(502).json({ error: `The lab preview is not responding. ${String(error?.cause?.code || error?.message || error).slice(0, 120)}` });
    return;
  }

  const headers = proxyResponseHeaders(upstreamResponse);
  for (const name of STRIPPED_HEADERS) res.removeHeader(name);

  const contentType = upstreamResponse.headers.get("content-type") || "";
  if (/text\/html/i.test(contentType) && req.method === "GET") {
    const raw = Buffer.from(await upstreamResponse.arrayBuffer());
    if (raw.length <= MAX_HTML_BUFFER) {
      let bodyText = raw.toString("utf8");
      const injection = "<script>" + previewCompanionSource.replaceAll("__SESSION_ID__", upstreamEntry.sessionId) + "</script>";
      const closeAt = bodyText.toLowerCase().lastIndexOf("</body>");
      if (closeAt >= 0) bodyText = bodyText.slice(0, closeAt) + injection + bodyText.slice(closeAt);
      else bodyText += injection;
      delete headers["content-length"];
      delete headers.etag;
      res.status(upstreamResponse.status).set(headers);
      return res.send(bodyText);
    }
  }

  res.status(upstreamResponse.status).set(headers);
  if (!upstreamResponse.body) return res.end();
  const reader = upstreamResponse.body.getReader();
  req.on("close", () => reader.cancel().catch(() => {}));
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

export function previewProxyHandler(req, res, next) {
  if (!isPreviewHost(req.hostname)) return next();
  const sessionId = sessionIdFromHost(req.hostname);
  if (!sessionId) return res.status(404).json({ error: "Unknown preview host." });

  if (req.method !== "GET" && req.method !== "HEAD") {
    // Buffer the request body up front; the fetch happens later in the
    // async continuation once the session and upstream are resolved.
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      req.rawBody = Buffer.concat(chunks);
      handlePreviewRequest(req, res);
    });
    return;
  }
  handlePreviewRequest(req, res);
}

function handlePreviewRequest(req, res) {
  const sessionId = sessionIdFromHost(req.hostname);
  if (!sessionId) return res.status(404).json({ error: "Unknown preview host." });

  const pathAndQuery = req.originalUrl || req.url;
  const tokenMatch = pathAndQuery.match(/^\/([A-Za-z0-9_-]+\.\d{10})(?:\/index\.html)?\/?$/);

  (async () => {
    if (pathAndQuery === "/healthz") return res.json({ ok: true, service: "brokenrepo-preview-proxy" });

    // The document load carries the signed token; every sub-resource after it
    // is authorized by the sandbox id baked into the hostname.
    if (tokenMatch) {
      if (!verifyPreviewToken(sessionId, tokenMatch[1])) {
        return res.status(403).send("<title>Preview link expired</title><p>This preview link has expired. Reopen the exercise to get a fresh one.</p>");
      }
    } else if (!upstreamCache.has(sessionId)) {
      // Sub-resource without a prior document: resolve from the DB so a cold
      // proxy node can still serve it.
      const record = await getSessionRecord(sessionId);
      if (!record || !["ready", "running"].includes(record.status)) {
        return res.status(404).json({ error: "Unknown preview session." });
      }
    }

    const upstreamEntry = await resolveUpstream(sessionId);
    if (!upstreamEntry) {
      return res.status(503).json({ error: "The lab preview is starting or has ended." });
    }
    upstreamEntry.sessionId = sessionId;
    return proxyRequest(req, res, upstreamEntry, tokenMatch ? "/" : pathAndQuery);
  })().catch((error) => {
    if (!res.headersSent) res.status(502).json({ error: `Preview proxy failure. ${String(error?.message || error).slice(0, 160)}` });
    else res.end();
  });
}

export function resetPreviewProxyCacheForTests() {
  upstreamCache.clear();
}

export const __testables = { verifyPreviewToken, isPreviewHost, sessionIdFromHost, isPageNavigation, buildUpstreamUrl };
