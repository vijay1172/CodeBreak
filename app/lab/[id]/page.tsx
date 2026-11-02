import { BrokenRepoApp } from "@/components/brokenrepo-app";
import { TrackVisit } from "@/components/track-visit";
import { getCatalogEntry, labChallengeParams } from "@/lib/challenge-catalog";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return labChallengeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getCatalogEntry(id);
  return { title: entry?.title || "Challenge not found", description: "Debug " + (entry?.title || "a project") + " in the BrokenRepo practice lab. Edit code and verify your fix with live tests.", robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCatalogEntry(id)) notFound();
  return <><TrackVisit kind="lab_open" challengeId={id}/><BrokenRepoApp challengeId={id}/></>;
}
