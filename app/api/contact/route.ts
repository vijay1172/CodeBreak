import { z } from "zod";

const SUPPORT_EMAIL = process.env.CODEBREAK_SUPPORT_EMAIL?.trim() || "vijaysharma11702@gmail.com";
const SUPPORT_FROM = process.env.CODEBREAK_SUPPORT_FROM?.trim() || "CodeBreak Support <onboarding@resend.dev>";
const topics = {
  challenge: "Challenge or test result",
  account: "Account or progress",
  feedback: "Product feedback",
  other: "Other support request",
} as const;
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  topic: z.enum(["challenge", "account", "feedback", "other"]),
  message: z.string().trim().min(20).max(3000),
  website: z.string().max(0),
});
const attempts = new Map<string, number[]>();

function allow(ip: string) {
  if (attempts.size > 10_000) attempts.clear();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(time => now - time < 3_600_000);
  if (recent.length >= 5) return false;
  recent.push(now);
  attempts.set(ip, recent);
  return true;
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 20_000) return Response.json({ error: "That message is too large." }, { status: 413 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "We couldn’t read that message. Please try again." }, { status: 400 }); }

  const candidate = body as { website?: unknown };
  if (candidate?.website) return Response.json({ message: "Message received." });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Check your name, email, and message, then try again." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(ip)) {
    return Response.json({ error: "Too many messages were sent from this connection. Please try again in an hour." }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("Contact form is missing RESEND_API_KEY");
    return Response.json({ error: "Support email is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const { name, email, topic, message } = parsed.data;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: SUPPORT_FROM,
      to: [SUPPORT_EMAIL],
      reply_to: email,
      subject: `CodeBreak support: ${topics[topic]}`,
      text: [
        `From: ${name} <${email}>`,
        `Topic: ${topics[topic]}`,
        "",
        message,
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!response?.ok) {
    console.error("Contact email provider rejected the request", response?.status || "network_error");
    return Response.json({ error: "Your message couldn’t be sent right now. Please try again shortly." }, { status: 502 });
  }

  return Response.json({ message: "Your message was sent." }, { status: 201 });
}
