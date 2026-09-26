export const RUNTIME_HTTP_PREFIX = "__BROKENREPO_HTTP__";

// Loaded inside the student process with NODE_OPTIONS. It observes Node's HTTP
// boundary without changing challenge source files or recording request bodies,
// cookies, authorization headers, or other student data.
export const runtimeInspectorSource = `
import http from "node:http";
import { performance } from "node:perf_hooks";

const prefix = ${JSON.stringify("__BROKENREPO_HTTP__")};
const originalEmit = http.Server.prototype.emit;

http.Server.prototype.emit = function instrumentRuntime(event, ...args) {
  if (event === "request") {
    const [request, response] = args;
    const startedAt = performance.now();
    response.once("finish", () => {
      if (request.url === "/health") return;
      const payload = {
        method: request.method || "GET",
        endpoint: String(request.url || "/").slice(0, 500),
        status: response.statusCode,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        contentType: String(response.getHeader("content-type") || "").slice(0, 120),
        contentLength: String(response.getHeader("content-length") || "").slice(0, 40),
        timestamp: new Date().toISOString(),
      };
      console.log(prefix + JSON.stringify(payload));
    });
  }
  return originalEmit.call(this, event, ...args);
};
`;
