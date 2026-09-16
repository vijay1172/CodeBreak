import { Daytona, CodeLanguage } from "@daytona/sdk";
import { config } from "./config.js";

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

export async function provisionSandbox({ sessionId, challenge }) {
  const sandbox = await daytona.create(
    {
      language: CodeLanguage.JAVASCRIPT,
      name: `codebreak-${sessionId.slice(0, 12)}`,
      labels: { product: "codebreak", session: sessionId, challenge: challenge.id },
      public: false,
      ephemeral: true,
      autoStopInterval: config.sessionIdleMinutes,
      ttlMinutes: config.sessionTtlMinutes,
    },
    { timeout: 120 },
  );

  try {
    const baseDirectory = (await sandbox.getWorkDir()) || (await sandbox.getUserHomeDir());
    if (!baseDirectory) throw new Error("Daytona did not provide a working directory");
    const workspaceDirectory = `${baseDirectory}/codebreak`;
    const prepare = await sandbox.process.executeCommand(
      `mkdir -p ${shellQuote(workspaceDirectory)}`,
      baseDirectory,
      undefined,
      30,
    );
    if (prepare.exitCode !== 0) throw new Error(`Unable to prepare sandbox workspace: ${prepare.result}`);

    await uploadFiles(sandbox, workspaceDirectory, challenge.files);

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
    await sandbox.process.executeSessionCommand(
      appSessionId,
      {
        command: `cd ${shellQuote(workspaceDirectory)} && ${challenge.startCommand}`,
        runAsync: true,
        suppressInputEcho: true,
      },
      30,
    );

    const health = await sandbox.process.executeCommand(
      "for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS http://127.0.0.1:3000/health && exit 0; sleep 1; done; exit 1",
      workspaceDirectory,
      undefined,
      20,
    );
    if (health.exitCode !== 0) {
      const logs = await sandbox.process.getSession(appSessionId).catch(() => null);
      throw new Error(`Challenge application did not become healthy.${logs ? " Check the app process logs." : ""}`);
    }

    return {
      sandboxId: sandbox.id,
      workspaceDirectory,
      setupOutput: install.stdout || install.output,
    };
  } catch (error) {
    await daytona.delete(sandbox, 60, true).catch(() => {});
    throw error;
  }
}

export async function runSandboxTests({ sessionId, sandboxId, workspaceDirectory, challenge, files }) {
  const sandbox = await daytona.get(sandboxId);
  await uploadFiles(
    sandbox,
    workspaceDirectory,
    Object.entries(files).map(([filePath, content]) => ({ path: filePath, content })),
  );

  await sandbox.process.executeCommand(
    "rm -f /tmp/codebreak-results.json",
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
    "test -f /tmp/codebreak-results.json && cat /tmp/codebreak-results.json",
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
