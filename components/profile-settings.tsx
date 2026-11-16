"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Globe2, LockKeyhole, Share2 } from "lucide-react";
import { jsonRequest } from "@/lib/brokenrepo-api";
import type { ProfileSettings } from "@/lib/public-profile";

const emptyProfile: ProfileSettings = { enabled: false, handle: "", displayName: "", bio: "" };

export function ProfileSettingsCard() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void jsonRequest<{ profile: ProfileSettings }>("/profiles/me")
      .then((data) => { if (active) setProfile({ ...emptyProfile, ...data.profile }); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load profile settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      const result = await jsonRequest<{ profile: ProfileSettings }>("/profiles/me", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(profile),
      });
      setProfile({ ...emptyProfile, ...result.profile }); setMessage("Profile settings saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your profile.");
    } finally { setSaving(false); }
  }

  async function copyLink() {
    if (!profile.handle || typeof window === "undefined") return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/u/${profile.handle}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError("Clipboard access was unavailable. You can copy the profile URL from the preview link."); }
  }

  return <section className="profile-settings" aria-labelledby="profile-settings-title">
    <div className="profile-settings-heading">
      <span className="profile-settings-icon" aria-hidden="true"><Share2 size={18}/></span>
      <div><h2 id="profile-settings-title">Share your work</h2></div>
      <span className={profile.enabled ? "profile-visibility is-public" : "profile-visibility"}>{profile.enabled ? <><Globe2 size={14}/> Public</> : <><LockKeyhole size={14}/> Private</>}</span>
    </div>
    {loading ? <p className="profile-settings-status" role="status">Loading profile settings…</p> : <form onSubmit={save}>
      <label className="profile-toggle"><input type="checkbox" checked={profile.enabled} onChange={(event) => setProfile((value) => ({ ...value, enabled: event.target.checked }))}/><span><strong>Make my profile public</strong><small>Your email and saved code are never shown.</small></span></label>
      <div className="profile-settings-fields">
        <label><span>Profile handle</span><div className="handle-input"><span>brokenrepo.tech/u/</span><input required minLength={3} maxLength={24} pattern="[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]" autoComplete="off" value={profile.handle} onChange={(event) => setProfile((value) => ({ ...value, handle: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) }))} placeholder="your-handle"/></div><small>3–24 letters, numbers, or hyphens.</small></label>
        <label><span>Display name <small>optional</small></span><input maxLength={60} value={profile.displayName} onChange={(event) => setProfile((value) => ({ ...value, displayName: event.target.value }))} placeholder="How you want to be known"/></label>
        <label className="profile-bio-field"><span>Short introduction <small>optional</small></span><textarea maxLength={180} rows={2} value={profile.bio} onChange={(event) => setProfile((value) => ({ ...value, bio: event.target.value }))} placeholder="What are you learning or building?"/></label>
      </div>
      {error && <p className="error-message profile-feedback" role="alert">{error}</p>}
      {message && <p className="profile-success" role="status"><Check size={15}/>{message}</p>}
      <div className="profile-settings-actions"><button className="button small" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>{profile.enabled && profile.handle && <><Link className="button secondary small" href={`/u/${profile.handle}`} target="_blank" rel="noopener noreferrer">Preview profile <ExternalLink size={14}/></Link><button type="button" className="button secondary small" onClick={copyLink}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copied" : "Copy link"}</button></>}</div>
    </form>}
  </section>;
}
