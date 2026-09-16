import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env.local") });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export const config = {
  port: positiveInteger("PORT", 4000),
  daytonaApiKey: required("DAYTONA_API_KEY"),
  daytonaApiUrl: required("DAYTONA_API_URL"),
  daytonaTarget: process.env.DAYTONA_TARGET?.trim() || "us",
  mongoUri: required("MONGODB_URI"),
  mongoDbName: process.env.MONGODB_DB_NAME?.trim() || "debugbench",
  clientOrigins: (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  sessionIdleMinutes: positiveInteger("SESSION_IDLE_MINUTES", 25),
  sessionTtlMinutes: positiveInteger("SESSION_TTL_MINUTES", 30),
  projectRoot: path.resolve(here, ".."),
};
