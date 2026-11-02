import { once } from "node:events";
import { createApp } from "../server/app.js";

export async function withApp(run, options) {
  const server = createApp(options).listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { token = "valid-token", body, rawBody, ...init } = {}) {
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined || rawBody !== undefined ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
        body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
        signal: AbortSignal.timeout(1500),
      });
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new Error("The application did not finish the request within the test deadline");
      }
      throw error;
    }
    const contentType = response.headers.get("content-type") ?? "";
    const result = await response.json();
    return { status: response.status, body: result, contentType };
  }
  try {
    return await run(request, baseUrl);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
