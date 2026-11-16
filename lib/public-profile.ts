export type PublicProfile = {
  handle: string;
  displayName: string;
  bio: string;
  memberSince: string | null;
  stats: { attempted: number; solved: number };
  categories: { name: string; total: number; solved: number }[];
  completedChallenges: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    solvedAt: string | null;
  }[];
};

export type ProfileSettings = { enabled: boolean; handle: string; displayName: string; bio: string };
