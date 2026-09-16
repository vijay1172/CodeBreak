function collectAssertions(report) {
  const testResults = Array.isArray(report?.testResults) ? report.testResults : [];
  return testResults.flatMap((suite) =>
    (suite.assertionResults || []).map((assertion) => ({
      title: assertion.title,
      status: assertion.status,
      duration: assertion.duration || 0,
      failureMessages: assertion.failureMessages || [],
    })),
  );
}

function collectFailureMessages(report) {
  const testResults = Array.isArray(report?.testResults) ? report.testResults : [];
  return testResults.flatMap((suite) => {
    const suiteMessages = [suite.failureMessage, suite.message].filter(
      (message) => typeof message === "string" && message.trim(),
    );
    const assertionMessages = (suite.assertionResults || []).flatMap(
      (assertion) => assertion.failureMessages || [],
    );
    return [...suiteMessages, ...assertionMessages];
  });
}

export function parseTestRun({ criteria, reportText, command }) {
  let report = null;
  let parseError = null;

  if (reportText?.trim()) {
    try {
      report = JSON.parse(reportText);
    } catch (error) {
      parseError = `The test runner returned invalid JSON: ${error.message}`;
    }
  }

  const assertions = report ? collectAssertions(report) : [];
  const results = criteria.map((criterion) => {
    const assertion = assertions.find((item) => item.title === criterion.title);
    if (!assertion) {
      return {
        id: criterion.id,
        title: criterion.title,
        status: "not_run",
        durationMs: 0,
        error: null,
      };
    }
    return {
      id: criterion.id,
      title: criterion.title,
      status:
        assertion.status === "passed"
          ? "passed"
          : assertion.status === "failed"
            ? "failed"
            : "not_run",
      durationMs: assertion.duration,
      error: assertion.failureMessages.join("\n") || null,
    };
  });

  const diagnostics = [
    ...(parseError ? [parseError] : []),
    ...(report ? collectFailureMessages(report) : []),
    ...(command.stderr?.trim() ? [command.stderr.trim()] : []),
  ].filter(Boolean);

  if (!report && command.exitCode !== 0 && command.stdout?.trim()) {
    diagnostics.push(command.stdout.trim());
  }

  const passed = results.filter((result) => result.status === "passed").length;
  return {
    phase: report && assertions.length > 0 ? "test" : "compile",
    exitCode: command.exitCode,
    stdout: command.stdout || "",
    stderr: command.stderr || "",
    diagnostics: [...new Set(diagnostics)],
    tests: results,
    summary: { passed, failed: results.length - passed, total: results.length },
    allPassed: command.exitCode === 0 && passed === results.length,
  };
}
