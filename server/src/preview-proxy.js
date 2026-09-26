import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { getSandboxPreviewUrl } from "./daytona.js";
import { getSessionRecord } from "./session-store.js";

const SKIP_WARNING_HEADERS = { "x-daytona-skip-preview-warning": "true" };
const REQUEST_TIMEOUT_MS = 60_000;
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
  const upstream = new URL(upstreamEntry.url);
  const target = new URL(pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`, upstream.origin);

  const attempt = async (signedUrl) => {
    const upstreamUrl = new URL(signedUrl);
    return fetch(new URL(target.pathname + target.search, upstreamUrl.origin), {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers: {
        accept: req.headers.accept || "*/*",
        ...(req.headers.range ? { range: req.headers.range } : {}),
        ...SKIP_WARNING_HEADERS,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };

  let upstreamResponse;
  try {
    upstreamResponse = await attempt(upstreamEntry.url);
    if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
      // The signed preview URL expired mid-flight — re-sign once and retry.
      upstreamCache.delete(upstreamEntry.sessionId);
      const fresh = await resolveUpstream(upstreamEntry.sessionId);
      if (!fresh) return res.status(502).json({ error: "The lab preview is no longer running. Reopen the exercise to start a new sandbox." });
      upstreamResponse = await attempt(fresh.url);
    }
  } catch (error) {
    if (!res.headersSent) res.status(502).json({ error: `The lab preview is not responding. ${String(error?.cause?.code || error?.message || error).slice(0, 120)}` });
    return;
  }

  res.status(upstreamResponse.status).set(proxyResponseHeaders(upstreamResponse));
  for (const name of STRIPPED_HEADERS) res.removeHeader(name);
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
    return res.status(405).json({ error: "Preview proxying supports GET requests only." });
  }

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

export const __testables = { verifyPreviewToken, isPreviewHost, sessionIdFromHost };
