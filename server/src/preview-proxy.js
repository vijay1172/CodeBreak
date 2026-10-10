import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { getSandboxPreviewUrl } from "./daytona.js";
import { getSessionRecord } from "./session-store.js";

const SKIP_WARNING_HEADERS = { "x-daytona-skip-preview-warning": "true" };
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_HTML_BUFFER = 1_000_000;

// Injected into every proxied HTML page. It reports route changes to the lab
// pane (postMessage) and executes back/forward/navigate commands from it —
// the iframe is cross-origin, so this cooperation is the only way for the
// pane to mirror and steer client-side navigation.
const previewCompanionSource = `
(function () {
  var send = function () {
    try { parent.postMessage({ type: "brokenrepo:location", path: location.pathname + location.search }, "*"); } catch (e) {}
  };
  var push = history.pushState;
  var replace = history.replaceState;
  history.pushState = function () { var r = push.apply(history, arguments); send(); return r; };
  history.replaceState = function () { var r = replace.apply(history, arguments); send(); return r; };
  window.addEventListener("popstate", send);
  window.addEventListener("hashchange", send);
  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type === "brokenrepo:navigate" && typeof data.path === "string") { location.assign(data.path); }
    else if (data.type === "brokenrepo:history" && typeof data.delta === "number") { history.go(data.delta); }
  });
  send();
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

async function proxyRequest(req, res, upstreamEntry, pathAndQuery) {
  const target = pathAndQuery.startsWith("/") ? pathAndQuery : "/" + pathAndQuery;
  const queryIndex = target.indexOf("?");
  const pathname = queryIndex >= 0 ? target.slice(0, queryIndex) : target;
  const search = queryIndex >= 0 ? target.slice(queryIndex) : "";

  const attempt = async (entry, pathname) => {
    const upstreamUrl = new URL(entry.url);
    const body = req.rawBody && req.rawBody.length ? req.rawBody : undefined;
    return fetch(new URL(pathname + search, upstreamUrl.origin), {
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
      const injection = "<script>" + previewCompanionSource + "</script>";
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

export const __testables = { verifyPreviewToken, isPreviewHost, sessionIdFromHost, isPageNavigation };
