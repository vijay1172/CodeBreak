import { createHash } from "node:crypto";
import { Daytona, CodeLanguage } from "@daytona/sdk";
import { config } from "./config.js";
import { installSandboxMongo, sandboxMongoPath } from "./runtime-assets.js";
import { runtimeInspectorSource } from "./runtime-inspector.js";

const daytona = new Daytona({
  apiKey: config.daytonaApiKey,
  apiUrl: config.daytonaApiUrl,
  target: config.daytonaTarget,
  requestTimeoutMs: 180_000,
});

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function cleanProcessOutput(value) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

async function runSessionCommand(sandbox, sessionId, command, timeout = 120) {
  await sandbox.process.createSession(sessionId);
  try {
    const response = await sandbox.process.executeSessionCommand(
      sessionId,
      { command, runAsync: false, suppressInputEcho: true },
      timeout,
    );
    return {
      exitCode: response.exitCode ?? 1,
      stdout: cleanProcessOutput(response.stdout),
      stderr: cleanProcessOutput(response.stderr),
      output: cleanProcessOutput(response.output),
    };
  } finally {
    await sandbox.process.deleteSession(sessionId).catch(() => {});
  }
}

function combinedCommandOutput(command) {
  return [...new Set([command.stderr, command.stdout, command.output].filter((value) => value?.trim()))]
    .join("\n")
    .trim();
}

const vitePreviewConfig = `export default {
  esbuild: {
    jsx: "automatic",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
};\n`;

function reportHasExecutedAssertions(report) {
  return (report?.testResults || []).some((suite) =>
    (suite.assertionResults || []).some((assertion) =>
      ["passed", "failed"].includes(assertion.status),
    ),
  );
}

async function uploadFiles(sandbox, workspaceDirectory, files) {
  await sandbox.fs.uploadFiles(
    files.map((file) => ({
      source: Buffer.from(file.content, "utf8"),
      destination: `${workspaceDirectory}/${file.path}`,
    })),
    180,
  );
}

async function verifyUploadedFiles(sandbox, workspaceDirectory, files) {
  if (files.length === 0) return;
  const expected = files.map((file) =>
    createHash("sha256").update(file.content, "utf8").digest("hex"),
  );
  const command = [
    "set -e",
    ...files.map((file) => `sha256sum ${shellQuote(file.path)} | cut -d " " -f 1`),
  ].join("\n");
  const response = await sandbox.process.executeCommand(
    command,
    workspaceDirectory,
    undefined,
    30,
  );
  const actual = cleanProcessOutput(response.result).trim().split("\n").filter(Boolean);
  if (response.exitCode !== 0 || actual.length !== expected.length) {
    throw new Error("The sandbox could not verify the uploaded file set");
  }
  const mismatch = expected.findIndex((hash, index) => hash !== actual[index]?.trim());
  if (mismatch !== -1) {
    throw new Error(`The sandbox received stale content for ${files[mismatch].path}`);
  }
}

export async function provisionSandbox({ sessionId, challenge }) {
  const sandbox = await daytona.create(
    {
      language: CodeLanguage.JAVASCRIPT,
      envVars: challenge.requiresMongo ? {
        MONGOMS_SYSTEM_BINARY: sandboxMongoPath,
        MONGOMS_RUNTIME_DOWNLOAD: "0",
        MONGOMS_DISABLE_POSTINSTALL: "1",
      } : {},
      name: `brokenrepo-${sessionId.slice(0, 12)}`,
      labels: { product: "brokenrepo", session: sessionId, challenge: challenge.id },
      public: false,
      ephemeral: true,
      autoStopInterval: config.sessionIdleMinutes,
      ttlMinutes: config.sessionTtlMinutes,
    },
    { timeout: 120 },
  );

  try {
    if (challenge.requiresMongo) await installSandboxMongo(sandbox);
    const baseDirectory = (await sandbox.getWorkDir()) || (await sandbox.getUserHomeDir());
    if (!baseDirectory) throw new Error("Daytona did not provide a working directory");
    const workspaceDirectory = `${baseDirectory}/brokenrepo`;
    const prepare = await sandbox.process.executeCommand(
      `mkdir -p ${shellQuote(workspaceDirectory)}`,
      baseDirectory,
      undefined,
      30,
    );
    if (prepare.exitCode !== 0) throw new Error(`Unable to prepare sandbox workspace: ${prepare.result}`);

    await uploadFiles(sandbox, workspaceDirectory, challenge.files);
    await verifyUploadedFiles(sandbox, workspaceDirectory, challenge.files);
    const runtimeSupportFile = {
      path: ".brokenrepo/runtime-inspector.mjs",
      content: runtimeInspectorSource,
    };
    const previewSupportFile = {
      path: ".brokenrepo/vite-preview.config.mjs",
      content: vitePreviewConfig,
    };
    const supportFiles = [runtimeSupportFile, previewSupportFile];
    await uploadFiles(sandbox, workspaceDirectory, supportFiles);
    await verifyUploadedFiles(sandbox, workspaceDirectory, supportFiles);

    const install = await runSessionCommand(
      sandbox,
      `install-${sessionId}`,
      `cd ${shellQuote(workspaceDirectory)} && ${challenge.installCommand}`,
      300,
    );
    if (install.exitCode !== 0) {
      throw new Error(`Dependency installation failed:\n${install.stderr || install.stdout || install.output}`);
    }

    const appSessionId = `app-${sessionId}`;
    await sandbox.process.createSession(appSessionId);
    const appCommand = await sandbox.process.executeSessionCommand(
      appSessionId,
      {
        command: `cd ${shellQuote(workspaceDirectory)} && NODE_OPTIONS=${shellQuote(`--import=${workspaceDirectory}/${runtimeSupportFile.path}`)} ${challenge.startCommand}`,
        runAsync: true,
        suppressInputEcho: true,
      },
      30,
    );

    const health = await sandbox.process.executeCommand(
      "for i in $(seq 1 60); do curl -fsS http://127.0.0.1:3000/health && exit 0; sleep 1; done; exit 1",
      workspaceDirectory,
      undefined,
      75,
    );
    if (health.exitCode !== 0) {
      const logs = await sandbox.process.getSessionCommandLogs(appSessionId, appCommand.cmdId).catch(() => null);
      const details = cleanProcessOutput(logs ? (logs.stderr || logs.stdout || logs.output) : health.result);
      throw new Error(`Challenge application did not become healthy.\n${details || "No startup logs were available."}`);
    }

    let previewPort = 3000;
    if (challenge.previewMode === "dev-server") {
      previewPort = 5173;
      const previewSessionId = `preview-${sessionId}`;
      await sandbox.process.createSession(previewSessionId);
      const previewCommand = await sandbox.process.executeSessionCommand(
        previewSessionId,
        {
          command: `cd ${shellQuote(workspaceDirectory)} && ./node_modules/.bin/vite --config ${shellQuote(previewSupportFile.path)} --host 0.0.0.0 --port ${previewPort} --strictPort`,
          runAsync: true,
          suppressInputEcho: true,
        },
        30,
      );
      const previewHealth = await sandbox.process.executeCommand(
        `for i in $(seq 1 30); do curl -fsS http://127.0.0.1:${previewPort}/ >/dev/null && exit 0; sleep 1; done; exit 1`,
        workspaceDirectory,
        undefined,
        45,
      );
      if (previewHealth.exitCode !== 0) {
        const logs = await sandbox.process.getSessionCommandLogs(previewSessionId, previewCommand.cmdId).catch(() => null);
        const details = cleanProcessOutput(logs ? (logs.stderr || logs.stdout || logs.output) : previewHealth.result);
        throw new Error(`Browser preview did not become ready.\n${details || "No preview logs were available."}`);
      }
    }

    return {
      sandboxId: sandbox.id,
      workspaceDirectory,
      appSessionId,
      appCommandId: appCommand.cmdId,
      previewPort,
      setupOutput: install.stdout || install.output,
    };
  } catch (error) {
    await daytona.delete(sandbox, 60, true).catch(() => {});
    throw error;
  }
}

export async function getSandboxPreviewUrl({ sandboxId, port = 3000 }) {
  const sandbox = await daytona.get(sandboxId);
  const expiresInSeconds = 3600;
  const preview = await sandbox.getSignedPreviewUrl(port, expiresInSeconds);
  return {
    url: preview.url,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

export async function getSandboxRuntimeLogs({ sandboxId, appSessionId, appCommandId }) {
  const sandbox = await daytona.get(sandboxId);
  const [logs, command] = await Promise.all([
    sandbox.process.getSessionCommandLogs(appSessionId, appCommandId),
    sandbox.process.getSessionCommand(appSessionId, appCommandId),
  ]);
  return {
    stdout: cleanProcessOutput(logs.stdout),
    stderr: cleanProcessOutput(logs.stderr),
    running: command.exitCode === undefined || command.exitCode === null,
    exitCode: command.exitCode ?? null,
  };
}

export async function syncSandboxFiles({ sandboxId, workspaceDirectory, files, previewMode }) {
  const sandbox = await daytona.get(sandboxId);
  const submittedFiles = Object.entries(files).map(([filePath, content]) => ({
    path: filePath,
    content,
  }));
  await uploadFiles(sandbox, workspaceDirectory, submittedFiles);
  await verifyUploadedFiles(sandbox, workspaceDirectory, submittedFiles);
  if (!previewMode) return { previewUpdated: false };
  if (previewMode === "dev-server") return { previewUpdated: true };

  const rebuild = await runSessionCommand(
    sandbox,
    `preview-build-${Date.now()}`,
    `cd ${shellQuote(workspaceDirectory)} && npm run build:client`,
    180,
  );
  if (rebuild.exitCode !== 0) {
    throw new Error(`Preview rebuild failed:\n${combinedCommandOutput(rebuild) || "No build output was available."}`);
  }
  return { previewUpdated: true };
}

export async function runSandboxTests({ sessionId, sandboxId, workspaceDirectory, challenge, files }) {
  const sandbox = await daytona.get(sandboxId);
  const submittedFiles = Object.entries(files).map(([filePath, content]) => ({
    path: filePath,
    content,
  }));
  await uploadFiles(sandbox, workspaceDirectory, submittedFiles);
  await verifyUploadedFiles(sandbox, workspaceDirectory, submittedFiles);

  const validation = await runSessionCommand(
    sandbox,
    `validate-${sessionId}-${Date.now()}`,
    `cd ${shellQuote(workspaceDirectory)} && ${challenge.validationCommand}`,
    180,
  );
  if (validation.exitCode !== 0) {
    return {
      command: {
        ...validation,
        stderr: combinedCommandOutput(validation),
      },
      reportText: "",
    };
  }

  await sandbox.process.executeCommand(
    "rm -f /tmp/brokenrepo-results.json",
    workspaceDirectory,
    undefined,
    10,
  );

  const command = await runSessionCommand(
    sandbox,
    `test-${sessionId}-${Date.now()}`,
    `cd ${shellQuote(workspaceDirectory)} && ${challenge.testCommand}`,
    180,
  );

  const report = await sandbox.process.executeCommand(
    "test -f /tmp/brokenrepo-results.json && cat /tmp/brokenrepo-results.json",
    workspaceDirectory,
    undefined,
    30,
  );

  const reportText = report.exitCode === 0 ? report.result : "";
  let diagnosticOutput = "";
  if (command.exitCode !== 0) {
    try {
      const parsed = reportText ? JSON.parse(reportText) : null;
      if (!parsed || !reportHasExecutedAssertions(parsed)) {
        const diagnostic = await runSessionCommand(
          sandbox,
          `diagnostic-${sessionId}-${Date.now()}`,
          `cd ${shellQuote(workspaceDirectory)} && ./node_modules/.bin/vitest run --reporter=verbose`,
          180,
        );
        diagnosticOutput = combinedCommandOutput(diagnostic);
      }
    } catch {
      diagnosticOutput = combinedCommandOutput(command);
    }
  }

  return {
    command: {
      ...command,
      stderr: [command.stderr, diagnosticOutput].filter(Boolean).join("\n"),
    },
    reportText,
  };
}

export async function deleteSandbox(sandboxId) {
  if (!sandboxId) return;
  const sandbox = await daytona.get(sandboxId);
  await daytona.delete(sandbox, 60, true);
}
