import Link from "next/link";
import {
  PracticeSessionClient,
  type PracticeRunnerCard,
} from "@/components/languages/PracticeSessionClient";
import { PracticeSummary } from "@/components/languages/PracticeSummary";
import { loadLanguageProfile } from "@/lib/languages/server";
import { loadSessionAttempts } from "@/lib/languages/srs/review-server";
import { loadPracticeCards } from "@/lib/languages/srs/practice-server";
import {
  remainingPlan,
  type PracticeDirection,
  type PracticePlanEntry,
} from "@/lib/languages/srs/practice";
import { summarizeAttempts } from "@/lib/languages/srs/summary";
import { getI18n } from "@/lib/i18n/server";
import { getLanguageDisplayName } from "@/lib/languages/catalog";

type PracticeConfig = {
  mode?: string;
  scope?: { type?: string; topicId?: string | null };
  plan?: PracticePlanEntry[];
};

async function Unavailable({ profileId }: { profileId: string }) {
  const { t } = await getI18n();
  return (
    <div className="mx-auto w-full max-w-lg py-16">
      <p className="text-xs tracking-[0.3em] text-muted">
        {t("practice.label")}
      </p>
      <h2 className="mt-4 text-2xl font-light">
        {t("practice.sessionUnavailable")}
      </h2>
      <p className="mt-3 text-sm text-muted">
        {t("practice.sessionUnavailableDescription")}
      </p>
      <Link
        href={`/languages/${profileId}/practice`}
        className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
      >
        {t("practice.back")}
      </Link>
    </div>
  );
}

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ profileId: string; sessionId: string }>;
}) {
  const { profileId, sessionId } = await params;
  const { locale, t } = await getI18n();
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const { data: sessionRow, error } = await supabase
    .from("study_sessions")
    .select(
      "id, session_kind, status, duration_ms, started_at, configuration",
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .maybeSingle();

  if (error) console.error("Could not load practice session:", error);
  if (!sessionRow || sessionRow.session_kind !== "practice") {
    return <Unavailable profileId={profileId} />;
  }

  const config = (sessionRow.configuration ?? {}) as PracticeConfig;
  const plan = Array.isArray(config.plan) ? config.plan : [];
  const mode = String(config.mode ?? "mixed");
  const modeLabel =
    mode === "recall"
      ? t("practice.recall")
      : mode === "reverse"
        ? t("practice.reverse")
        : t("practice.mixed");

  let scopeLabel = t("practice.allVocabulary");
  const topicId = config.scope?.type === "topic" ? config.scope?.topicId : null;
  if (topicId) {
    const { data: topic } = await supabase
      .from("language_topics")
      .select("name")
      .eq("id", topicId)
      .eq("user_id", userId)
      .maybeSingle();
    scopeLabel = topic?.name
      ? t("practice.scopeTopic", { topic: topic.name })
      : t("practice.topic");
  }

  const attempts = await loadSessionAttempts(supabase, userId, sessionId);

  if (sessionRow.status !== "active") {
    return (
      <PracticeSummary
        summary={summarizeAttempts(attempts)}
        durationMs={sessionRow.duration_ms as number | null}
        profileId={profileId}
        modeLabel={modeLabel}
        scopeLabel={scopeLabel}
      />
    );
  }

  // Resume: only the not-yet-attempted portion of the persisted plan, keeping
  // each card's original direction stable.
  const remaining = remainingPlan(
    plan,
    attempts.map((a) => a.itemId),
  );
  const content = await loadPracticeCards(
    supabase,
    userId,
    profileId,
    remaining.map((entry) => entry.itemId),
  );

  const cards: PracticeRunnerCard[] = [];
  for (const entry of remaining) {
    const item = content.get(entry.itemId);
    if (!item) continue; // archived/removed since the plan was created — skip.
    const direction: PracticeDirection = entry.direction;
    const isRecall = direction === "recall";
    cards.push({
      itemId: entry.itemId,
      direction,
      eyebrow: t("practice.cardEyebrow", {
        direction:
          direction === "recall"
            ? t("practice.recall").toLocaleUpperCase(locale)
            : t("practice.reverse").toLocaleUpperCase(locale),
      }),
      front: isRecall ? item.term : item.translation,
      backPrimary: isRecall ? item.translation : item.term,
      backSecondary: item.definition,
      exampleSentence: item.exampleSentence,
      exampleTranslation: item.exampleTranslation,
    });
  }

  return (
    <PracticeSessionClient
      profileId={profileId}
      sessionId={sessionId}
      languageName={getLanguageDisplayName(profile.language_code, locale)}
      cards={cards}
      priorAttempts={attempts}
      startedAtMs={new Date(sessionRow.started_at as string).getTime()}
      modeLabel={modeLabel}
      scopeLabel={scopeLabel}
    />
  );
}
