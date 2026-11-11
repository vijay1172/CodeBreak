// The frame has a unique opaque origin because it is created through srcdoc
// with only allow-scripts. It owns the Worker and enforces the hard timeout.
export function sandboxFrameSource(nonce: string) {
  const safeNonce = JSON.stringify(nonce);
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob: data:; worker-src blob: data:; connect-src 'none'; img-src 'none'; style-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
</head><body><script>
(() => {
  "use strict";
  const nonce = ${safeNonce};
  let controlPort = null;
  const MAX_RUN_MS = 5000;

  window.addEventListener("message", (event) => {
    if (event.source !== parent || !event.data || event.data.type !== "BROKENREPO_MACHINE_CODING_INIT" || event.data.nonce !== nonce || !event.ports[0] || controlPort) return;
    controlPort = event.ports[0];
    controlPort.onmessage = ({ data }) => {
      if (!data || data.type !== "RUN" || typeof data.requestId !== "string" || typeof data.workerSource !== "string") return;
      const workerUrl = URL.createObjectURL(new Blob([data.workerSource], { type: "text/javascript" }));
      const worker = new Worker(workerUrl);
      const started = performance.now();
      let finished = false;
      const finish = (result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        controlPort.postMessage({ type: "RESULT", requestId: data.requestId, result });
      };
      const timeout = setTimeout(() => finish({ status: "timed_out", scenarios: [], console: [], error: "Execution exceeded the 5 second limit.", durationMs: Math.round(performance.now() - started) }), MAX_RUN_MS);
      worker.onmessage = (event) => finish(event.data);
      worker.onerror = (event) => finish({ status: "engine_error", scenarios: [], console: [], error: event.message || "The isolated worker failed.", durationMs: Math.round(performance.now() - started) });
      worker.postMessage(data.request);
    };
    controlPort.start();
    controlPort.postMessage({ type: "READY", nonce });
  }, { once: true });
  parent.postMessage({ type: "BROKENREPO_MACHINE_CODING_FRAME_READY", nonce }, "*");
})();
</script></body></html>`;
}

