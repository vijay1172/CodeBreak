export const RUNTIME_HTTP_PREFIX = "__BROKENREPO_HTTP__";

// Loaded inside the student process with NODE_OPTIONS. It observes Node's HTTP
// boundary — method, endpoint, status, timing, and truncated request/response
// body summaries — without changing challenge source files. Headers (cookies,
// authorization) are never captured; bodies are capped at 2 KB and the server
// redacts secret-shaped strings before streaming to the browser.
export const runtimeInspectorSource = `
import http from "node:http";
import { performance } from "node:perf_hooks";

const prefix = ${JSON.stringify("__BROKENREPO_HTTP__")};
const BODY_LIMIT = 2048;
const originalEmit = http.Server.prototype.emit;

function appendPreview(current, chunk) {
  if (chunk == null || current.length >= BODY_LIMIT) return current;
  const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
  let next = current + text;
  if (next.length > BODY_LIMIT) next = next.slice(0, BODY_LIMIT) + "\\u2026[truncated]";
  return next;
}

function isTextual(type) {
  return /json|text|urlencoded|graphql/i.test(String(type || ""));
}

http.Server.prototype.emit = function instrumentRuntime(event, ...args) {
  if (event !== "request") return originalEmit.call(this, event, ...args);
  const [request, response] = args;
  if (String(request.url || "/").split("?")[0] === "/health") {
    return originalEmit.call(this, event, ...args);
  }
  const startedAt = performance.now();

  let requestBody = "";
  request.on("data", (chunk) => {
    requestBody = appendPreview(requestBody, chunk);
  });

  let responseBody = "";
  const writePreview = (chunk) => {
    responseBody = appendPreview(responseBody, chunk);
  };
  const originalWrite = response.write;
  response.write = function instrumentedWrite(chunk, ...rest) {
    writePreview(chunk);
    return originalWrite.call(this, chunk, ...rest);
  };
  const originalEnd = response.end;
  response.end = function instrumentedEnd(chunk, ...rest) {
    writePreview(chunk);
    return originalEnd.call(this, chunk, ...rest);
  };

  response.once("finish", () => {
    const requestType = String(request.headers["content-type"] || "");
    const payload = {
      method: request.method || "GET",
      endpoint: String(request.url || "/").slice(0, 500),
      status: response.statusCode,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      contentType: String(response.getHeader("content-type") || "").slice(0, 120),
      contentLength: String(response.getHeader("content-length") || "").slice(0, 40),
      timestamp: new Date().toISOString(),
    };
    if (requestBody) {
      payload.requestBody = isTextual(requestType) ? requestBody : "[binary body omitted]";
    }
    if (responseBody) {
      payload.responseBody = isTextual(response.getHeader("content-type")) ? responseBody : "[binary body omitted]";
    }
    console.log(prefix + JSON.stringify(payload));
  });
  return originalEmit.call(this, event, ...args);
};
`;
