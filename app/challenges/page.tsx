import { ChallengeLibrary } from "@/components/challenge-library";
import { challengeCatalog } from "@/lib/challenge-catalog";
import type { ChallengeSummary } from "@/lib/brokenrepo-api";

// Seeded from the static catalog so the card grid is in the initial HTML the
// crawler sees, not behind a client-side fetch.
const initialItems: ChallengeSummary[] = challengeCatalog.map((entry) => ({
  id: entry.id,
  title: entry.title,
  category: entry.category,
  difficulty: entry.difficulty,
  stack: "MERN",
}));

export const metadata = { title: "Debugging practice challenges — fix real code bugs", description: "Fifteen full stack debugging challenges on real repos: API, auth, React state, caching, dates, retries. Repo based questions practice for interviews and OA prep.", alternates: { canonical: "/challenges" } };
export default function Page() { return <ChallengeLibrary initialItems={initialItems}/>; }
