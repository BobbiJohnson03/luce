"use client";

import { useCallback, useState } from "react";
import {
  completePracticeSession,
  recordPracticeAttempt,
} from "@/app/languages/[profileId]/practice/actions";
import type { PracticeDirection } from "@/lib/languages/srs/practice";
import type { ReviewAttempt } from "@/lib/languages/srs/summary";
import type { ReviewRating } from "@/lib/languages/srs/types";
import { SessionRunner, type RunnerCard } from "./SessionRunner";
import { PracticeSummary } from "./PracticeSummary";

export type PracticeRunnerCard = RunnerCard & { direction: PracticeDirection };

/**
 * Practice, built on the shared SessionRunner. Cards may be shown in either
 * direction (recall/reverse). Grading goes through recordPracticeAttempt, which
 * always persists with affected_schedule = false — practice never changes FSRS.
 */
export function PracticeSessionClient({
  profileId,
  sessionId,
  languageName,
  cards,
  priorAttempts,
  startedAtMs,
  modeLabel,
  scopeLabel,
}: {
  profileId: string;
  sessionId: string;
  languageName: string;
  cards: PracticeRunnerCard[];
  priorAttempts: ReviewAttempt[];
  startedAtMs: number;
  modeLabel: string;
  scopeLabel: string;
}) {
  const [directionById] = useState(
    () => new Map(cards.map((card) => [card.itemId, card.direction])),
  );

  const onGrade = useCallback(
    async (itemId: string, rating: ReviewRating, responseTimeMs: number) => {
      const direction = directionById.get(itemId) ?? "recall";
      const result = await recordPracticeAttempt(
        profileId,
        sessionId,
        itemId,
        rating,
        direction,
        responseTimeMs,
      );
      if (result.ok) return { ok: true as const };
      if (result.code === "stale") return { ok: false as const, code: "stale" as const };
      return { ok: false as const, code: result.code, message: result.message };
    },
    [profileId, sessionId, directionById],
  );

  const onComplete = useCallback(
    (durationMs: number) => {
      void completePracticeSession(profileId, sessionId, durationMs);
    },
    [profileId, sessionId],
  );

  return (
    <SessionRunner
      profileId={profileId}
      languageName={languageName}
      cards={cards}
      priorAttempts={priorAttempts}
      startedAtMs={startedAtMs}
      onGrade={onGrade}
      onComplete={onComplete}
      renderSummary={(summary, durationMs) => (
        <PracticeSummary
          summary={summary}
          durationMs={durationMs}
          profileId={profileId}
          modeLabel={modeLabel}
          scopeLabel={scopeLabel}
        />
      )}
    />
  );
}
