import { MachineCodingLanding } from "@/components/machine-coding/machine-coding-landing";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { machineCodingExercises } from "@/lib/machine-coding/catalog";
import { TrackVisit } from "@/components/track-visit";

export const metadata = {
  title: "Machine Coding interview practice",
  description: "Practice browser-based object-oriented machine coding rounds with progressively revealed requirements and observable scenarios.",
  alternates: { canonical: "/machine-coding" },
};

export default function MachineCodingPage() {
  return <><SiteHeader/><TrackVisit kind="machine_coding_view"/><main id="main-content" tabIndex={-1}><MachineCodingLanding exercises={machineCodingExercises}/></main><SiteFooter/></>;
}

