"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useToast } from "@/components/notes/Toast";
import {
  answerCurrent,
  createQueue,
  currentItemId,
  isComplete,
  position,
  type ReviewQueue,
} from "@/lib/languages/srs/queue";
import {
  summarizeAttempts,
  type ReviewAttempt,
} from "@/lib/languages/srs/summary";
import { RATING_LABELS, type ReviewRating } from "@/lib/languages/srs/types";

/**
 * A card as shown by the focused session runner, with front/back already
 * resolved for the relevant direction. Review always shows term → translation;
 * Practice may swap the two (reverse) and set a per-card eyebrow.
 */
export interface RunnerCard {
  itemId: string;
  front: string;
  backPrimary: string;
  backSecondary?: string | null;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  /** Small overline above the term, e.g. "PRACTICE · RECALL". */
  eyebrow?: string | null;
}

/** Result of persisting one grade. Mirrors the review/practice action returns. */
export type GradeOutcome =
  | { ok: true }
  | { ok: false; code: "stale" | "unavailable" | "error"; message?: string };

const GRADES: { rating: ReviewRating; key: string }[] = [
  { rating: 1, key: "1" },
  { rating: 2, key: "2" },
  { rating: 3, key: "3" },
  { rating: 4, key: "4" },
];

/**
 * Shared focused session engine used by both scheduled Review and Practice.
 *
 * It owns the bounded queue, Space-to-reveal, 1–4 grading, keyboard handling,
 * timing, failure/stale handling and the completion hand-off. It is deliberately
 * ignorant of scheduling: persistence is delegated to `onGrade`, so Review can
 * update FSRS while Practice never does.
 */
export function SessionRunner({
  profileId,
  languageName,
  cards,
  priorAttempts,
  startedAtMs,
  onGrade,
  onComplete,
  renderSummary,
}: {
  profileId: string;
  languageName: string;
  cards: RunnerCard[];
  priorAttempts: ReviewAttempt[];
  startedAtMs: number;
  onGrade: (
    itemId: string,
    rating: ReviewRating,
    responseTimeMs: number,
  ) => Promise<GradeOutcome>;
  onComplete: (durationMs: number) => void;
  renderSummary: (
    summary: ReturnType<typeof summarizeAttempts>,
    durationMs: number | null,
  ) => ReactNode;
}) {
  const toast = useToast();
  const [cardsById] = useState(
    () => new Map(cards.map((card) => [card.itemId, card])),
  );
  const [queue, setQueue] = useState<ReviewQueue>(() =>
    createQueue(cards.map((card) => card.itemId)),
  );
  const [attempts, setAttempts] = useState<ReviewAttempt[]>(priorAttempts);
  const [showBack, setShowBack] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [shownAt, setShownAt] = useState(() => Date.now());
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
      const result = await onGrade(itemId, rating, responseTimeMs);

      if (result.ok) {
        const next = answerCurrent(queue, rating);
        setAttempts((prev) => [...prev, { itemId, rating }]);
        setQueue(next);
        setShowBack(false);
        setShownAt(Date.now());
        if (isComplete(next)) setEndedAt(Date.now());
      } else if (result.code === "stale") {
        // Persisted elsewhere first. Keep the card; the next attempt re-reads.
        toast.error("This card changed elsewhere. Please grade it again.");
        setError("This card changed elsewhere. Please grade it again.");
      } else if (result.code === "unavailable") {
        // The card vanished (e.g. archived elsewhere). Skip without recording.
        const next = answerCurrent(queue, 3);
        toast.error(result.message ?? "This card is no longer available.");
        setQueue(next);
        setShowBack(false);
        setShownAt(Date.now());
        if (isComplete(next)) setEndedAt(Date.now());
      } else {
        // Persistence failed: never advance. Keep the card and allow a retry.
        const message = result.message ?? "This answer could not be saved.";
        toast.error(message);
        setError(message);
      }
      setPending(false);
    },
    [queue, showBack, pending, shownAt, onGrade, toast],
  );

  // Keyboard: Space reveals, 1–4 grade (only once revealed).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (complete) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
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

  // Persist completion once the queue empties. onComplete must be idempotent.
  useEffect(() => {
    if (!complete) return;
    onComplete(Date.now() - startedAtMs);
  }, [complete, onComplete, startedAtMs]);

  if (complete) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-background px-6">
        <div className="mx-auto w-full max-w-2xl">
          {renderSummary(
            summarizeAttempts(attempts),
            endedAtMs != null ? endedAtMs - startedAtMs : null,
          )}
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
          {card?.eyebrow && (
            <p className="mb-6 text-xs tracking-[0.3em] text-muted">
              {card.eyebrow}
            </p>
          )}
          <p className="text-4xl font-light tracking-tight sm:text-5xl">
            {card?.front}
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
                {card?.backPrimary}
              </p>
              {card?.backSecondary && (
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-strong">
                  {card.backSecondary}
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
