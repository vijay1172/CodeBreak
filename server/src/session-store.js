import { MongoClient } from "mongodb";
import { config } from "./config.js";

const client = new MongoClient(config.mongoUri, {
  appName: "brokenrepo-orchestrator",
  serverSelectionTimeoutMS: 10_000,
});

let sessions;
let reports;

export function database() { return client.db(config.mongoDbName); }

export function eventsCollection() { return database().collection("events"); }

export async function connectSessionStore() {
  await client.connect();
  const database = client.db(config.mongoDbName);
  sessions = database.collection("sessions");
  reports = database.collection("challengeReports");
  await sessions.createIndex({ lastActivityAt: 1 });
  await sessions.createIndex({ status: 1 });
  await reports.createIndex({ challengeId: 1, status: 1, createdAt: -1 });
  const events = database.collection("events");
  await events.createIndex({ kind: 1, challengeId: 1 });
  await events.createIndex({ createdAt: 1 }, { expireAfterSeconds: 180 * 86400 });
}

function collection() {
  if (!sessions) throw new Error("Session store is not connected");
  return sessions;
}

export async function createSessionRecord({ id, challengeId, files, userId }) {
  const now = new Date();
  await collection().insertOne({
    _id: id,
    challengeId,
    userId,
    files,
    status: "provisioning",
    sandboxId: null,
    workspaceDirectory: null,
    setupOutput: "",
    error: null,
    lastRun: null,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });
}

export async function getSessionRecord(id) {
  return collection().findOne({ _id: id });
}

export async function markSessionReady(id, { sandboxId, workspaceDirectory, setupOutput }) {
  const now = new Date();
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        status: "ready",
        sandboxId,
        workspaceDirectory,
        setupOutput,
        error: null,
        updatedAt: now,
        lastActivityAt: now,
      },
    },
  );
}

export async function markSessionError(id, error) {
  const now = new Date();
  await collection().updateOne(
    { _id: id },
    { $set: { status: "error", error, updatedAt: now, lastActivityAt: now } },
  );
}

export async function markSessionRunning(id) {
  const now = new Date();
  await collection().updateOne(
    { _id: id },
    { $set: { status: "running", updatedAt: now, lastActivityAt: now } },
  );
}

export async function saveSessionRun(id, { files, result }) {
  const now = new Date();
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        status: "ready",
        files,
        lastRun: result,
        updatedAt: now,
        lastActivityAt: now,
      },
    },
  );
}

export async function touchSession(id) {
  const now = new Date();
  await collection().updateOne(
    { _id: id },
    { $set: { updatedAt: now, lastActivityAt: now } },
  );
}

export async function listExpiredSessions(cutoff) {
  return collection()
    .find({
      lastActivityAt: { $lt: cutoff },
      status: { $in: ["provisioning", "ready", "running", "error"] },
    })
    .toArray();
}

export async function markSessionDeleting(id) {
  await collection().updateOne(
    { _id: id },
    { $set: { status: "deleting", updatedAt: new Date() } },
  );
}

export async function markSessionDeleted(id) {
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        status: "deleted",
        sandboxId: null,
        workspaceDirectory: null,
        updatedAt: new Date(),
        deletedAt: new Date(),
      },
    },
  );
}

export async function closeSessionStore() {
  await client.close();
}

export async function createChallengeReport({ challengeId, sessionId, details }) {
  const report = {
    challengeId,
    sessionId: sessionId || null,
    details: details || "Challenge behavior appears incorrect",
    status: "open",
    createdAt: new Date(),
  };
  const result = await reports.insertOne(report);
  return { reportId: result.insertedId.toString(), status: report.status };
}
