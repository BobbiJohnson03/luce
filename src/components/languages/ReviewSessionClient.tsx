"use client";

import { useCallback } from "react";
import {
  completeReviewSession,
  recordReview,
} from "@/app/languages/[profileId]/review/actions";
import type { DueReviewCard } from "@/lib/languages/srs/review-server";
import type { ReviewAttempt } from "@/lib/languages/srs/summary";
import type { ReviewRating } from "@/lib/languages/srs/types";
import { SessionRunner, type RunnerCard } from "./SessionRunner";
import { ReviewSummary } from "./ReviewSummary";

/**
 * Scheduled Review, built on the shared SessionRunner. Reviews update FSRS state
 * (affected_schedule = true), which is handled entirely by the recordReview
 * server action; this component only maps due cards to the runner's shape.
 */
export function ReviewSessionClient({
  profileId,
  sessionId,
  languageName,
  cards,
  priorAttempts,
  startedAtMs,
}: {
  profileId: string;
  sessionId: string;
  languageName: string;
  cards: DueReviewCard[];
  priorAttempts: ReviewAttempt[];
  startedAtMs: number;
}) {
  const runnerCards: RunnerCard[] = cards.map((card) => ({
    itemId: card.vocabularyItemId,
    front: card.term,
    backPrimary: card.translation,
    backSecondary: card.definition,
    exampleSentence: card.exampleSentence,
    exampleTranslation: card.exampleTranslation,
  }));

  const onGrade = useCallback(
    async (itemId: string, rating: ReviewRating, responseTimeMs: number) => {
      const result = await recordReview(
        profileId,
        sessionId,
        itemId,
        rating,
        responseTimeMs,
      );
      if (result.ok) return { ok: true as const };
      if (result.code === "stale") return { ok: false as const, code: "stale" as const };
      return { ok: false as const, code: result.code, message: result.message };
    },
    [profileId, sessionId],
  );

  const onComplete = useCallback(
    (durationMs: number) => {
      void completeReviewSession(profileId, sessionId, durationMs);
    },
    [profileId, sessionId],
  );

  return (
    <SessionRunner
      profileId={profileId}
      languageName={languageName}
      cards={runnerCards}
      priorAttempts={priorAttempts}
      startedAtMs={startedAtMs}
      onGrade={onGrade}
      onComplete={onComplete}
      renderSummary={(summary, durationMs) => (
        <ReviewSummary
          summary={summary}
          durationMs={durationMs}
          profileId={profileId}
        />
      )}
    />
  );
}
