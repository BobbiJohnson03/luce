import Link from "next/link";
import { loadLanguageProfile } from "@/lib/languages/server";

export default async function LanguageProfileOverviewPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const [vocabularyResult, topicResult, recentResult] = await Promise.all([
    supabase
      .from("vocabulary_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .is("archived_at", null),
    supabase
      .from("language_topics")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("language_profile_id", profileId),
    supabase
      .from("vocabulary_items")
      .select("id, term, translation")
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  if (vocabularyResult.error || topicResult.error || recentResult.error) {
    console.error("Could not load language overview:", {
      vocabulary: vocabularyResult.error,
      topics: topicResult.error,
      recent: recentResult.error,
    });
  }

  const vocabularyCount = vocabularyResult.count ?? 0;
  const topicCount = topicResult.count ?? 0;
  const recent = recentResult.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
      <section className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-8">
        <p className="text-xs tracking-[0.25em] text-muted">OVERVIEW</p>
        <h2 className="mt-4 text-2xl font-light tracking-tight">
          {vocabularyCount === 0
            ? "Begin with the words you want to keep."
            : `${vocabularyCount} ${vocabularyCount === 1 ? "word" : "words"} in your language space.`}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Build your vocabulary naturally, then use topics to connect words by
          meaning and context.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={`/languages/${profileId}/vocabulary`}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Open vocabulary
          </Link>
          <Link
            href={`/languages/${profileId}/topics`}
            className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Browse topics
          </Link>
        </div>

        {recent.length > 0 && (
          <div className="mt-9 border-t border-border pt-6">
            <p className="text-xs tracking-[0.2em] text-muted">RECENTLY ADDED</p>
            <div className="mt-4 divide-y divide-border">
              {recent.map((item) => (
                <div key={item.id} className="flex gap-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 text-foreground">
                    {item.term}
                  </span>
                  <span className="min-w-0 flex-1 text-right text-muted">
                    {item.translation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface/30 p-6">
          <p className="text-xs tracking-[0.25em] text-muted">CONTENT</p>
          <dl className="mt-5 grid grid-cols-2 gap-5">
            <div>
              <dt className="text-sm text-muted">Vocabulary</dt>
              <dd className="mt-1 text-2xl font-light">{vocabularyCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Topics</dt>
              <dd className="mt-1 text-2xl font-light">{topicCount}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface/30 p-6">
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
        </div>
      </aside>
    </div>
  );
}
