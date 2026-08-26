import Link from "next/link";
import { loadLanguageProfile } from "@/lib/languages/server";
import { countDueReviewCards } from "@/lib/languages/srs/review-server";
import { getI18n } from "@/lib/i18n/server";
import { getLanguageDisplayName } from "@/lib/languages/catalog";

export default async function LanguageProfileOverviewPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const { locale, t } = await getI18n();
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const [vocabularyResult, topicResult, recentResult, noteLinkResult, dueCount] =
    await Promise.all([
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
      supabase
        .from("language_note_links")
        .select("id, note_id, created_at", { count: "exact" })
        .eq("user_id", userId)
        .eq("language_profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(4),
      countDueReviewCards(supabase, userId, profileId),
    ]);

  if (
    vocabularyResult.error ||
    topicResult.error ||
    recentResult.error ||
    noteLinkResult.error
  ) {
    console.error("Could not load language overview:", {
      vocabulary: vocabularyResult.error,
      topics: topicResult.error,
      recent: recentResult.error,
      notes: noteLinkResult.error,
    });
  }

  const vocabularyCount = vocabularyResult.count ?? 0;
  const topicCount = topicResult.count ?? 0;
  const recent = recentResult.data ?? [];
  const linkedNoteCount = noteLinkResult.count ?? 0;
  const recentNoteLinks = noteLinkResult.data ?? [];
  const recentNoteData =
    recentNoteLinks.length > 0
      ? await supabase
          .from("notes")
          .select("id, title, updated_at")
          .eq("user_id", userId)
          .in(
            "id",
            recentNoteLinks.map((link) => link.note_id),
          )
      : { data: [], error: null };
  if (recentNoteData.error) {
    console.error("Could not load recent linked Notes:", recentNoteData.error);
  }
  const noteById = new Map(
    (recentNoteData.data ?? []).map((note) => [note.id, note]),
  );
  const recentLinkedNotes = recentNoteLinks.flatMap((link) => {
    const note = noteById.get(link.note_id);
    return note ? [note] : [];
  });

  return (
    <div className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
      <section className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-8">
        <p className="text-xs tracking-[0.25em] text-muted">
          {t("overview.label")}
        </p>
        <h2 className="mt-4 text-2xl font-light tracking-tight">
          {vocabularyCount === 0
            ? t("overview.begin")
            : t(
                vocabularyCount === 1
                  ? "overview.wordsOne"
                  : "overview.wordsOther",
                { count: vocabularyCount },
              )}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {t("overview.description")}
        </p>

        {dueCount > 0 && (
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href={`/languages/${profileId}/review?from=overview`}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {t("overview.review")}
            </Link>
            <span className="text-sm text-muted">
              {t("overview.dueToday", { count: dueCount })}
            </span>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={`/languages/${profileId}/vocabulary`}
            className={
              dueCount > 0
                ? "rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
                : "rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            }
          >
            {t("overview.openVocabulary")}
          </Link>
          <Link
            href={`/languages/${profileId}/topics`}
            className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("overview.browseTopics")}
          </Link>
          <Link
            href={`/languages/${profileId}/notes`}
            className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("overview.openNotes")}
          </Link>
          <Link
            href={`/languages/${profileId}/practice`}
            className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("overview.practice")}
          </Link>
        </div>

        {recent.length > 0 && (
          <div className="mt-9 border-t border-border pt-6">
            <p className="text-xs tracking-[0.2em] text-muted">
              {t("overview.recentVocabulary")}
            </p>
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

        {recentLinkedNotes.length > 0 && (
          <div className="mt-7 border-t border-border pt-6">
            <p className="text-xs tracking-[0.2em] text-muted">
              {t("overview.recentNotes")}
            </p>
            <div className="mt-4 divide-y divide-border">
              {recentLinkedNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="group flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="truncate text-foreground transition-colors group-hover:text-accent">
                    {note.title || t("notes.untitled")}
                  </span>
                  <span className="shrink-0 text-muted">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface/30 p-6">
          <p className="text-xs tracking-[0.25em] text-muted">
            {t("overview.content")}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-5">
            <div>
              <dt className="text-sm text-muted">{t("languages.navVocabulary")}</dt>
              <dd className="mt-1 text-2xl font-light">{vocabularyCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("languages.navTopics")}</dt>
              <dd className="mt-1 text-2xl font-light">{topicCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("languages.navNotes")}</dt>
              <dd className="mt-1 text-2xl font-light">{linkedNoteCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("overview.due")}</dt>
              <dd className="mt-1 text-2xl font-light tabular-nums">
                {dueCount}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface/30 p-6">
          <p className="text-xs tracking-[0.25em] text-muted">
            {t("overview.profile")}
          </p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted">{t("overview.primaryTranslation")}</dt>
              <dd className="mt-1 text-foreground">
                {getLanguageDisplayName(
                  profile.translation_language_code,
                  locale,
                )}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-muted">{t("overview.currentLevel")}</dt>
                <dd className="mt-1 text-foreground">
                  {profile.current_cefr ?? t("common.notSet")}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("overview.targetLevel")}</dt>
                <dd className="mt-1 text-foreground">
                  {profile.target_cefr ?? t("common.notSet")}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-muted">{t("overview.dailyGoal")}</dt>
              <dd className="mt-1 text-foreground">
                {profile.daily_goal_minutes
                  ? t("overview.minutes", {
                      count: profile.daily_goal_minutes,
                    })
                  : t("common.notSet")}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
