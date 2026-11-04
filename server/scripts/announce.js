import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { z } from "zod";
import { isLikelyGenuineEmail, selectAnnouncementAudience } from "../src/announcement-audience.js";
import { createUnsubscribeToken } from "../src/unsubscribe.js";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env.local") });
dotenv.config({ path: path.resolve(here, "../.env") });

const dryRun = process.argv.includes("--dry-run");
const limitArgument = process.argv.slice(2).find((argument) => argument.startsWith("--limit="));
const requestedLimit = limitArgument ? Number(limitArgument.slice("--limit=".length)) : null;
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--dry-run" && argument !== limitArgument);
if (unknownArguments.length) throw new Error(`Unknown argument: ${unknownArguments[0]}`);
if (requestedLimit !== null && (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100)) {
  throw new Error("--limit must be an integer between 1 and 100");
}

const mongoUri = process.env.MONGODB_URI?.trim();
const databaseName = process.env.MONGODB_DB_NAME?.trim() || "Codebreak";
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET?.trim();
const publicApiUrl = (process.env.BROKENREPO_PUBLIC_API_URL?.trim() || "https://api.brokenrepo.tech").replace(/\/$/, "");
const sender = process.env.BROKENREPO_SUPPORT_FROM?.trim() || "BrokenRepo <support@brokenrepo.tech>";
const emailSchema = z.string().trim().email().max(254);
const DAILY_LIMIT = 100;
const SEND_DELAY_MS = 150;

if (!mongoUri) throw new Error("MONGODB_URI is required");
if (!unsubscribeSecret) throw new Error("UNSUBSCRIBE_SECRET is required");
if (!dryRun && !resendApiKey) throw new Error("RESEND_API_KEY is required for a real send");
if (/gmail\.com/i.test(sender)) throw new Error("BROKENREPO_SUPPORT_FROM must use the verified Resend sender domain, not Gmail");

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function plainText(unsubscribeUrl) {
  return `Hi there,

When we launched BrokenRepo a few weeks ago, a lot of you tried the challenges and sent real feedback. Someone wanted to see the UI actually break in front of them. Someone asked for logs. Someone asked for a stopwatch.

We built all of it. Here's what's live now:

🤖 AI Debugging Coach — ask it questions, attach files from your challenge, and get guidance that helps you think — without giving away the answer.

🔍 Live Preview — every challenge now runs as a real, clickable app. Watch it fail, fix the code, and watch your fix come alive.

📋 Runtime Logs — server output, error stacks, and crash traces stream into the lab while you work.

🌐 Network Inspector — every API call, its method, status, timing, and full payload. Click any request and see exactly what the API returned.

⏱ Solve-Time Stopwatch — start it when you're ready. Pause when you need a break. When all tests go green, your time is saved.

All of this is free. Come break something.

→ brokenrepo.tech

— Vijay
Built by Vijay Sharma · brokenrepo.tech
Unsubscribe: ${unsubscribeUrl}
`;
}

function html(unsubscribeUrl) {
  const feature = (icon, title, copy) => `<p style="margin:0 0 20px"><strong style="color:#dce6f5">${icon} ${title}</strong> — ${copy}</p>`;
  return `<!doctype html><html lang="en"><body style="margin:0;background:#111c2b;color:#b9c7da;font:16px/1.65 Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">BrokenRepo’s AI coach, live preview, runtime logs, network inspector, and stopwatch are live.</div>
<main style="max-width:640px;margin:0 auto;padding:36px 20px"><section style="background:#18273a;border:1px solid #354a64;border-radius:16px;padding:32px">
<p style="margin-top:0;color:#8fb3ff;font-weight:700">BrokenRepo</p><p>Hi there,</p>
<p>When we launched BrokenRepo a few weeks ago, a lot of you tried the challenges and sent real feedback. Someone wanted to see the UI actually break in front of them. Someone asked for logs. Someone asked for a stopwatch.</p>
<p style="color:#dce6f5;font-weight:700">We built all of it. Here's what's live now:</p>
${feature("🤖", "AI Debugging Coach", "ask it questions, attach files from your challenge, and get guidance that helps you think — without giving away the answer.")}
${feature("🔍", "Live Preview", "every challenge now runs as a real, clickable app. Watch it fail, fix the code, and watch your fix come alive.")}
${feature("📋", "Runtime Logs", "server output, error stacks, and crash traces stream into the lab while you work.")}
${feature("🌐", "Network Inspector", "every API call, its method, status, timing, and full payload. Click any request and see exactly what the API returned.")}
${feature("⏱", "Solve-Time Stopwatch", "start it when you're ready. Pause when you need a break. When all tests go green, your time is saved.")}
<p>All of this is free. Come break something.</p>
<p><a href="https://brokenrepo.tech" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#8fb3ff;color:#111c2b;text-decoration:none;font-weight:700">→ brokenrepo.tech</a></p>
<p>— Vijay<br>Built by Vijay Sharma · <a href="https://brokenrepo.tech" style="color:#8fb3ff">brokenrepo.tech</a></p>
<hr style="border:0;border-top:1px solid #354a64;margin:28px 0"><p style="font-size:13px;color:#8495aa"><a href="${unsubscribeUrl}" style="color:#9fb3cc">Unsubscribe</a></p>
</section></main></body></html>`;
}

async function sendAnnouncement(user) {
  const token = createUnsubscribeToken({ userId: user._id, email: user.email }, unsubscribeSecret);
  const unsubscribeUrl = `${publicApiUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: sender,
      to: [user.email],
      subject: "BrokenRepo just got a major upgrade 🛠️",
      text: plainText(unsubscribeUrl),
      html: html(unsubscribeUrl),
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const providerBody = await response.json().catch(() => ({}));
    const providerMessage = String(providerBody?.message || providerBody?.name || "request rejected")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/\bre_[A-Za-z0-9_-]+\b/g, "[redacted-key]")
      .replace(/token=[^&\s]+/gi, "token=[redacted]")
      .slice(0, 300);
    throw new Error(`HTTP ${response.status}: ${providerMessage}`);
  }
}

const client = new MongoClient(mongoUri, { appName: "brokenrepo-one-time-announcement", serverSelectionTimeoutMS: 10_000 });
let sent = 0;
const failed = [];
const failureReasons = new Map();

try {
  await client.connect();
  const users = await client.db(databaseName).collection("users").find(
    {
      email: { $type: "string", $ne: "" },
      unsubscribed: { $ne: true },
      announcementSent: { $ne: true },
      announcementSendingAt: { $exists: false },
    },
    { projection: { _id: 1, email: 1, createdAt: 1 } },
  ).toArray();
  const validUsers = users.flatMap((user) => {
    const parsed = emailSchema.safeParse(user.email);
    return parsed.success ? [{ _id: user._id, email: parsed.data.toLowerCase(), createdAt: user.createdAt }] : [];
  });
  const likelyGenuineUsers = validUsers.filter((user) => isLikelyGenuineEmail(user.email));
  const engagedUserIds = new Set(await client.db(databaseName).collection("progress").distinct("userId", {
    userId: { $in: likelyGenuineUsers.map((user) => user._id) },
    $or: [{ attempted: true }, { solved: true }, { attempts: { $gt: 0 } }],
  }));
  const selectionLimit = requestedLimit || likelyGenuineUsers.length;
  const eligibleUsers = selectAnnouncementAudience(likelyGenuineUsers, engagedUserIds, selectionLimit);

  console.log(`Valid subscribed users found: ${validUsers.length}`);
  console.log(`Obviously synthetic or disposable addresses excluded: ${validUsers.length - likelyGenuineUsers.length}`);
  console.log(`Likely genuine candidates: ${likelyGenuineUsers.length}`);
  console.log(`Engaged candidates prioritized: ${engagedUserIds.size}`);
  console.log(`Selected for this run: ${eligibleUsers.length}`);
  if (!requestedLimit && likelyGenuineUsers.length > DAILY_LIMIT) {
    console.log(`Stopped before sending: ${likelyGenuineUsers.length} exceeds the ${DAILY_LIMIT}-email daily safety limit. Rerun with --limit=100 after reviewing this dry run.`);
    console.log("Sent successfully: 0");
    console.log("Failed: 0");
    process.exitCode = 2;
  } else if (dryRun) {
    console.log(`Dry run: would send ${eligibleUsers.length} email(s); Resend was not called and no user records were changed.`);
    console.log("Sent successfully: 0");
    console.log("Failed: 0");
  } else {
    const usersCollection = client.db(databaseName).collection("users");
    for (const user of eligibleUsers) {
      let delivered = false;
      try {
        const claim = await usersCollection.findOneAndUpdate(
          {
            _id: user._id,
            email: user.email,
            unsubscribed: { $ne: true },
            announcementSent: { $ne: true },
            announcementSendingAt: { $exists: false },
          },
          { $set: { announcementSendingAt: new Date() } },
          { returnDocument: "after", projection: { _id: 1, email: 1 } },
        );
        if (!claim) continue;
        await sendAnnouncement(claim);
        delivered = true;
        await usersCollection.updateOne(
          { _id: claim._id, announcementSendingAt: { $exists: true } },
          { $set: { announcementSent: true, announcementSentAt: new Date() }, $unset: { announcementSendingAt: "" } },
        );
        sent += 1;
      } catch (error) {
        // A provider failure releases the claim for a deliberate retry. If the
        // provider succeeded but MongoDB did not record completion, retain the
        // claim so an accidental rerun cannot send a duplicate.
        if (!delivered) await usersCollection.updateOne({ _id: user._id }, { $unset: { announcementSendingAt: "" } }).catch(() => {});
        failed.push(user.email);
        const reason = error instanceof Error ? error.message : "Unknown provider error";
        failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
      }
      await sleep(SEND_DELAY_MS);
    }
    console.log(`Sent successfully: ${sent}`);
    console.log(`Failed: ${failed.length}`);
    if (failureReasons.size) {
      console.log("Failure reasons:");
      for (const [reason, count] of failureReasons) console.log(`- ${count} × ${reason}`);
    }
    if (failed.length) console.log(`Failed addresses: ${failed.join(", ")}`);
  }
} finally {
  await client.close();
}
