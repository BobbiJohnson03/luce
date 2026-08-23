/**
 * The one and only place that touches `ts-fsrs`.
 *
 * FSRS (Free Spaced Repetition Scheduler) is provided by the maintained
 * `ts-fsrs` package (v5). We keep it isolated behind these functions so the
 * database/domain API (`SrsCard`) stays stable and the implementation could be
 * swapped later without rippling library types through the codebase.
 *
 * Fuzz is disabled so transitions are fully deterministic (important for the
 * unit tests and for reproducible scheduling). Every function takes `now`
 * explicitly rather than reading the clock, so callers — and tests — stay in
 * control of time.
 */
import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";
import type { ReviewRating, SrsCard, SrsCardState } from "./types";

/** Identifies the scheduler implementation persisted alongside review state. */
export const SCHEDULER_NAME = "fsrs";
export const SCHEDULER_VERSION = 1;

const scheduler = fsrs({ enable_fuzz: false });

function toFsrsCard(card: SrsCard): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

function fromFsrsCard(card: Card): SrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as SrsCardState,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

function toFsrsGrade(rating: ReviewRating): Grade {
  switch (rating) {
    case 1:
      return Rating.Again;
    case 2:
      return Rating.Hard;
    case 3:
      return Rating.Good;
    case 4:
      return Rating.Easy;
  }
}

/** A fresh, never-reviewed card whose `due` is `now` (immediately reviewable). */
export function emptyCard(now: Date): SrsCard {
  return fromFsrsCard(createEmptyCard(now));
}

/**
 * Compute the next scheduler state for `card` given a `rating` at time `now`.
 * Pure with respect to its inputs (fuzz disabled) — the same inputs always
 * produce the same output.
 */
export function applyReview(
  card: SrsCard,
  rating: ReviewRating,
  now: Date,
): SrsCard {
  const result = scheduler.next(toFsrsCard(card), now, toFsrsGrade(rating));
  return fromFsrsCard(result.card);
}
