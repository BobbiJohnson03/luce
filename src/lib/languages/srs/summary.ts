/**
 * Session summary metrics, computed from the list of attempts made during a
 * session. Every attempt corresponds to one persisted `review_events` row, so
 * these numbers reflect real data.
 *
 * The important distinction (and the fix for the old prototype's >100% bug):
 * `cards` counts distinct vocabulary items, while `attempts` counts every
 * grade including "Again" requeues. Accuracy is measured over distinct cards'
 * first-pass results, so it can never exceed 100%.
 */
import type { ReviewRating } from "./types";

export interface ReviewAttempt {
  itemId: string;
  rating: ReviewRating;
}

export interface SessionSummary {
  /** Distinct vocabulary items seen. */
  cards: number;
  /** Total grades given (includes same-session "Again" repeats). */
  attempts: number;
  /** Distinct cards whose first attempt was not "Again". */
  firstPassRemembered: number;
  /** Number of "Again" grades across the whole session. */
  again: number;
  /** firstPassRemembered / cards as a whole percentage (0–100). */
  accuracy: number;
}

export function summarizeAttempts(attempts: ReviewAttempt[]): SessionSummary {
  const firstRatingByItem = new Map<string, ReviewRating>();
  let again = 0;

  for (const attempt of attempts) {
    if (attempt.rating === 1) again += 1;
    if (!firstRatingByItem.has(attempt.itemId)) {
      firstRatingByItem.set(attempt.itemId, attempt.rating);
    }
  }

  const cards = firstRatingByItem.size;
  let firstPassRemembered = 0;
  for (const rating of firstRatingByItem.values()) {
    if (rating !== 1) firstPassRemembered += 1;
  }

  const accuracy =
    cards === 0 ? 0 : Math.round((firstPassRemembered / cards) * 100);

  return {
    cards,
    attempts: attempts.length,
    firstPassRemembered,
    again,
    accuracy,
  };
}
