"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  completeReviewSession,
  recordReview,
} from "@/app/languages/[profileId]/review/actions";
import { useToast } from "@/components/notes/Toast";
import type { DueReviewCard } from "@/lib/languages/srs/review-server";
import {
  answerCurrent,
  createQueue,
  currentItemId,
  isComplete,
  position,
  type ReviewQueue,
} from "@/lib/languages/srs/queue";
import { summarizeAttempts, type ReviewAttempt } from "@/lib/languages/srs/summary";
import { RATING_LABELS, type ReviewRating } from "@/lib/languages/srs/types";
import { ReviewSummary } from "./ReviewSummary";

const GRADES: { rating: ReviewRating; key: string }[] = [
  { rating: 1, key: "1" },
  { rating: 2, key: "2" },
  { rating: 3, key: "3" },
  { rating: 4, key: "4" },
];

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
  const toast = useToast();
  const [cardsById] = useState(
    () => new Map(cards.map((card) => [card.vocabularyItemId, card])),
  );
  const [queue, setQueue] = useState<ReviewQueue>(() =>
    createQueue(cards.map((card) => card.vocabularyItemId)),
  );
  const [attempts, setAttempts] = useState<ReviewAttempt[]>(priorAttempts);
  const [showBack, setShowBack] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [shownAt, setShownAt] = useState(() => Date.now());
  // Captured once the queue empties (in an event / on mount) so the summary can
  // show a duration without calling an impure clock during render.
  const [endedAtMs, setEndedAt] = useState<number | null>(() =>
    cards.length === 0 ? Date.now() : null,
  );

  const complete = isComplete(queue);
  const currentId = currentItemId(queue);
  const card = currentId ? cardsById.get(currentId) ?? null : null;

  const reveal = useCallback(() => {
    setShowBack((shown) => (shown ? shown : true));
  }, []);

  const grade = useCallback(
    async (rating: ReviewRating) => {
      const itemId = currentItemId(queue);
      if (!itemId || !showBack || pending) return;

      setPending(true);
      setError("");
      const responseTimeMs = Math.max(0, Date.now() - shownAt);
      const result = await recordReview(
        profileId,
        sessionId,
        itemId,
        rating,
        responseTimeMs,
      );

      if (result.ok) {
        const next = answerCurrent(queue, rating);
        setAttempts((prev) => [...prev, { itemId, rating }]);
        setQueue(next);
        setShowBack(false);
        setShownAt(Date.now());
        if (isComplete(next)) setEndedAt(Date.now());
      } else if (result.code === "stale") {
        // Another tab advanced this card. Keep it on screen and let the learner
        // grade again; the next attempt reads the fresh state on the server.
        toast.error("This card changed elsewhere. Please grade it again.");
        setError("This card changed elsewhere. Please grade it again.");
      } else if (result.code === "unavailable") {
        // The card vanished (e.g. archived elsewhere). Skip it without recording.
        const next = answerCurrent(queue, 3);
        toast.error(result.message);
        setQueue(next);
        setShowBack(false);
        setShownAt(Date.now());
        if (isComplete(next)) setEndedAt(Date.now());
      } else {
        // Persistence failed: never advance. Keep the card and allow a retry.
        toast.error(result.message);
        setError(result.message);
      }
      setPending(false);
    },
    [queue, showBack, pending, shownAt, profileId, sessionId, toast],
  );

  // Keyboard controls: Space reveals, 1–4 grade (only once revealed).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (complete) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        reveal();
        return;
      }
      if (showBack && GRADES.some((g) => g.key === event.key)) {
        event.preventDefault();
        void grade(Number(event.key) as ReviewRating);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [complete, showBack, reveal, grade]);

  // Persist completion once the queue empties. completeReviewSession is
  // idempotent (only affects an active session), so a double-invoke is safe.
  useEffect(() => {
    if (!complete) return;
    void completeReviewSession(profileId, sessionId, Date.now() - startedAtMs);
  }, [complete, profileId, sessionId, startedAtMs]);

  if (complete) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-background px-6">
        <div className="mx-auto w-full max-w-2xl">
          <ReviewSummary
            summary={summarizeAttempts(attempts)}
            durationMs={endedAtMs != null ? endedAtMs - startedAtMs : null}
            profileId={profileId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 text-sm sm:px-10">
        <Link
          href={`/languages/${profileId}`}
          className="text-muted transition-colors hover:text-foreground"
        >
          ← {languageName}
        </Link>
        <span className="tabular-nums text-muted">
          {position(queue)} / {queue.entries.length}
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-xl text-center">
          <p className="text-4xl font-light tracking-tight sm:text-5xl">
            {card?.term}
          </p>

          {!showBack ? (
            <div className="mt-16">
              <button
                type="button"
                onClick={reveal}
                className="rounded-full border border-border-strong px-6 py-2.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Show answer
              </button>
              <p className="mt-4 text-xs tracking-[0.2em] text-muted">SPACE</p>
            </div>
          ) : (
            <div className="mt-10 space-y-6">
              <p className="text-2xl font-light text-foreground">
                {card?.translation}
              </p>
              {card?.definition && (
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-strong">
                  {card.definition}
                </p>
              )}
              {(card?.exampleSentence || card?.exampleTranslation) && (
                <div className="mx-auto max-w-md border-t border-border pt-6 text-sm leading-relaxed">
                  {card?.exampleSentence && (
                    <p className="text-foreground">{card.exampleSentence}</p>
                  )}
                  {card?.exampleTranslation && (
                    <p className="mt-1 text-muted">{card.exampleTranslation}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showBack && (
        <div className="absolute inset-x-0 bottom-0 border-t border-border bg-background/80 px-6 py-5 backdrop-blur-sm sm:px-10">
          {error && (
            <p
              role="alert"
              className="mx-auto mb-3 max-w-xl text-center text-sm text-danger"
            >
              {error}
            </p>
          )}
          <div className="mx-auto grid max-w-xl grid-cols-4 gap-2 sm:gap-3">
            {GRADES.map(({ rating, key }) => (
              <button
                key={rating}
                type="button"
                disabled={pending}
                onClick={() => void grade(rating)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-3 py-3 text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <span>{RATING_LABELS[rating]}</span>
                <span className="text-xs tabular-nums text-muted">{key}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
