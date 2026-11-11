import type { SandboxRunRequest, SandboxRunResult } from "./execution-types";
import { sandboxFrameSource } from "./sandbox-frame-source";
import { SANDBOX_WORKER_SOURCE } from "./sandbox-worker-source";

type PendingRun = {
  resolve: (result: SandboxRunResult) => void;
  reject: (error: Error) => void;
  timeout: number;
};

export class BrowserExecutionEngine {
  private iframe: HTMLIFrameElement | null = null;
  private port: MessagePort | null = null;
  private initialization: Promise<void> | null = null;
  private pending = new Map<string, PendingRun>();

  initialize() {
    if (this.initialization) return this.initialization;
    this.initialization = new Promise<void>((resolve, reject) => {
      const nonce = crypto.randomUUID();
      const iframe = document.createElement("iframe");
      iframe.title = "Machine Coding isolated execution sandbox";
      iframe.hidden = true;
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.srcdoc = sandboxFrameSource(nonce);
      this.iframe = iframe;

      const initializationTimeout = window.setTimeout(() => {
        window.removeEventListener("message", onFrameReady);
        reject(new Error("The isolated execution frame did not start."));
      }, 5_000);

      const onFrameReady = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow || event.data?.type !== "BROKENREPO_MACHINE_CODING_FRAME_READY" || event.data?.nonce !== nonce) return;
        window.removeEventListener("message", onFrameReady);
        const channel = new MessageChannel();
        this.port = channel.port1;
        this.port.onmessage = ({ data }) => {
          if (data?.type === "READY" && data?.nonce === nonce) {
            window.clearTimeout(initializationTimeout);
            resolve();
            return;
          }
          if (data?.type !== "RESULT" || typeof data.requestId !== "string") return;
          const pending = this.pending.get(data.requestId);
          if (!pending) return;
          window.clearTimeout(pending.timeout);
          this.pending.delete(data.requestId);
          pending.resolve(data.result as SandboxRunResult);
        };
        this.port.start();
        iframe.contentWindow?.postMessage({ type: "BROKENREPO_MACHINE_CODING_INIT", nonce }, "*", [channel.port2]);
      };

      window.addEventListener("message", onFrameReady);
      document.body.appendChild(iframe);
    });
    return this.initialization;
  }

  async run(request: SandboxRunRequest): Promise<SandboxRunResult> {
    await this.initialize();
    if (!this.port) throw new Error("The isolated execution channel is unavailable.");
    const requestId = crypto.randomUUID();
    return new Promise<SandboxRunResult>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("The isolated frame stopped responding."));
      }, 6_500);
      this.pending.set(requestId, { resolve, reject, timeout });
      this.port?.postMessage({ type: "RUN", requestId, request, workerSource: SANDBOX_WORKER_SOURCE });
    });
  }

  getIsolationAttributes() {
    return {
      hasSrcAttribute: this.iframe?.hasAttribute("src") ?? false,
      sandbox: this.iframe?.getAttribute("sandbox") ?? "",
    };
  }

  dispose() {
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeout);
      pending.reject(new Error("The execution engine was disposed."));
    }
    this.pending.clear();
    this.port?.close();
    this.port = null;
    this.iframe?.remove();
    this.iframe = null;
    this.initialization = null;
  }
}

