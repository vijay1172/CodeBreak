import { CodeBreakApp } from "@/components/codebreak-app";
import { notFound } from "next/navigation";
const titles: Record<string, string> = {
  "the-missing-name": "The Missing Name", "the-ghost-update": "The Ghost Update",
  "the-silent-field": "The Silent Field", "locked-out-sometimes": "Locked Out, Sometimes",
  "the-stubborn-counter": "The Stubborn Counter", "works-on-my-machine": "Works On My Machine",
  "the-vanishing-last-item": "The Vanishing Last Item", "the-silent-crash": "The Silent Crash",
  "the-penny-gap": "The Penny Gap", "a-day-too-early": "A Day Too Early",
  "the-split-import": "The Split Import", "the-room-that-wont-leave": "The Room That Won’t Leave",
  "the-borrowed-language": "The Borrowed Language", "the-search-that-guesses": "The Search That Guesses",
  "one-click-two-bookings": "One Click, Two Bookings",
};
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: titles[id] || "Challenge not found", description: "Debug " + (titles[id] || "a project") + " in the CodeBreak practice lab. Edit code and verify your fix with live tests.", robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!titles[id]) notFound();
  return <CodeBreakApp challengeId={id}/>;
}
