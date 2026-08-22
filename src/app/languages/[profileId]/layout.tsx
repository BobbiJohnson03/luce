import Link from "next/link";
import { LanguageProfileActions } from "@/components/languages/LanguageProfileActions";
import { LanguageProfileNav } from "@/components/languages/LanguageProfileNav";
import { loadLanguageProfile } from "@/lib/languages/server";
import type { LanguageProfile } from "@/lib/languages/types";

function levelSummary(profile: LanguageProfile): string {
  if (profile.current_cefr && profile.target_cefr) {
    return `${profile.current_cefr} → ${profile.target_cefr}`;
  }
  return profile.current_cefr ?? profile.target_cefr ?? "Not set";
}

function ProfileUnavailable() {
  return (
    <div className="mx-auto w-full max-w-3xl py-16">
      <p className="text-xs tracking-[0.25em] text-muted">LANGUAGES</p>
      <h1 className="mt-4 text-2xl font-light">
        This language profile is unavailable.
      </h1>
      <p className="mt-3 text-sm text-muted">
        It may have been archived or may not belong to you.
      </p>
      <Link
        href="/languages"
        className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to Languages
      </Link>
    </div>
  );
}

export default async function LanguageProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const { profile } = await loadLanguageProfile(profileId);
  if (!profile) return <ProfileUnavailable />;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="animate-fade-up py-6 sm:py-8">
        <Link
          href="/languages"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Languages
        </Link>
        <p className="mt-8 text-sm tracking-[0.3em] text-muted">
          {profile.language_name.toUpperCase()}
        </p>
        <div className="mt-3">
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">
            {profile.language_name}
          </h1>
          <p className="mt-3 text-sm text-muted-strong">
            {profile.language_name} → {profile.translation_language_name}
            {(profile.current_cefr || profile.target_cefr) &&
              ` · ${levelSummary(profile)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
        <div className="overflow-x-auto">
          <LanguageProfileNav profileId={profile.id} />
        </div>
        <div className="pb-3">
          <LanguageProfileActions profile={profile} />
        </div>
      </div>

      {children}
    </div>
  );
}
