import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const backend = process.env.BROKENREPO_BACKEND_URL || process.env.NEXT_PUBLIC_BROKENREPO_API_URL || "https://codebreak-api.onrender.com";

// The backend sits behind this proxy, so only this layer sees real client IPs.
// Limits are in-memory per serverless instance; the backend keeps independent
// per-account and per-user limits as the durable second layer.
const hitLog = new Map<string, number[]>();
function allowClient(key: string, limit: number, windowMs: number) {
  if (hitLog.size > 10_000) hitLog.clear();
  const now = Date.now();
  const recent = (hitLog.get(key) || []).filter((time) => now - time < windowMs);
  const allowed = recent.length < limit;
  if (allowed) { recent.push(now); hitLog.set(key, recent); }
  return allowed;
}

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowClient(`all:${clientIp}`, 400, 900_000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again shortly." }, { status: 429 });
  }
  const route = path.join("/");
  if (request.method === "POST" && (route === "auth/login" || route === "auth/signup") && !allowClient(`auth:${clientIp}`, 30, 900_000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }
  if (request.method !== "GET" && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Please refresh BrokenRepo and try again." }, { status: 403 });
  }
  const token = request.cookies.get("brokenrepo_session")?.value;
  try {
    const response = await fetch(`${backend.replace(/\/$/, "")}/api/${path.map(encodeURIComponent).join("/")}`, {
      method: request.method,
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
        accept: request.headers.get("accept") || "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Server-set (client-supplied values are overwritten here): used only by
        // the anonymous /api/track beacon for visitor hashing, device, country.
        "x-client-ip": clientIp,
        "x-client-ua": (request.headers.get("user-agent") || "").slice(0, 300),
        "x-client-country": request.headers.get("x-vercel-ip-country") || "",
      },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store", signal: AbortSignal.timeout(240000),
    });
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }
    const body = response.status === 204 ? null : await response.json() as Record<string, unknown>;
    const sessionToken = body?.token;
    if (sessionToken) delete body.token;
    const result = body === null ? new NextResponse(null, { status: response.status }) : NextResponse.json(body, { status: response.status });
    result.headers.set("Cache-Control", "no-store");
    if (typeof sessionToken === "string") result.cookies.set("brokenrepo_session", sessionToken, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 7 * 86400 });
    if (path.join("/") === "auth/logout") result.cookies.delete("brokenrepo_session");
    return result;
  } catch {
    return NextResponse.json({ error: "The lab service isn’t responding. Wait a moment and try again." }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
