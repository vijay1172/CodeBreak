import { describe, expect, it } from "vitest";
import { createApiClient, resolveApiBaseUrl } from "../client/src/api/apiClient.js";

describe("environment-specific API configuration", () => {
  it("builds the dashboard endpoint correctly", async () => {
    let requestedUrl;
    const client = createApiClient({ token: "valid-token", fetchImpl: async (url) => { requestedUrl = url; return { ok: true }; } });
    await client.getDashboard();
    expect(new URL(requestedUrl).pathname).toBe("/api/dashboard");
  });

  it("uses the deployment API URL supplied by the environment", () => {
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: "https://api.codebreak.example" }))
      .toBe("https://api.codebreak.example");
  });

  it("removes a trailing slash before appending a route", async () => {
    let requestedUrl;
    const client = createApiClient({
      token: "valid-token",
      env: { VITE_API_BASE_URL: "https://api.codebreak.example/" },
      fetchImpl: async (url) => { requestedUrl = url; return { ok: true }; },
    });
    await client.getDashboard();
    expect(requestedUrl).not.toContain("example//api");
  });
});
