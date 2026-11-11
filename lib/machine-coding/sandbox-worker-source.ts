// This source is installed in a Blob-backed Worker owned by the opaque-origin
// sandbox iframe. Student modules never execute in the BrokenRepo page realm.
export const SANDBOX_WORKER_SOURCE = String.raw`
(() => {
  "use strict";

  const nativePostMessage = self.postMessage.bind(self);
  const MAX_FILES = 12;
  const MAX_FILE_BYTES = 50_000;
  const MAX_TOTAL_BYTES = 200_000;
  const MAX_CONSOLE_ENTRIES = 200;
  const FILE_NAME = /^[A-Za-z][A-Za-z0-9_-]*\.js$/;
  const encoder = new TextEncoder();
  const consoleEntries = [];

  const safeError = (error) => error instanceof Error ? error.message : String(error);

  function serializable(value, seen = new WeakSet(), depth = 0) {
    if (depth > 8) return "[Maximum depth reached]";
    if (value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return String(value) + "n";
    if (typeof value === "function") return "[Function]";
    if (typeof value !== "object") return String(value);
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 100).map((item) => serializable(item, seen, depth + 1));
    const output = {};
    for (const key of Object.keys(value).slice(0, 100)) output[key] = serializable(value[key], seen, depth + 1);
    return output;
  }

  function capture(level, args) {
    if (consoleEntries.length >= MAX_CONSOLE_ENTRIES) return;
    consoleEntries.push({ level, args: args.map((value) => serializable(value)) });
  }

  self.console = Object.freeze({
    log: (...args) => capture("log", args),
    warn: (...args) => capture("warn", args),
    error: (...args) => capture("error", args),
  });

  const blocked = (capability) => function blockedCapability() {
    throw new Error(capability + " is disabled inside the Machine Coding sandbox.");
  };

  const blockedGlobals = {
    fetch: blocked("Network access"),
    XMLHttpRequest: blocked("Network access"),
    WebSocket: blocked("Network access"),
    EventSource: blocked("Network access"),
    importScripts: blocked("External scripts"),
    Worker: blocked("Nested workers"),
    SharedWorker: blocked("Nested workers"),
    BroadcastChannel: blocked("Cross-context messaging"),
    postMessage: blocked("Direct parent messaging"),
    close: blocked("Worker shutdown"),
    indexedDB: undefined,
    caches: undefined,
  };
  for (const [name, value] of Object.entries(blockedGlobals)) {
    try { Object.defineProperty(self, name, { value, writable: false, configurable: false }); } catch {}
  }

  function validateRequest(request) {
    if (!request || !Array.isArray(request.files) || !Array.isArray(request.scenarios)) throw new Error("Invalid sandbox request.");
    if (request.files.length < 1 || request.files.length > MAX_FILES) throw new Error("A run must contain between 1 and 12 JavaScript files.");
    let total = 0;
    const names = new Set();
    for (const file of request.files) {
      if (!file || typeof file.name !== "string" || !FILE_NAME.test(file.name)) throw new Error("Files must use simple .js names without path separators.");
      if (names.has(file.name)) throw new Error("Duplicate file name: " + file.name);
      if (typeof file.content !== "string") throw new Error("Every file must contain JavaScript source text.");
      const bytes = encoder.encode(file.content).byteLength;
      if (bytes > MAX_FILE_BYTES) throw new Error(file.name + " exceeds the 50 KB file limit.");
      total += bytes;
      names.add(file.name);
    }
    if (total > MAX_TOTAL_BYTES) throw new Error("The workspace exceeds the 200 KB execution limit.");
    if (!names.has(request.entryFile)) throw new Error("The entry file is missing.");
    if (request.scenarios.length > 50) throw new Error("A run cannot contain more than 50 scenarios.");
  }

  function moduleReferences(source) {
    const refs = [];
    const patterns = [
      /\b(?:import|export)\s+(?:[^"']*?\s+from\s*)?["']([^"']+)["']/g,
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(source))) refs.push(match[1]);
    }
    return [...new Set(refs)];
  }

  function encodeModule(source) {
    const bytes = encoder.encode(source);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return "data:text/javascript;base64," + btoa(binary);
  }

  async function buildModuleUrl(name, files, cache, stack = []) {
    if (cache.has(name)) return cache.get(name);
    if (stack.includes(name)) throw new Error("Circular module imports are not supported: " + [...stack, name].join(" -> "));
    const source = files.get(name);
    if (source === undefined) throw new Error("Unknown module: " + name);
    let rewritten = source;
    for (const reference of moduleReferences(source)) {
      if (!reference.startsWith("./") || reference.slice(2).includes("/")) throw new Error("Only local imports such as ./helpers.js are allowed.");
      const dependency = reference.slice(2);
      if (!files.has(dependency)) throw new Error("Missing imported file: " + dependency);
      const dependencyUrl = await buildModuleUrl(dependency, files, cache, [...stack, name]);
      rewritten = rewritten.split(reference).join(dependencyUrl);
    }
    const url = encodeModule(rewritten + "\n//# sourceURL=machine-coding/" + name);
    cache.set(name, url);
    return url;
  }

  function resolveReference(value, saved) {
    if (Array.isArray(value)) return value.map((item) => resolveReference(item, saved));
    if (!value || typeof value !== "object") return value;
    if (Object.keys(value).length === 1 && typeof value.$ref === "string") {
      const [root, ...path] = value.$ref.split(".");
      let current = saved.get(root);
      for (const segment of path) current = current == null ? undefined : current[segment];
      return current;
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveReference(item, saved)]));
  }

  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }

  function equal(actual, expected) {
    return JSON.stringify(canonical(serializable(actual))) === JSON.stringify(canonical(serializable(expected)));
  }

  async function runScenario(module, scenario) {
    const started = performance.now();
    const expected = scenario.expectedError ? { errorIncludes: scenario.expectedError } : serializable(scenario.expected);
    try {
      const Entry = scenario.entryPoint === "default" ? module.default : module[scenario.entryPoint];
      if (typeof Entry !== "function") throw new Error("Export " + scenario.entryPoint + " was not found.");
      let actual;
      if (scenario.kind === "class") {
        const saved = new Map();
        const instance = new Entry(...resolveReference(scenario.constructorArgs || [], saved));
        saved.set("instance", instance);
        for (const call of scenario.calls || []) {
          if (!call || typeof call.method !== "string" || typeof instance[call.method] !== "function") throw new Error("Method " + (call && call.method) + " was not found.");
          actual = await instance[call.method](...resolveReference(call.args || [], saved));
          if (call.saveAs) saved.set(call.saveAs, actual);
        }
      } else {
        actual = await Entry(...(scenario.args || []));
      }
      const normalized = serializable(actual);
      if (scenario.expectedError) return { name: scenario.name, status: "failed", actual: normalized, expected, error: "Expected an error, but the scenario completed.", durationMs: Math.round(performance.now() - started) };
      return { name: scenario.name, status: equal(normalized, scenario.expected) ? "passed" : "failed", actual: normalized, expected, error: null, durationMs: Math.round(performance.now() - started) };
    } catch (error) {
      const message = safeError(error);
      const passed = typeof scenario.expectedError === "string" && message.includes(scenario.expectedError);
      return { name: scenario.name, status: passed ? "passed" : "failed", actual: null, expected, error: message, durationMs: Math.round(performance.now() - started) };
    }
  }

  self.addEventListener("message", async (event) => {
    const started = performance.now();
    try {
      validateRequest(event.data);
      const files = new Map(event.data.files.map((file) => [file.name, file.content]));
      const entryUrl = await buildModuleUrl(event.data.entryFile, files, new Map());
      const studentModule = await import(entryUrl);
      const scenarios = [];
      for (const scenario of event.data.scenarios) scenarios.push(await runScenario(studentModule, scenario));
      nativePostMessage({ status: "completed", scenarios, console: consoleEntries, error: null, durationMs: Math.round(performance.now() - started) });
    } catch (error) {
      nativePostMessage({ status: "engine_error", scenarios: [], console: consoleEntries, error: safeError(error), durationMs: Math.round(performance.now() - started) });
    }
  }, { once: true });
})();
`;

