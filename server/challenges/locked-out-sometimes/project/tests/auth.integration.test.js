import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiClient } from "../client/src/api/apiClient.js";
import { app } from "../server/app.js";
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
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await new Promise((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("rejects requests without a token", async () => {
    const response = await fetch(`${baseUrl}/api/dashboard`);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Authentication required" });
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
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Welcome back", userId: "student-42" });
  });
});
