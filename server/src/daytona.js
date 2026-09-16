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
      stdout: response.stdout || "",
      stderr: response.stderr || "",
      output: response.output || "",
    };
  } finally {
    await sandbox.process.deleteSession(sessionId).catch(() => {});
  }
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
      name: `debugbench-${sessionId.slice(0, 12)}`,
      labels: { product: "debugbench", session: sessionId, challenge: challenge.id },
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
    const workspaceDirectory = `${baseDirectory}/debugbench`;
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
    "rm -f /tmp/debugbench-results.json",
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
    "test -f /tmp/debugbench-results.json && cat /tmp/debugbench-results.json",
    workspaceDirectory,
    undefined,
    30,
  );

  const reportText = report.exitCode === 0 ? report.result : "";
  let diagnosticOutput = "";
  if (command.exitCode !== 0) {
    try {
      const parsed = reportText ? JSON.parse(reportText) : null;
      if (!parsed || parsed.numTotalTests === 0) {
        const diagnostic = await runSessionCommand(
          sandbox,
          `diagnostic-${sessionId}-${Date.now()}`,
          `cd ${shellQuote(workspaceDirectory)} && npm test -- --reporter=verbose`,
          180,
        );
        diagnosticOutput = diagnostic.stderr || diagnostic.stdout || diagnostic.output;
      }
    } catch {
      diagnosticOutput = command.stderr || command.stdout || command.output;
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
