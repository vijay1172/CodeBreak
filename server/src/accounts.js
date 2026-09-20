import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { z } from "zod";
import { database } from "./session-store.js";
const scrypt = promisify(scryptCallback);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const credentials = z.object({ email: z.string().trim().email().max(254).transform(x => x.toLowerCase()), password: z.string().min(10).max(128) });
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  const [salt, encoded] = stored.split(":");
  const expected = Buffer.from(encoded, "hex");
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function setupAccounts() {
  await database().collection("users").createIndex({ email: 1 }, { unique: true });
  await database().collection("authSessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database().collection("progress").createIndex({ userId: 1, challengeId: 1 }, { unique: true });
  await database().collection("authLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
async function issueSession(user) {
  const token = randomBytes(32).toString("hex");
  await database().collection("authSessions").insertOne({ _id: digest(token), userId: user._id, expiresAt: new Date(Date.now() + 7 * 86400000) });
  return { token, user: { id: user._id, email: user.email } };
}
export async function requireAccount(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  const session = token && await database().collection("authSessions").findOne({ _id: digest(token), expiresAt: { $gt: new Date() } });
  if (!session) return res.status(401).json({ error: "Log in to continue. Your saved progress will be here." });
  req.userId = session.userId;
  req.authToken = token;
  next();
}

export async function requireAdmin(req, res, next) {
  const user = await database().collection("users").findOne({ _id: req.userId }, { projection: { role: 1 } });
  if (user?.role !== "admin") return res.status(403).json({ error: "Admin access is required." });
  next();
}
export const accountRouter = Router();
accountRouter.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
accountRouter.use(["/signup", "/login"], async (req, res, next) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const bucket = Math.floor(Date.now() / 900000);
  const limit = await database().collection("authLimits").findOneAndUpdate(
    { _id: digest(`${email}:${bucket}`) },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 1800000) } },
    { upsert: true, returnDocument: "after" },
  );
  if (limit.count > 20) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  next();
});
accountRouter.post("/signup", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and a password between 10 and 128 characters." });
  const user = { _id: randomUUID(), email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), role: "user", createdAt: new Date() };
  try { await database().collection("users").insertOne(user); }
  catch (error) { if (error.code === 11000) return res.status(409).json({ error: "That email is already registered. Log in instead." }); throw error; }
  res.status(201).json(await issueSession(user));
});
accountRouter.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter your email and password (10–128 characters)." });
  const user = await database().collection("users").findOne({ email: parsed.data.email });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash || `${"0".repeat(32)}:${"0".repeat(128)}`);
  if (!user || !valid) return res.status(401).json({ error: "That email and password don’t match. Please try again." });
  res.json(await issueSession(user));
});
accountRouter.get("/me", requireAccount, async (req, res) => {
  const user = await database().collection("users").findOne({ _id: req.userId });
  res.json({ user: { id: user._id, email: user.email, role: user.role ?? "user" } });
});
accountRouter.post("/logout", requireAccount, async (req, res) => {
  await database().collection("authSessions").deleteOne({ _id: digest(req.authToken) });
  res.json({ message: "You’re logged out." });
});
export async function saveProgress(userId, challengeId, files, result) {
  const update = { $set: { files, updatedAt: new Date() }, $setOnInsert: { userId, challengeId, startedAt: new Date() } };
  if (result && result.phase !== "infrastructure") {
    update.$set.lastResult = result;
    update.$set.attempted = true;
    update.$inc = { attempts: 1 };
    if (result.allPassed) { update.$set.solved = true; update.$set.solvedAt = new Date(); }
  }
  await database().collection("progress").updateOne({ userId, challengeId }, update, { upsert: true });
}
