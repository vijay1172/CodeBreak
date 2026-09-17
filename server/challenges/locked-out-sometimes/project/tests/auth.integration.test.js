import { describe, expect, it } from "vitest";
import { createApiClient } from "../client/src/api/apiClient.js";
import { auth } from "../server/middleware/auth.js";

function runMiddleware(headers) {
  return new Promise((resolve) => {
    const req = {
      headers: Object.fromEntries(
        Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value]),
      ),
    };
    const result = { status: null, body: null, forwarded: false };
    const res = {
      status(code) {
        result.status = code;
        return this;
      },
      json(body) {
        result.body = body;
        resolve(result);
      },
    };
    auth(req, res, () => {
      result.forwarded = true;
      result.user = req.user;
      resolve(result);
    });
  });
}

describe("authentication contract", () => {
  it("rejects requests without a token", async () => {
    const result = await runMiddleware({});
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: "Authentication required" });
  });

  it("client and middleware agree on the authentication header", async () => {
    let middlewareResult;
    const client = createApiClient({
      token: "valid-token",
      fetchImpl: async (_url, init) => {
        middlewareResult = await runMiddleware(init?.headers);
        return { ok: middlewareResult.forwarded, status: middlewareResult.status || 200 };
      },
    });

    await client.getDashboard();
    expect(middlewareResult.forwarded).toBe(true);
    expect(middlewareResult.user).toEqual({ id: "student-42" });
  });

  it("accepts a valid bearer token and forwards the request", async () => {
    const result = await runMiddleware({ Authorization: "Bearer valid-token" });
    expect(result.forwarded).toBe(true);
    expect(result.user).toEqual({ id: "student-42" });
  });
});
