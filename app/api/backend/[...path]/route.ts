import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const backend = process.env.CODEBREAK_BACKEND_URL || process.env.NEXT_PUBLIC_CODEBREAK_API_URL || "https://codebreak-api.onrender.com";
async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (request.method !== "GET" && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Please refresh CodeBreak and try again." }, { status: 403 });
  }
  const token = request.cookies.get("codebreak_session")?.value;
  try {
    const response = await fetch(`${backend.replace(/\/$/, "")}/api/${path.map(encodeURIComponent).join("/")}`, {
      method: request.method,
      headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store", signal: AbortSignal.timeout(240000),
    });
    const body = response.status === 204 ? null : await response.json() as Record<string, unknown>;
    const sessionToken = body?.token;
    if (sessionToken) delete body.token;
    const result = body === null ? new NextResponse(null, { status: response.status }) : NextResponse.json(body, { status: response.status });
    result.headers.set("Cache-Control", "no-store");
    if (typeof sessionToken === "string") result.cookies.set("codebreak_session", sessionToken, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 7 * 86400 });
    if (path.join("/") === "auth/logout") result.cookies.delete("codebreak_session");
    return result;
  } catch {
    return NextResponse.json({ error: "The lab service isn’t responding. Wait a moment and try again." }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
