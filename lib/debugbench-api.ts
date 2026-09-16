export type Criterion = { id: string; title: string };

export type ChallengeFile = {
  path: string;
  content: string;
  editable: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  problemStatement: string;
  criteria: Criterion[];
  hints: { tier1: string; tier2: string; tier3: string };
  debrief: {
    rootCause: string;
    realWorldContext: string;
    patternToWatch: string;
  };
  files: ChallengeFile[];
};

export type SessionStatus =
  | "provisioning"
  | "ready"
  | "running"
  | "error"
  | "deleting"
  | "deleted";

export type SessionRecord = {
  sessionId: string;
  challengeId: string;
  status: SessionStatus;
  files: Record<string, string>;
  error: string | null;
  lastRun: TestRunResult | null;
};

export type CriterionResult = Criterion & {
  status: "passed" | "failed" | "not_run";
  durationMs: number;
  error: string | null;
};

export type TestRunResult = {
  phase: "compile" | "test" | "infrastructure";
  exitCode: number;
  stdout: string;
  stderr: string;
  diagnostics: string[];
  tests: CriterionResult[];
  summary: { passed: number; failed: number; total: number };
  allPassed: boolean;
};

export const apiBaseUrl = (
  process.env.NEXT_PUBLIC_DEBUGBENCH_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  return body;
}

export function createSession(challengeId: string) {
  return jsonRequest<{ sessionId: string; status: SessionStatus; challenge: Challenge }>(
    "/api/sessions",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeId }),
    },
  );
}

export function getSession(sessionId: string) {
  return jsonRequest<SessionRecord>(`/api/sessions/${sessionId}`);
}

export async function runSessionTests(sessionId: string, files: Record<string, string>) {
  const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionId}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ files }),
  });
  const body = (await response.json().catch(() => ({}))) as TestRunResult & { error?: string };
  if (!response.ok && !Array.isArray(body.tests)) {
    throw new Error(body.error || `Test run failed with status ${response.status}`);
  }
  return body;
}

export function deleteSession(sessionId: string, keepalive = false) {
  return fetch(`${apiBaseUrl}/api/sessions/${sessionId}`, {
    method: "DELETE",
    keepalive,
  });
}

export function endSessionOnUnload(sessionId: string) {
  const endpoint = `${apiBaseUrl}/api/sessions/${sessionId}/end`;
  if (typeof navigator !== "undefined" && navigator.sendBeacon(endpoint)) return;
  void fetch(endpoint, { method: "POST", keepalive: true });
}

export function reportChallenge(challengeId: string, sessionId: string | null) {
  return jsonRequest<{ reportId: string; status: "open" }>(
    `/api/challenges/${challengeId}/reports`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId || undefined }),
    },
  );
}
