import Link from "next/link";
import { ReviewSessionClient } from "@/components/languages/ReviewSessionClient";
import { ReviewSummary } from "@/components/languages/ReviewSummary";
import { loadLanguageProfile } from "@/lib/languages/server";
import {
  loadDueReviewCards,
  loadReviewSession,
  loadSessionAttempts,
} from "@/lib/languages/srs/review-server";
import { summarizeAttempts } from "@/lib/languages/srs/summary";
import { getI18n } from "@/lib/i18n/server";
import { getLanguageDisplayName } from "@/lib/languages/catalog";

async function SessionUnavailable({ profileId }: { profileId: string }) {
  const { t } = await getI18n();
  return (
    <div className="mx-auto w-full max-w-lg py-16">
      <p className="text-xs tracking-[0.3em] text-muted">{t("review.label")}</p>
      <h2 className="mt-4 text-2xl font-light">
        {t("review.sessionUnavailable")}
      </h2>
      <p className="mt-3 text-sm text-muted">
        {t("review.sessionUnavailableDescription")}
      </p>
      <Link
        href={`/languages/${profileId}/review`}
        className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
      >
        {t("review.back")}
      </Link>
    </div>
  );
}

export default async function ReviewSessionPage({
  params,
}: {
  params: Promise<{ profileId: string; sessionId: string }>;
}) {
  const { profileId, sessionId } = await params;
  const { locale } = await getI18n();
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const session = await loadReviewSession(supabase, userId, profileId, sessionId);
  if (!session || session.session_kind !== "scheduled_review") {
    return <SessionUnavailable profileId={profileId} />;
  }

  // A finished session shows its recorded summary (real data, immutable).
  if (session.status !== "active") {
    const attempts = await loadSessionAttempts(supabase, userId, sessionId);
    return (
      <ReviewSummary
        summary={summarizeAttempts(attempts)}
        durationMs={session.duration_ms}
        profileId={profileId}
      />
    );
  }

  // Active session: re-derive the due queue (authoritative due dates make this
  // safe to resume after a refresh) and seed the summary with prior attempts.
  const [cards, priorAttempts] = await Promise.all([
    loadDueReviewCards(supabase, userId, profileId),
    loadSessionAttempts(supabase, userId, sessionId),
  ]);

  return (
    <ReviewSessionClient
      profileId={profileId}
      sessionId={sessionId}
      languageName={getLanguageDisplayName(profile.language_code, locale)}
      cards={cards}
      priorAttempts={priorAttempts}
      startedAtMs={new Date(session.started_at).getTime()}
    />
  );
}
