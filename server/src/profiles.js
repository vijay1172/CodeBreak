import { Router } from "express";
import { z } from "zod";

const reservedHandles = new Set(["admin", "api", "challenges", "incidents", "login", "machine-coding", "progress", "signup", "u"]);
const handlePattern = /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$/;
const profileInput = z.object({
  enabled: z.boolean(),
  handle: z.string().trim().toLowerCase().min(3).max(24).regex(handlePattern).refine((value) => !reservedHandles.has(value), "That handle is reserved."),
  displayName: z.string().trim().max(60).default(""),
  bio: z.string().trim().max(180).default(""),
});

export function serializeProfileSettings(user) {
  const profile = user?.publicProfile || {};
  return {
    enabled: profile.enabled === true,
    handle: typeof profile.handle === "string" ? profile.handle : "",
    displayName: typeof profile.displayName === "string" ? profile.displayName : "",
    bio: typeof profile.bio === "string" ? profile.bio : "",
  };
}

export async function buildPublicProfile({ database, handle, challenges = () => [] }) {
  const user = await database().collection("users").findOne(
    { "publicProfile.enabled": true, "publicProfile.handle": handle },
    { projection: { publicProfile: 1, createdAt: 1 } },
  );
  if (!user) return null;

  const progress = await database().collection("progress").find(
    { userId: user._id },
    { projection: { challengeId: 1, attempted: 1, solved: 1, solvedAt: 1, _id: 0 } },
  ).toArray();
  const catalog = challenges();
  const byId = new Map(catalog.map((challenge) => [challenge.id, challenge]));
  const knownProgress = progress.filter((item) => byId.has(item.challengeId));
  const completedChallenges = knownProgress
    .filter((item) => item.solved === true)
    .map((item) => {
      const challenge = byId.get(item.challengeId);
      return {
        id: challenge.id,
        title: challenge.title,
        category: challenge.category,
        difficulty: challenge.difficulty,
        solvedAt: item.solvedAt instanceof Date ? item.solvedAt.toISOString() : null,
      };
    })
    .sort((a, b) => (b.solvedAt || "").localeCompare(a.solvedAt || ""));
  const attempted = knownProgress.filter((item) => item.attempted === true || item.solved === true);
  const categories = new Map();
  for (const challenge of catalog) {
    const group = categories.get(challenge.category) || { name: challenge.category, total: 0, solved: 0 };
    group.total += 1;
    if (completedChallenges.some((item) => item.id === challenge.id)) group.solved += 1;
    categories.set(challenge.category, group);
  }

  const profile = serializeProfileSettings(user);
  return {
    handle: profile.handle,
    displayName: profile.displayName || profile.handle,
    bio: profile.bio,
    memberSince: user.createdAt instanceof Date ? `${user.createdAt.getUTCFullYear()}` : null,
    stats: { attempted: attempted.length, solved: completedChallenges.length },
    categories: [...categories.values()].filter((item) => item.solved > 0).sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name)),
    completedChallenges,
  };
}

export function createProfileRouter({ database, requireAccount, challenges = () => [] }) {
  const router = Router();
  router.get("/me", requireAccount, async (req, res) => {
    const user = await database().collection("users").findOne({ _id: req.userId }, { projection: { publicProfile: 1 } });
    res.set("Cache-Control", "no-store").json({ profile: serializeProfileSettings(user) });
  });

  router.put("/me", requireAccount, async (req, res) => {
    const parsed = profileInput.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "Choose a 3–24 character handle using lowercase letters, numbers, and hyphens. Display name and bio are optional." });
    const profile = parsed.data;
    try {
      const result = await database().collection("users").updateOne(
        { _id: req.userId },
        { $set: { publicProfile: { ...profile, updatedAt: new Date() } } },
      );
      if (!result.matchedCount) return res.status(404).json({ error: "Account not found." });
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ error: "That profile handle is already in use." });
      throw error;
    }
    return res.json({ profile: serializeProfileSettings({ publicProfile: profile }) });
  });

  router.get("/:handle", async (req, res) => {
    const handle = String(req.params.handle || "").toLowerCase();
    if (!handlePattern.test(handle)) return res.status(404).json({ error: "Profile not found." });
    const profile = await buildPublicProfile({ database, handle, challenges });
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    res.set("Cache-Control", "no-store").json({ profile });
  });
  return router;
}
