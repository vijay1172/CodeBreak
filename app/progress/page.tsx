import { ChallengeLibrary } from "@/components/challenge-library";
export const metadata = { title: "My progress", description: "Review attempted and solved CodeBreak challenges and your completion by debugging category.", robots: { index: false } };
export default function Page() { return <ChallengeLibrary progressOnly/>; }
