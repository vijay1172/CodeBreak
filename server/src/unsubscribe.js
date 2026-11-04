import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_TOKEN_LENGTH = 2_048;

function signature(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createUnsubscribeToken({ userId, email }, secret) {
  if (!secret || !userId || !email) throw new Error("An unsubscribe secret, user id, and email are required");
  const payload = Buffer.from(JSON.stringify({ userId, email: String(email).trim().toLowerCase() })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyUnsubscribeToken(token, secret) {
  if (!secret || typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  const supplied = Buffer.from(token.slice(separator + 1), "base64url");
  const expected = Buffer.from(signature(payload, secret), "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.userId !== "string" || !parsed.userId || typeof parsed.email !== "string" || !parsed.email) return null;
    return { userId: parsed.userId, email: parsed.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

function responsePage(title, message) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · BrokenRepo</title></head>
<body style="margin:0;background:#111c2b;color:#dce6f5;font:16px/1.6 system-ui,sans-serif">
  <main style="max-width:640px;margin:12vh auto;padding:32px">
    <div style="border:1px solid #41536b;border-radius:16px;padding:32px;background:#18273a">
      <p style="color:#8fb3ff;font-weight:700">BrokenRepo</p>
      <h1 style="font-size:30px">${title}</h1>
      <p>${message}</p>
      <a href="https://brokenrepo.tech" style="color:#8fb3ff">Return to BrokenRepo</a>
    </div>
  </main>
</body>
</html>`;
}

export function createUnsubscribeHandler({ database, secret }) {
  return async function unsubscribeHandler(req, res, next) {
    try {
      const identity = verifyUnsubscribeToken(req.query?.token, secret);
      if (!identity) {
        return res.status(400).type("html").send(responsePage("Invalid unsubscribe link", "This link is invalid. Contact support if you still need help unsubscribing."));
      }
      await database().collection("users").updateOne(
        { _id: identity.userId, email: identity.email },
        { $set: { unsubscribed: true, unsubscribedAt: new Date() } },
      );
      return res.status(200).type("html").send(responsePage("You’re unsubscribed", "You won’t receive future BrokenRepo announcement emails."));
    } catch (error) {
      return next(error);
    }
  };
}
