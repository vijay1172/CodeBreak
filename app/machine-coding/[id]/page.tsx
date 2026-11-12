import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { getMachineCodingExercise, machineCodingExercises } from "@/lib/machine-coding/catalog";
import { getMachineCodingContent } from "@/lib/machine-coding/exercise-content";
import { MachineCodingExerciseGate } from "@/components/machine-coding/machine-coding-exercise-gate";
import { TrackVisit } from "@/components/track-visit";

export const dynamicParams = false;

export function generateStaticParams() {
  return machineCodingExercises.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const exercise = getMachineCodingExercise((await params).id);
  return { title: exercise ? `${exercise.title} Machine Coding exercise` : "Exercise not found", robots: { index: false } };
}

export default async function MachineCodingExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const exercise = getMachineCodingExercise((await params).id);
  if (!exercise) notFound();
  const content = exercise.access === "free" ? getMachineCodingContent(exercise.id) : undefined;
  return <><SiteHeader/><TrackVisit kind="machine_coding_view" challengeId={exercise.id}/><MachineCodingExerciseGate exercise={exercise} freeContent={content}/><SiteFooter/></>;
}

