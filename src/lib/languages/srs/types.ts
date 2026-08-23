/**
 * Domain types for Luce's spaced-repetition system.
 *
 * These types are intentionally free of any `ts-fsrs` types so the rest of the
 * app (server actions, components) never depends on the library directly. The
 * only place that imports `ts-fsrs` is `scheduler.ts`, which translates to and
 * from `SrsCard`.
 */

/** Grades a learner can give an answer. Matches the DB `review_events.rating`. */
export type ReviewRating = 1 | 2 | 3 | 4;

export const REVIEW_RATINGS = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
} as const satisfies Record<string, ReviewRating>;

export const RATING_LABELS: Record<ReviewRating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

/** FSRS card lifecycle. Matches the DB `vocabulary_srs_states.state`. */
export type SrsCardState = 0 | 1 | 2 | 3; // New, Learning, Review, Relearning

/**
 * The scheduler state for a single card. Mirrors the FSRS-relevant columns of
 * `vocabulary_srs_states`; dates are ISO strings (as PostgREST returns them and
 * as the `record_review` RPC expects them). This object is exactly the JSON
 * payload sent to the RPC as `p_resulting_state`.
 */
export interface SrsCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: SrsCardState;
  last_review: string | null;
}

/** A full `vocabulary_srs_states` row as read from the database. */
export interface SrsStateRow extends SrsCard {
  id: string;
  user_id: string;
  language_profile_id: string;
  vocabulary_item_id: string;
  scheduler: string;
  scheduler_version: number;
  row_version: number;
  created_at: string;
  updated_at: string;
}

export const SRS_STATE_COLUMNS =
  "id, user_id, language_profile_id, vocabulary_item_id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review, scheduler, scheduler_version, row_version, created_at, updated_at";

/** Extract just the scheduler card fields from a full state row. */
export function pickSrsCard(row: SrsStateRow): SrsCard {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review,
  };
}
