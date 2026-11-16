import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-config";
import type { PublicProfile } from "@/lib/public-profile";
import { PublicProfileView } from "@/components/public-profile-view";

export const dynamic = "force-dynamic";
const backend = process.env.BROKENREPO_BACKEND_URL || process.env.NEXT_PUBLIC_BROKENREPO_API_URL || "https://api.brokenrepo.tech";

const getProfile = cache(async (handle: string): Promise<PublicProfile | null> => {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$/.test(handle)) return null;
  try {
    const response = await fetch(`${backend.replace(/\/$/, "")}/api/profiles/${encodeURIComponent(handle)}`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const body = await response.json() as { profile?: PublicProfile };
    return body.profile || null;
  } catch { return null; }
});

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(handle.toLowerCase());
  if (!profile) return { title: "Profile not found", robots: { index: false, follow: false } };
  const title = `${profile.displayName} (@${profile.handle})`;
  const description = profile.bio || `${profile.stats.solved} debugging challenges solved on BrokenRepo. Explore ${profile.displayName}’s public practice profile.`;
  return {
    title,
    description,
    alternates: { canonical: `/u/${profile.handle}` },
    openGraph: { type: "profile", siteName: "BrokenRepo", title, description, url: `${SITE_URL}/u/${profile.handle}`, images: [{ url: "/og-image.png", width: 1200, height: 630, alt: `BrokenRepo practice profile for ${profile.displayName}` }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await getProfile(handle.toLowerCase());
  if (!profile) notFound();
  return <PublicProfileView profile={profile}/>;
}
