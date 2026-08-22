import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageProfileActions } from "@/components/languages/LanguageProfileActions";
import { createClient } from "@/lib/supabase/server";
import type { LanguageProfile } from "@/lib/languages/types";

const PROFILE_COLUMNS =
  "id, user_id, language_code, language_name, translation_language_code, translation_language_name, current_cefr, target_cefr, daily_goal_minutes, position, archived_at, created_at, updated_at";

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
      <h1 className="mt-4 text-2xl font-light">This language profile is unavailable.</h1>
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

export default async function LanguageProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("language_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", profileId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) console.error("Could not load language profile:", error);
  if (error || !data) return <ProfileUnavailable />;

  const profile = data as LanguageProfile;

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
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
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
      </div>

      <div className="flex items-center justify-between border-b border-border">
        <span
          aria-current="page"
          className="border-b border-accent px-1 pb-3 text-sm text-foreground"
        >
          Overview
        </span>
        <div className="pb-3">
          <LanguageProfileActions profile={profile} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
        <section className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-8">
          <p className="text-xs tracking-[0.25em] text-muted">OVERVIEW</p>
          <h2 className="mt-4 text-2xl font-light tracking-tight">
            Your language space is ready.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Vocabulary, topics, review, and study tools will appear here as they
            are added to Luce. For now, this profile holds the direction of your
            learning.
          </p>
        </section>

        <aside className="rounded-2xl border border-border bg-surface/30 p-6">
          <p className="text-xs tracking-[0.25em] text-muted">PROFILE</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Primary translation</dt>
              <dd className="mt-1 text-foreground">
                {profile.translation_language_name}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-muted">Current level</dt>
                <dd className="mt-1 text-foreground">
                  {profile.current_cefr ?? "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Target level</dt>
                <dd className="mt-1 text-foreground">
                  {profile.target_cefr ?? "Not set"}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-muted">Daily goal</dt>
              <dd className="mt-1 text-foreground">
                {profile.daily_goal_minutes
                  ? `${profile.daily_goal_minutes} minutes`
                  : "Not set"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
